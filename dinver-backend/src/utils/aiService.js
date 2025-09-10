const { Op, Sequelize } = require('sequelize');
const crypto = require('crypto');
const {
  Restaurant,
  MenuItem,
  MenuItemTranslation,
  DrinkItem,
  DrinkItemTranslation,
  EstablishmentPerk,
  FoodType,
  MealType,
  DietaryType,
  EstablishmentType,
  PriceCategory,
} = require('../../models');
const { calculateDistance } = require('../../utils/distance');
const { getMediaUrl } = require('../../config/cdn');
const OpenAIClient = require('../services/openaiClient');
const tools = require('./ai/tools');
const { z } = require('zod');
const { isOpenAt } = require('../utils/openingHours');
const threadStore = require('./ai/threadContext');
const { parseConfirmation, applyConfirmation } = require('./ai/confirmations');

const MAX_RADIUS = Number(process.env.AI_MAX_RADIUS_KM || 10);
const DEFAULT_RADIUS = Number(process.env.AI_DEFAULT_RADIUS_KM || 1.5);

function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function isExactWordMatch(termRaw, textRaw) {
  const term = normalizeText(termRaw);
  const text = normalizeText(textRaw);
  if (!term || !text) return false;
  const wordBoundary = new RegExp(
    `\\b${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`,
    'i',
  );
  return wordBoundary.test(text);
}

function computeTokenSimilarity(term, token) {
  if (!term || !token) return 0;
  if (term === token) return 1.0;
  if (token.startsWith(term)) return 0.92;
  if (token.includes(term)) return 0.75;
  return 0;
}

function isLevenshteinAtMostOne(a, b) {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (edits === 1) return false;
    edits++;
    if (la > lb) {
      i++;
    } else if (lb > la) {
      j++;
    } else {
      i++;
      j++;
    }
  }
  if (i < la || j < lb) edits++;
  return edits <= 1;
}

function computeSimilarity(termRaw, textRaw) {
  const term = normalizeText(termRaw);
  const text = normalizeText(textRaw);
  if (!term || !text) return 0;
  const tokens = text.split(/[^a-z0-9]+/g).filter(Boolean);
  let best = 0;
  for (const token of tokens) {
    let sim = computeTokenSimilarity(term, token);
    if (sim < 0.92 && term.length >= 5 && token.length >= term.length) {
      const tokenPrefix = token.slice(0, term.length);
      if (isLevenshteinAtMostOne(term, tokenPrefix)) {
        sim = Math.max(sim, 0.85);
      }
    }
    best = Math.max(best, sim);
    if (best === 1) break;
  }
  if (best < 1 && isExactWordMatch(termRaw, textRaw)) {
    best = Math.max(best, 0.95);
  }
  return best;
}

const hrToEnSynonyms = [
  ['stolica za djecu', 'high chair'],
  ['dječja stolica', 'high chair'],
  ['terasa', 'terrace'],
  ['bez glutena', 'gluten free'],
  ['vegansko', 'vegan'],
  ['vegetarijansko', 'vegetarian'],
  ['zeleni rezanci', 'spinach tagliatelle'],
  ['njoki', 'gnocchi'],
  ['lignje', 'squid'],
  ['ćevapi', 'cevapi'],
  ['ćevap', 'cevap'],
];

function formatHHmm(s) {
  if (!s) return null;
  const t = String(s).padStart(4, '0');
  const hh = t.slice(0, 2);
  const mm = t.slice(2, 4);
  return `${hh}:${mm}`;
}

function getDayRelationLabel(atISO, timeZone = 'Europe/Zagreb') {
  try {
    const fmtDate = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const fmtWeekday = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });
    const now = new Date();
    const at = atISO ? new Date(atISO) : now;
    const dateStrNow = fmtDate.format(now);
    const dateStrAt = fmtDate.format(at);
    if (dateStrAt === dateStrNow) return { when: 'today', label: 'danas' };
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (fmtDate.format(tomorrow) === dateStrAt)
      return { when: 'tomorrow', label: 'sutra' };
    const wd = fmtWeekday.format(at); // Mon..Sun
    const map = {
      Sun: 'u nedjelju',
      Mon: 'u ponedjeljak',
      Tue: 'u utorak',
      Wed: 'u srijedu',
      Thu: 'u četvrtak',
      Fri: 'u petak',
      Sat: 'u subotu',
    };
    return { when: 'other', label: map[wd] || '' };
  } catch (_) {
    return { when: 'today', label: 'danas' };
  }
}

function expandSynonyms(term) {
  const out = new Set([term]);
  const t = normalizeText(term);
  for (const [hr, en] of hrToEnSynonyms) {
    if (t.includes(normalizeText(hr))) out.add(en);
    if (t.includes(normalizeText(en))) out.add(hr);
  }
  return Array.from(out);
}

async function findPerkIdsByNameLike(perkName) {
  const like = { [Op.iLike]: `%${perkName}%` };
  const perks = await EstablishmentPerk.findAll({
    where: { [Op.or]: [{ nameHr: like }, { nameEn: like }] },
  });
  return perks.map((p) => p.id);
}

async function findPerkIdsByNames(perkNames = []) {
  if (!Array.isArray(perkNames) || perkNames.length === 0) return [];
  const orConds = [];
  for (const name of perkNames) {
    const like = { [Op.iLike]: `%${name}%` };
    orConds.push({ nameHr: like });
    orConds.push({ nameEn: like });
  }
  const rows = await EstablishmentPerk.findAll({ where: { [Op.or]: orConds } });
  return rows.map((r) => r.id);
}

async function findIdsByNames(
  model,
  names = [],
  hrField = 'nameHr',
  enField = 'nameEn',
) {
  if (!Array.isArray(names) || names.length === 0) return [];
  const orConds = [];
  for (const name of names) {
    const like = { [Op.iLike]: `%${name}%` };
    orConds.push({ [hrField]: like });
    orConds.push({ [enField]: like });
  }
  const rows = await model.findAll({ where: { [Op.or]: orConds } });
  return rows.map((r) => r.id);
}

async function findRestaurantByNameCity({ name, city }) {
  const where = {
    [Op.and]: [
      name ? { name: { [Op.iLike]: `%${name}%` } } : {},
      city
        ? {
            [Op.or]: [
              { place: { [Op.iLike]: `%${city}%` } },
              { address: { [Op.iLike]: `%${city}%` } },
            ],
          }
        : {},
    ],
  };
  const r = await Restaurant.findOne({
    where,
    attributes: [
      'id',
      'name',
      'description',
      'place',
      'address',
      'latitude',
      'longitude',
      'thumbnailUrl',
      'isClaimed',
      'slug',
      'openingHours',
      'reservationEnabled',
      'phone',
      'email',
      'websiteUrl',
      'fbUrl',
      'igUrl',
      'ttUrl',
      'establishmentTypes',
      'mealTypes',
      'foodTypes',
      'dietaryTypes',
      'establishmentPerks',
      'virtualTourUrl',
    ],
    include: [
      {
        model: PriceCategory,
        attributes: ['id', 'nameEn', 'nameHr', 'icon'],
        as: 'priceCategory',
        required: false,
      },
    ],
  });
  if (!r) return null;
  return decorateRestaurant(r);
}

function decorateRestaurant(r) {
  const json = typeof r.toJSON === 'function' ? r.toJSON() : r;
  return {
    id: json.id,
    name: json.name,
    description: json.description || null,
    place: json.place,
    address: json.address,
    latitude: json.latitude,
    longitude: json.longitude,
    slug: json.slug,
    thumbnailUrl: json.thumbnailUrl
      ? getMediaUrl(json.thumbnailUrl, 'image')
      : null,
    isClaimed: json.isClaimed,
    priceCategory: json.priceCategory || null,
    openingHours: json.openingHours || null,
    reservationEnabled: !!json.reservationEnabled,
    phone: json.phone || null,
    email: json.email || null,
    websiteUrl: json.websiteUrl || null,
    fbUrl: json.fbUrl || null,
    igUrl: json.igUrl || null,
    ttUrl: json.ttUrl || null,
    establishmentTypes: json.establishmentTypes || [],
    mealTypes: json.mealTypes || [],
    foodTypes: json.foodTypes || [],
    dietaryTypes: json.dietaryTypes || [],
    establishmentPerks: json.establishmentPerks || [],
    virtualTourUrl: json.virtualTourUrl || null,
  };
}

async function checkItemInRestaurant({
  restaurantId,
  restaurantName,
  city,
  itemName,
}) {
  let restaurant = null;
  if (restaurantId) {
    restaurant = await Restaurant.findByPk(restaurantId);
  } else {
    restaurant = await Restaurant.findOne({
      where: {
        [Op.and]: [
          restaurantName ? { name: { [Op.iLike]: `%${restaurantName}%` } } : {},
          city
            ? {
                [Op.or]: [
                  { place: { [Op.iLike]: `%${city}%` } },
                  { address: { [Op.iLike]: `%${city}%` } },
                ],
              }
            : {},
        ],
      },
    });
  }
  if (!restaurant)
    return {
      found: false,
      code: 'RESTAURANT_NOT_FOUND',
      reason: 'restaurant_not_found',
    };

  // Enforce partner check before hitting menu translations
  if (!restaurant.isClaimed) {
    return {
      found: false,
      code: 'NOT_PARTNER',
      reason: 'restaurant_not_partner',
      restaurant: decorateRestaurant(restaurant),
    };
  }

  const terms = expandSynonyms(itemName || '');
  const orConds = terms.map((t) =>
    Sequelize.where(Sequelize.fn('lower', Sequelize.col('name')), {
      [Op.like]: `%${String(t).toLowerCase()}%`,
    }),
  );
  const items = await MenuItemTranslation.findAll({
    where: { [Op.or]: orConds },
    include: [
      {
        model: MenuItem,
        as: 'menuItem',
        required: true,
        where: { restaurantId: restaurant.id, isActive: true },
        attributes: ['id', 'restaurantId', 'price', 'imageUrl'],
      },
    ],
    limit: 10,
  });

  const mapped = items.map((tr) => ({
    menuItemId: tr.menuItemId,
    name: tr.name,
    description: tr.description,
    language: tr.language,
  }));

  return {
    found: mapped.length > 0,
    restaurant: decorateRestaurant(restaurant),
    items: mapped,
  };
}

// ---- Geo helpers ----
function clampRadius(radiusKm) {
  const r = parseFloat(radiusKm);
  if (!isFinite(r)) return DEFAULT_RADIUS;
  return Math.min(Math.max(r, 0.2), MAX_RADIUS);
}

function computeBBox(lat, lon, radiusKm) {
  // Rough bbox using 1 deg lat ~ 111km, 1 deg lon ~ 111km*cos(lat)
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((Math.PI * lat) / 180) || 0.0001);
  return {
    latMin: lat - latDelta,
    latMax: lat + latDelta,
    lonMin: lon - lonDelta,
    lonMax: lon + lonDelta,
  };
}

// ---- Stable stringify and cursor helpers ----
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  const keys = Object.keys(value).sort();
  const parts = [];
  for (const k of keys)
    parts.push(`${JSON.stringify(k)}:${stableStringify(value[k])}`);
  return `{${parts.join(',')}}`;
}

function hashParams(intent, params) {
  const h = crypto.createHash('sha1');
  h.update(String(intent || ''));
  h.update('|');
  h.update(stableStringify(params || {}));
  return h.digest('hex');
}

function encodeCursor({ offset, limit, hash }) {
  const payload = {
    o: Math.max(0, parseInt(offset) || 0),
    l: Math.max(1, parseInt(limit) || 20),
    h: String(hash || ''),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(cursor, expectedHash) {
  try {
    const raw = Buffer.from(String(cursor || ''), 'base64url').toString('utf8');
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return { offset: 0 };
    if (obj.h !== expectedHash) return { offset: 0 };
    const off = Math.max(0, parseInt(obj.o) || 0);
    const lim = Math.max(1, parseInt(obj.l) || 20);
    return { offset: off, limit: lim };
  } catch (_) {
    return { offset: 0 };
  }
}

function paginateWithHash({ list, limit, cursor, paramsHash }) {
  const total = Array.isArray(list) ? list.length : 0;
  const l = Math.min(Math.max(parseInt(limit) || 20, 1), 50);
  const { offset: offFromCursor } = decodeCursor(cursor, paramsHash);
  const off = Math.min(Math.max(offFromCursor || 0, 0), Math.max(total - 1, 0));
  const page = list.slice(off, off + l);
  const hasNext = off + page.length < total;
  const hasPrev = off > 0;
  const nextCursor = hasNext
    ? encodeCursor({ offset: off + page.length, limit: l, hash: paramsHash })
    : null;
  const prevCursor = hasPrev
    ? encodeCursor({ offset: Math.max(0, off - l), limit: l, hash: paramsHash })
    : null;
  const pageInfo = { offset: off, limit: l, total, hasNext, hasPrev };
  return { page, nextCursor, prevCursor, pageInfo };
}

async function findRestaurantsByItemAndPerkNear({
  latitude,
  longitude,
  radiusKm = 5,
  itemName,
  perkName,
  limit = 50,
}) {
  const perkIds = perkName ? await findPerkIdsByNameLike(perkName) : [];
  const itemTerms = expandSynonyms(itemName || '');
  const R = clampRadius(radiusKm);

  const menuItems = await MenuItemTranslation.findAll({
    where: {
      [Op.or]: itemTerms.map((t) =>
        Sequelize.where(Sequelize.fn('lower', Sequelize.col('name')), {
          [Op.like]: `%${String(t).toLowerCase()}%`,
        }),
      ),
    },
    include: [
      {
        model: MenuItem,
        as: 'menuItem',
        required: true,
        where: { isActive: true },
        attributes: ['id', 'restaurantId', 'price', 'imageUrl'],
      },
    ],
    limit: Math.min(parseInt(limit) || 50, 200),
  });

  const restaurantIds = Array.from(
    new Set(menuItems.map((tr) => tr.menuItem.restaurantId)),
  );

  const bbox = computeBBox(parseFloat(latitude), parseFloat(longitude), R);

  const where = {
    id: { [Op.in]: restaurantIds },
    isClaimed: true,
    latitude: { [Op.between]: [bbox.latMin, bbox.latMax] },
    longitude: { [Op.between]: [bbox.lonMin, bbox.lonMax] },
  };
  if (perkIds.length > 0) {
    where.establishmentPerks = { [Op.overlap]: perkIds };
  }

  const candidates = await Restaurant.findAll({
    where,
    attributes: [
      'id',
      'name',
      'place',
      'address',
      'latitude',
      'longitude',
      'thumbnailUrl',
      'isClaimed',
    ],
    limit: Math.min(parseInt(limit) || 50, 200),
  });

  const within = candidates
    .map((r) => {
      const d = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(r.latitude),
        parseFloat(r.longitude),
      );
      return { restaurant: decorateRestaurant(r), distance: d };
    })
    .filter((x) => isFinite(x.distance) && x.distance <= R)
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return (a.restaurant.id || 0) - (b.restaurant.id || 0);
    });

  return within;
}

async function findRestaurantsByPerkNear({
  latitude,
  longitude,
  radiusKm = 5,
  perkName,
  limit = 50,
}) {
  const perkIds = await findPerkIdsByNameLike(perkName || '');
  const R = clampRadius(radiusKm);
  const bbox = computeBBox(parseFloat(latitude), parseFloat(longitude), R);
  const where = {
    isClaimed: true,
    latitude: { [Op.between]: [bbox.latMin, bbox.latMax] },
    longitude: { [Op.between]: [bbox.lonMin, bbox.lonMax] },
  };
  if (perkIds.length > 0) {
    where.establishmentPerks = { [Op.overlap]: perkIds };
  }
  const candidates = await Restaurant.findAll({
    where,
    attributes: [
      'id',
      'name',
      'place',
      'address',
      'latitude',
      'longitude',
      'thumbnailUrl',
      'isClaimed',
    ],
    limit: Math.min(parseInt(limit) || 50, 200),
  });
  const within = candidates
    .map((r) => {
      const d = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(r.latitude),
        parseFloat(r.longitude),
      );
      return { restaurant: decorateRestaurant(r), distance: d };
    })
    .filter((x) => isFinite(x.distance) && x.distance <= R)
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return (a.restaurant.id || 0) - (b.restaurant.id || 0);
    });
  return within;
}

async function findMenuItemsByNameNear({
  latitude,
  longitude,
  radiusKm = 5,
  itemName,
  limit = 100,
}) {
  const itemTerms = expandSynonyms(itemName || '');
  const R = clampRadius(radiusKm);
  const menuItems = await MenuItemTranslation.findAll({
    where: {
      [Op.or]: itemTerms.map((t) =>
        Sequelize.where(Sequelize.fn('lower', Sequelize.col('name')), {
          [Op.like]: `%${String(t).toLowerCase()}%`,
        }),
      ),
    },
    include: [
      {
        model: MenuItem,
        as: 'menuItem',
        required: true,
        where: { isActive: true },
        attributes: ['id', 'restaurantId', 'price', 'imageUrl'],
      },
    ],
    limit: Math.min(parseInt(limit) || 100, 300),
  });

  const drinkItems = await DrinkItemTranslation.findAll({
    where: {
      [Op.or]: itemTerms.map((t) =>
        Sequelize.where(Sequelize.fn('lower', Sequelize.col('name')), {
          [Op.like]: `%${String(t).toLowerCase()}%`,
        }),
      ),
    },
    include: [
      {
        model: DrinkItem,
        as: 'drinkItem',
        required: true,
        where: { isActive: true },
        attributes: ['id', 'restaurantId', 'price', 'imageUrl'],
      },
    ],
    limit: Math.min(parseInt(limit) || 100, 300),
  });

  const byRestaurant = new Map();
  for (const tr of menuItems) {
    const rid = tr.menuItem.restaurantId;
    if (!byRestaurant.has(rid)) byRestaurant.set(rid, []);
    byRestaurant.get(rid).push({
      type: 'food',
      id: tr.menuItemId,
      name: tr.name,
      language: tr.language,
      price: tr.menuItem.price,
      imageUrl: tr.menuItem.imageUrl,
    });
  }
  for (const tr of drinkItems) {
    const rid = tr.drinkItem.restaurantId;
    if (!byRestaurant.has(rid)) byRestaurant.set(rid, []);
    byRestaurant.get(rid).push({
      type: 'drink',
      id: tr.drinkItemId,
      name: tr.name,
      language: tr.language,
      price: tr.drinkItem.price,
      imageUrl: tr.drinkItem.imageUrl,
    });
  }

  const bbox = computeBBox(parseFloat(latitude), parseFloat(longitude), R);
  const restaurants = await Restaurant.findAll({
    where: {
      id: { [Op.in]: Array.from(byRestaurant.keys()) },
      isClaimed: true,
      latitude: { [Op.between]: [bbox.latMin, bbox.latMax] },
      longitude: { [Op.between]: [bbox.lonMin, bbox.lonMax] },
    },
    attributes: [
      'id',
      'name',
      'place',
      'address',
      'latitude',
      'longitude',
      'thumbnailUrl',
      'isClaimed',
    ],
    limit: Math.min(parseInt(limit) || 50, 200),
  });

  const results = restaurants
    .map((r) => {
      const d = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(r.latitude),
        parseFloat(r.longitude),
      );
      return {
        restaurant: decorateRestaurant(r),
        distance: d,
        items: (byRestaurant.get(r.id) || []).map((it) => ({
          id: it.id,
          type: it.type,
          name: it.name,
          language: it.language,
          price:
            it.price != null ? Number(parseFloat(it.price).toFixed(2)) : null,
          imageUrl: it.imageUrl ? getMediaUrl(it.imageUrl, 'image') : null,
        })),
      };
    })
    .filter((x) => isFinite(x.distance) && x.distance <= R)
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return (a.restaurant.id || 0) - (b.restaurant.id || 0);
    });

  return results;
}

async function getRestaurantMenuStructured({
  restaurantId,
  menuType = 'all',
  limit = 300,
}) {
  const wantFood = menuType === 'all' || menuType === 'food';
  const wantDrink = menuType === 'all' || menuType === 'drink';
  const out = { food: [], drinks: [] };
  if (wantFood) {
    const menuItems = await MenuItem.findAll({
      where: { restaurantId, isActive: true },
      include: [
        { model: MenuItemTranslation, as: 'translations', required: false },
      ],
      limit: Math.min(parseInt(limit) || 300, 500),
    });
    out.food = menuItems.map((m) => ({
      id: m.id,
      price: m.price != null ? Number(parseFloat(m.price).toFixed(2)) : null,
      imageUrl: m.imageUrl ? getMediaUrl(m.imageUrl, 'image') : null,
      name: m.translations?.[0]?.name || null,
      description: m.translations?.[0]?.description || null,
      language: m.translations?.[0]?.language || null,
    }));
  }
  if (wantDrink) {
    const drinkItems = await DrinkItem.findAll({
      where: { restaurantId, isActive: true },
      include: [
        { model: DrinkItemTranslation, as: 'translations', required: false },
      ],
      limit: Math.min(parseInt(limit) || 300, 500),
    });
    out.drinks = drinkItems.map((d) => ({
      id: d.id,
      price: d.price != null ? Number(parseFloat(d.price).toFixed(2)) : null,
      imageUrl: d.imageUrl ? getMediaUrl(d.imageUrl, 'image') : null,
      name: d.translations?.[0]?.name || null,
      description: d.translations?.[0]?.description || null,
      language: d.translations?.[0]?.language || null,
    }));
  }
  return out;
}

function extractFirst(regex, text) {
  const m = regex.exec(text);
  return m ? m[1] : undefined;
}

function parseTemporalAtFromQuery(queryRaw, timeZone = 'Europe/Zagreb') {
  const q = normalizeText(queryRaw || '');
  const now = new Date();
  const base = new Date(now);
  let dayShift = 0;
  let hour = now.getHours();
  let minute = now.getMinutes();

  if (/\bsutra\b/.test(q)) dayShift = 1;
  if (/\bdanas\b/.test(q)) dayShift = 0;
  if (/\bveceras\b|\bvečeras\b/.test(q)) {
    hour = 20; // heuristika za "večeras"
    minute = 0;
  }
  // Tjedni dani (pon, uto, sri, cet, pet, sub, ned)
  const weekdays = [
    ['ponedjeljak', 'pon'],
    ['utorak', 'uto'],
    ['srijeda', 'sri'],
    ['četvrtak', 'cet', 'čet'],
    ['petak', 'pet'],
    ['subota', 'sub'],
    ['nedjelja', 'ned', 'nedjeljom', 'u nedjelju'],
  ];
  const weekIdx = weekdays.findIndex((names) =>
    names.some((w) => q.includes(normalizeText(w))),
  );
  if (weekIdx >= 0) {
    const target = new Date(now);
    const currentDay = target.getDay(); // 0=ned, 1=pon ...
    const toDateDay = weekIdx === 6 ? 0 : weekIdx + 1; // map na Date.getDay()
    let add = (toDateDay - currentDay + 7) % 7;
    if (add === 0 && !/\bdanas\b/.test(q)) add = 7; // ako je isti dan, pomakni na idući
    target.setDate(target.getDate() + add);
    base.setTime(target.getTime());
    hour = 12;
    minute = 0;
  }
  const timeMatch = q.match(/\b(\d{1,2})[:\.]?(\d{2})\b/);
  if (timeMatch) {
    hour = Math.min(23, Math.max(0, parseInt(timeMatch[1], 10)));
    minute = Math.min(59, Math.max(0, parseInt(timeMatch[2], 10)));
  }

  base.setDate(base.getDate() + dayShift);
  base.setHours(hour, minute, 0, 0);

  try {
    // Format to ISO in given TZ
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt
      .formatToParts(base)
      .reduce((acc, p) => ((acc[p.type] = p.value), acc), {});
    const isoLike = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00`;
    return isoLike;
  } catch (_) {
    return base.toISOString();
  }
}

function asksClosingTime(queryRaw) {
  const q = normalizeText(queryRaw || '');
  return /\b(do kada|dokad|do kad|kada zatvara|kad zatvara|do koliko|do koliko sati|do kada radi|do kad radi|do koliko radi)\b/.test(
    q,
  );
}

function simpleIntentParser(queryRaw) {
  const query = normalizeText(queryRaw || '');
  const nearMe = /(blizu mene|u mojoj blizini|near me)/.test(query);
  const city = extractFirst(/u\s+([a-zčćžšđ\s-]+?)(?:\?|,|\.|$)/i, query);
  const restaurantName =
    extractFirst(/restoran\s+"?([a-z0-9čćžšđ\s-]+)"?/i, query) ||
    extractFirst(/ima li\s+([a-z0-9čćžšđ\s-]+)\s+.*\?/i, query);
  const itemName =
    extractFirst(/ima(?:ju|li)?\s+([a-z0-9čćžšđ\s-]+)(?:\?|,|\.|\s)/i, query) ||
    extractFirst(
      /(lignje|pizza|rezanci|njoki|cevapi|ćevapi|šnicla|pasta|burger)[\s\?\.,]/i,
      query,
    );
  const perkName = extractFirst(
    /(stolica za djecu|dječja stolica|terasa|pet friendly|bez glutena|gluten free)/i,
    query,
  );

  // Determine intent
  let intent = 'unknown';
  if (restaurantName && itemName) intent = 'check_item_in_specific_restaurant';
  else if (nearMe && itemName && perkName)
    intent = 'find_by_item_and_perk_nearby';
  else if (nearMe && itemName) intent = 'find_items_nearby';
  else if (nearMe && perkName) intent = 'find_perk_nearby';

  return {
    intent,
    params: {
      restaurantName,
      city,
      itemName,
      perkName,
      nearMe,
    },
  };
}

// -------------- LLM function-calling integration --------------
const argsSchemas = {
  check_item_in_specific_restaurant: z.object({
    restaurantName: z.string().min(1),
    city: z.string().optional(),
    itemName: z.string().min(1),
  }),
  get_restaurant_info: z.object({
    restaurantName: z.string().min(1),
    city: z.string().optional(),
  }),
  get_restaurant_menu: z.object({
    restaurantName: z.string().min(1),
    city: z.string().optional(),
    menuType: z.enum(['food', 'drink', 'all']).optional(),
    limit: z.number().min(1).max(500).optional(),
  }),
  find_by_item_and_perk_nearby: z.object({
    itemName: z.string().min(1),
    perkName: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
    radiusKm: z.number().min(0.1).max(MAX_RADIUS).optional(),
  }),
  find_items_nearby: z.object({
    itemName: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
    radiusKm: z.number().min(0.1).max(MAX_RADIUS).optional(),
  }),
  find_perk_nearby: z.object({
    perkName: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
    radiusKm: z.number().min(0.1).max(MAX_RADIUS).optional(),
  }),
  find_restaurant_by_name_city: z.object({
    name: z.string().min(1),
    city: z.string().optional(),
  }),
  find_open_nearby_with_filters: z.object({
    latitude: z.number(),
    longitude: z.number(),
    radiusKm: z.number().min(0.1).max(MAX_RADIUS).optional(),
    at: z.string().optional(),
    foodTypes: z.array(z.string()).optional(),
    dietaryTypes: z.array(z.string()).optional(),
    mealTypes: z.array(z.string()).optional(),
    perks: z.array(z.string()).optional(),
    priceCategory: z.string().optional(),
    establishmentTypes: z.array(z.string()).optional(),
  }),
  is_restaurant_open: z.object({
    restaurantName: z.string().min(1),
    city: z.string().optional(),
    at: z.string().optional(),
  }),
  can_i_reserve_restaurant: z.object({
    restaurantName: z.string().min(1),
    city: z.string().optional(),
  }),
  find_nearby_by_price_and_types: z.object({
    latitude: z.number(),
    longitude: z.number(),
    radiusKm: z.number().min(0.1).max(MAX_RADIUS).optional(),
    priceCategory: z.string().min(1),
    foodTypes: z.array(z.string()).optional(),
    dietaryTypes: z.array(z.string()).optional(),
    perks: z.array(z.string()).optional(),
  }),
  find_nearby_by_establishment_type: z.object({
    latitude: z.number(),
    longitude: z.number(),
    radiusKm: z.number().min(0.1).max(MAX_RADIUS).optional(),
    establishmentTypes: z.array(z.string()).min(1),
  }),
  find_nearby_with_virtual_tour: z.object({
    latitude: z.number(),
    longitude: z.number(),
    radiusKm: z.number().min(0.1).max(MAX_RADIUS).optional(),
    foodTypes: z.array(z.string()).optional(),
    perks: z.array(z.string()).optional(),
  }),
};

function summarizeThreadForLLM(ctx) {
  if (!ctx) return null;
  const { lastIntent, lastParams, suggestedAction, lastResultsIds } = ctx || {};
  const safeParams = lastParams
    ? {
        itemName: lastParams.itemName ?? null,
        perkName: lastParams.perkName ?? null,
        city: lastParams.city ?? null,
        latitude: lastParams.latitude ?? null,
        longitude: lastParams.longitude ?? null,
        radiusKm: lastParams.radiusKm ?? null,
      }
    : null;
  const safeAction = suggestedAction
    ? { type: suggestedAction.type || null, toKm: suggestedAction.toKm || null }
    : null;
  const summary = {
    lastIntent: lastIntent || null,
    lastParams: safeParams,
    suggestedAction: safeAction,
    lastResultsCount: Array.isArray(lastResultsIds) ? lastResultsIds.length : 0,
  };
  const text = [
    'Sažetak prethodnog koraka: korisniku smo prikazali rezultate po zadnjem intentu.',
    'Ako korisnik kratko potvrdi (npr. "da", "povećaj"), primijeni suggestedAction na isti intent/parametre.',
    `JSON: ${JSON.stringify(summary)}`,
  ].join(' ');
  return text;
}

async function llmRoute({ query, coords, threadId }) {
  try {
    const sys = [
      'You are Dinver AI. Answer ONLY using Dinver partner data via the provided tools.',
      'Never invent data or write SQL. If unsure, choose the closest tool and ask for refinement.',
      'Language of the user in/out is Croatian when possible.',
      'If the summary JSON contains "suggestedAction" and the user message is a short confirmation (e.g., "da", "ok", "povećaj"), reuse lastIntent and lastParams, apply the suggestedAction (e.g., increase radiusKm to suggestedAction.toKm), and call exactly ONE matching tool with the updated arguments.',
    ].join(' ');

    const ctx = threadId ? threadStore.get(threadId) : null;
    const ctxSummary = summarizeThreadForLLM(ctx);

    const messages = [
      { role: 'system', content: sys },
      ...(ctxSummary ? [{ role: 'system', content: ctxSummary }] : []),
      {
        role: 'user',
        content: JSON.stringify({
          question: query,
          userLocation: coords ?? null,
          notes:
            'Odgovaraj na hrvatskom. Ako je pitanje o konkretnom restoranu, koristi get_restaurant_info ili get_restaurant_menu ili is_restaurant_open. Za pretrage blizu koristi find_* alate. Pozovi točno JEDNU funkciju s validiranim argumentima.',
        }),
      },
    ];

    let resp;
    try {
      resp = await OpenAIClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        messages,
        tools,
        tool_choice: 'auto',
      });
    } catch (err) {
      // one quick retry
      try {
        resp = await OpenAIClient.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          temperature: 0,
          messages,
          tools,
          tool_choice: 'auto',
        });
      } catch (err2) {
        const msg = String(
          err2 && (err2.message || err2.toString()),
        ).toLowerCase();
        const isTimeout = msg.includes('timeout');
        return {
          intent: 'fallback',
          params: {},
          tool: null,
          args: null,
          llmError: isTimeout ? 'timeout' : 'llm_failed',
        };
      }
    }

    const msg = resp.choices?.[0]?.message;
    const toolCall = msg?.tool_calls?.[0];
    if (!toolCall)
      return { intent: 'fallback', params: {}, tool: null, args: null };

    const name = toolCall.function.name;
    let args = {};
    try {
      args = JSON.parse(toolCall.function.arguments || '{}');
    } catch (_) {
      return { intent: 'fallback', params: {}, tool: null, args: null };
    }
    if (args.latitude == null && coords?.latitude)
      args.latitude = coords.latitude;
    if (args.longitude == null && coords?.longitude)
      args.longitude = coords.longitude;
    if (args.radiusKm == null) args.radiusKm = DEFAULT_RADIUS;

    const schema = argsSchemas[name];
    if (schema) args = schema.parse(args);

    return {
      intent: name,
      params: args,
      tool: name,
      args,
      model: resp.model,
      usage: resp.usage || null,
      contextSummary: ctxSummary || null,
    };
  } catch (e) {
    // If validation error from zod, propagate as ambiguous so controller can return 422
    if (e && e.errors) {
      return {
        intent: 'fallback',
        params: {},
        tool: null,
        args: null,
        code: 'AMBIGUOUS',
        details: e.errors,
        llmError: null,
      };
    }
    return {
      intent: 'fallback',
      params: {},
      tool: null,
      args: null,
      llmError: 'llm_failed',
    };
  }
}

async function routeQueryWithLLM({
  query,
  latitude,
  longitude,
  radiusKm = 5,
  limit,
  cursor,
  threadId,
}) {
  const hasCoords = latitude != null && longitude != null;
  const coords = hasCoords
    ? { latitude: Number(latitude), longitude: Number(longitude) }
    : null;
  const started = Date.now();

  // Try confirmation short-cuts based on thread state
  let intent = null;
  let params = null;
  if (threadId) {
    const conf = parseConfirmation(query);
    if (conf) {
      const applied = applyConfirmation(threadId, conf);
      if (applied) {
        intent = applied.intent;
        params = { ...(applied.params || {}), ...(coords || {}) };
      }
    }
  }

  const llm = intent
    ? { intent, args: params }
    : await llmRoute({ query, coords, threadId });
  intent = llm.intent;
  params = llm.args;
  // Late safety: if LLM didn't choose a tool but this looks like a short confirmation,
  // try to apply confirmation once more (covers "OK"-only responses from LLM flows).
  if (!llm.tool && threadId) {
    const conf2 = parseConfirmation(query);
    if (conf2) {
      const applied2 = applyConfirmation(threadId, conf2);
      if (applied2) {
        intent = applied2.intent;
        params = { ...(applied2.params || {}), ...(coords || {}) };
      }
    }
  }

  if (!llm.tool) {
    const fb = simpleIntentParser(query);
    intent = fb.intent;
    params = {
      ...fb.params,
      ...(coords || {}),
      radiusKm: radiusKm || DEFAULT_RADIUS,
    };
    // If user used temporal phrases, add inferred "at" for open-time checks
    if (intent === 'is_restaurant_open' && !params.at) {
      const inferred = parseTemporalAtFromQuery(query);
      if (inferred) params.at = inferred;
    }
  } else {
    if (params?.radiusKm)
      params.radiusKm = Math.min(Math.max(params.radiusKm, 0.1), MAX_RADIUS);
    if (radiusKm != null)
      params.radiusKm = Math.min(Number(radiusKm), MAX_RADIUS);
  }

  // If ambiguous (validation), return error payload
  if (llm.code === 'AMBIGUOUS') {
    return {
      intent: 'ambiguous',
      params: {},
      resultType: 'error',
      code: 'AMBIGUOUS',
      error: 'ambiguous',
      durationMs: Date.now() - started,
      model: llm.model || null,
      usage: llm.usage || null,
      llmError: llm.llmError || null,
    };
  }

  // Compute params hash for stable cursoring
  const paramsHash = hashParams(intent, params);

  // Existing execution branches, but driven by intent/params
  if (intent === 'check_item_in_specific_restaurant') {
    const restaurant = await findRestaurantByNameCity({
      name: params.restaurantName,
      city: params.city,
    });
    if (!restaurant) {
      return {
        intent,
        params,
        resultType: 'answer',
        code: 'RESTAURANT_NOT_FOUND',
        answer: 'Nismo pronašli taj restoran.',
        durationMs: Date.now() - started,
        llmError: llm.llmError || null,
      };
    }
    const check = await checkItemInRestaurant({
      restaurantId: restaurant.id,
      itemName: params.itemName,
    });
    if (!restaurant.isClaimed) {
      return {
        intent,
        params,
        resultType: 'answer',
        code: 'NOT_PARTNER',
        answer:
          'Taj restoran trenutno nije partner Dinveru pa nemamo njihov službeni meni.',
        restaurant,
        durationMs: Date.now() - started,
        llmError: llm.llmError || null,
      };
    }
    return {
      intent,
      params,
      resultType: 'answer',
      restaurant,
      hasItem: check.found,
      items: check.items,
      answer: check.found
        ? 'Da, pronašli smo traženo jelo u meniju tog partnera.'
        : 'Nismo našli to jelo u meniju tog partnera.',
      code: check.found ? undefined : check.code || 'NO_RESULTS',
      durationMs: Date.now() - started,
      model: llm.model || null,
      usage: llm.usage || null,
      llmError: llm.llmError || null,
      paramsHash,
    };
  }

  if (intent === 'find_by_item_and_perk_nearby') {
    if (!(latitude && longitude)) {
      return {
        intent,
        params,
        resultType: 'error',
        code: 'MISSING_LOCATION',
        error: 'missing_location',
        durationMs: Date.now() - started,
      };
    }
    const results = await findRestaurantsByItemAndPerkNear({
      latitude,
      longitude,
      radiusKm,
      itemName: params.itemName,
      perkName: params.perkName,
      limit,
    });
    const { page, nextCursor, prevCursor, pageInfo } = paginateWithHash({
      list: results,
      limit,
      cursor,
      paramsHash,
    });
    // Save thread context / suggested action
    try {
      if (threadId) {
        let suggestedAction = null;
        if (!results.length) {
          suggestedAction = {
            type: 'increase_radius',
            toKm: Math.min((radiusKm || DEFAULT_RADIUS) * 2, MAX_RADIUS),
          };
        }
        threadStore.update(threadId, {
          lastIntent: intent,
          lastParams: { ...params, latitude, longitude, radiusKm },
          lastResultsIds: results.map((r) => r.restaurant.id),
          suggestedAction,
        });
      }
    } catch (_) {}
    return {
      intent,
      params,
      resultType: 'restaurants',
      code: results.length ? undefined : 'NO_RESULTS',
      restaurants: page,
      nextCursor,
      prevCursor,
      pageInfo,
      durationMs: Date.now() - started,
      model: llm.model || null,
      usage: llm.usage || null,
      llmError: llm.llmError || null,
      contextSummary: llm.contextSummary || null,
      paramsHash,
    };
  }

  if (intent === 'is_restaurant_open') {
    const restaurant = await findRestaurantByNameCity({
      name: params.restaurantName,
      city: params.city,
    });
    if (!restaurant) {
      return {
        intent,
        params,
        resultType: 'answer',
        code: 'RESTAURANT_NOT_FOUND',
        answer: 'Nismo pronašli taj restoran.',
        durationMs: Date.now() - started,
        model: llm.model || null,
        usage: llm.usage || null,
        llmError: llm.llmError || null,
      };
    }
    const at = params.at || parseTemporalAtFromQuery(query);
    const state = isOpenAt(restaurant.openingHours, at);
    const dayLabel = getDayRelationLabel(at).label;
    const wantsClosingTime = asksClosingTime(query);
    let answer;
    if (state.state === 'open') {
      const closes = formatHHmm(state.closesAt);
      answer = wantsClosingTime
        ? closes
          ? `${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)} rade do ${closes}.`
          : `Radno vrijeme za ${dayLabel} nije dostupno.`
        : closes
          ? `Da, otvoreni su – ${dayLabel} rade do ${closes}.`
          : 'Da, otvoreni su.';
    } else if (state.state === 'closed') {
      const opens = formatHHmm(state.opensAt);
      answer = wantsClosingTime
        ? `${dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)} su zatvoreni.`
        : opens
          ? `Zatvoreni su – ${dayLabel} otvaraju u ${opens}.`
          : 'Zatvoreni su.';
    } else {
      answer = 'Radno vrijeme nije dostupno.';
    }
    return {
      intent,
      params,
      resultType: 'answer',
      restaurant,
      answer,
      isOpenNow: state.state === 'open',
      opensAt: state.opensAt ? formatHHmm(state.opensAt) : null,
      closesAt: state.closesAt ? formatHHmm(state.closesAt) : null,
      at,
      durationMs: Date.now() - started,
      model: llm.model || null,
      usage: llm.usage || null,
      llmError: llm.llmError || null,
    };
  }

  if (intent === 'get_restaurant_info') {
    const restaurant = await findRestaurantByNameCity({
      name: params.restaurantName,
      city: params.city,
    });
    if (!restaurant) {
      return {
        intent,
        params,
        resultType: 'answer',
        code: 'RESTAURANT_NOT_FOUND',
        answer: 'Nismo pronašli taj restoran.',
        durationMs: Date.now() - started,
        model: llm.model || null,
        usage: llm.usage || null,
        llmError: llm.llmError || null,
      };
    }
    return {
      intent,
      params,
      resultType: 'restaurant_info',
      restaurant,
      durationMs: Date.now() - started,
      model: llm.model || null,
      usage: llm.usage || null,
      llmError: llm.llmError || null,
    };
  }

  if (intent === 'get_restaurant_menu') {
    const restaurant = await findRestaurantByNameCity({
      name: params.restaurantName,
      city: params.city,
    });
    if (!restaurant) {
      return {
        intent,
        params,
        resultType: 'answer',
        code: 'RESTAURANT_NOT_FOUND',
        answer: 'Nismo pronašli taj restoran.',
        durationMs: Date.now() - started,
        model: llm.model || null,
        usage: llm.usage || null,
        llmError: llm.llmError || null,
      };
    }
    if (!restaurant.isClaimed) {
      return {
        intent,
        params,
        resultType: 'answer',
        code: 'NOT_PARTNER',
        restaurant,
        answer:
          'Taj restoran trenutno nije partner Dinveru pa nemamo njihov službeni meni.',
        durationMs: Date.now() - started,
        model: llm.model || null,
        usage: llm.usage || null,
        llmError: llm.llmError || null,
      };
    }
    const menu = await getRestaurantMenuStructured({
      restaurantId: restaurant.id,
      menuType: params.menuType || 'all',
      limit: params.limit || 300,
    });
    return {
      intent,
      params,
      resultType: 'menu',
      restaurant,
      menu,
      durationMs: Date.now() - started,
      model: llm.model || null,
      usage: llm.usage || null,
      llmError: llm.llmError || null,
    };
  }

  if (intent === 'can_i_reserve_restaurant') {
    const restaurant = await findRestaurantByNameCity({
      name: params.restaurantName,
      city: params.city,
    });
    if (!restaurant) {
      return {
        intent,
        params,
        resultType: 'answer',
        code: 'RESTAURANT_NOT_FOUND',
        answer: 'Nismo pronašli taj restoran.',
        durationMs: Date.now() - started,
        model: llm.model || null,
        usage: llm.usage || null,
        llmError: llm.llmError || null,
      };
    }
    return {
      intent,
      params,
      resultType: 'answer',
      restaurant,
      answer: restaurant.reservationEnabled
        ? 'Da, moguće je rezervirati.'
        : 'Rezervacije nisu omogućene.',
      canReserve: !!restaurant.reservationEnabled,
      phone: restaurant.phone || null,
      email: restaurant.email || null,
      durationMs: Date.now() - started,
      model: llm.model || null,
      usage: llm.usage || null,
      llmError: llm.llmError || null,
    };
  }

  if (intent === 'find_open_nearby_with_filters') {
    if (!(latitude && longitude)) {
      return {
        intent,
        params,
        resultType: 'error',
        code: 'MISSING_LOCATION',
        error: 'missing_location',
        durationMs: Date.now() - started,
      };
    }
    // Reuse findByItem/perk style: start from claimed restaurants in bbox then apply opening hours filter in JS
    const R = clampRadius(params.radiusKm || radiusKm);
    const bbox = computeBBox(parseFloat(latitude), parseFloat(longitude), R);
    const where = {
      isClaimed: true,
      latitude: { [Op.between]: [bbox.latMin, bbox.latMax] },
      longitude: { [Op.between]: [bbox.lonMin, bbox.lonMax] },
    };
    if (params.priceCategory) {
      // Map by name to id if possible
      const pcLike = { [Op.iLike]: `%${params.priceCategory}%` };
      const pcs = await PriceCategory.findAll({
        where: { [Op.or]: [{ nameHr: pcLike }, { nameEn: pcLike }] },
      });
      if (pcs.length) where.priceCategoryId = { [Op.in]: pcs.map((x) => x.id) };
    }

    // Map establishment types, mealTypes, foodTypes, dietaryTypes
    const estTypeIds = await findIdsByNames(
      EstablishmentType,
      params.establishmentTypes,
    );
    if (estTypeIds.length)
      where.establishmentTypes = { [Op.overlap]: estTypeIds };
    const mealTypeIds = await findIdsByNames(MealType, params.mealTypes);
    if (mealTypeIds.length) where.mealTypes = { [Op.overlap]: mealTypeIds };
    const foodTypeIds = await findIdsByNames(FoodType, params.foodTypes);
    if (foodTypeIds.length) where.foodTypes = { [Op.overlap]: foodTypeIds };
    const dietaryTypeIds = await findIdsByNames(
      DietaryType,
      params.dietaryTypes,
    );
    if (dietaryTypeIds.length)
      where.dietaryTypes = { [Op.overlap]: dietaryTypeIds };

    if (params.perks && params.perks.length) {
      const perkIds = await findPerkIdsByNames(params.perks);
      if (perkIds.length) {
        // AND logic over integer array: every id must be present
        where.establishmentPerks = { [Op.contains]: perkIds };
      }
    }
    const candidates = await Restaurant.findAll({
      where,
      attributes: [
        'id',
        'name',
        'place',
        'address',
        'latitude',
        'longitude',
        'thumbnailUrl',
        'isClaimed',
        'openingHours',
        'reservationEnabled',
        'priceCategoryId',
        'virtualTourUrl',
      ],
      limit: 200,
    });
    const results = candidates
      .map((r) => {
        const d = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(r.latitude),
          parseFloat(r.longitude),
        );
        const s = isOpenAt(r.openingHours, params.at);
        return {
          restaurant: decorateRestaurant(r),
          distance: d,
          isOpenNow: s.state === 'open',
          opensAt: s.opensAt || null,
          closesAt: s.closesAt || null,
        };
      })
      .filter((x) => isFinite(x.distance) && x.distance <= R)
      .filter((x) => x.isOpenNow)
      .sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance;
        return (a.restaurant.id || 0) - (b.restaurant.id || 0);
      });
    const { page, nextCursor, prevCursor, pageInfo } = paginateWithHash({
      list: results,
      limit: limit || params.limit,
      cursor,
      paramsHash,
    });
    try {
      if (threadId) {
        const currentR = Number(params.radiusKm || radiusKm || DEFAULT_RADIUS);
        const suggestedAction = !results.length
          ? {
              type: 'increase_radius',
              toKm: Math.min(currentR * 2, MAX_RADIUS),
            }
          : null;
        threadStore.update(threadId, {
          lastIntent: intent,
          lastParams: {
            ...params,
            latitude,
            longitude,
            radiusKm: params.radiusKm || radiusKm,
          },
          lastResultsIds: results.map((r) => r.restaurant.id),
          suggestedAction,
        });
      }
    } catch (_) {}
    return {
      intent,
      params,
      resultType: 'restaurants',
      restaurants: page,
      code: results.length ? undefined : 'NO_RESULTS',
      nextCursor,
      prevCursor,
      pageInfo,
      durationMs: Date.now() - started,
      model: llm.model || null,
      usage: llm.usage || null,
      llmError: llm.llmError || null,
      contextSummary: llm.contextSummary || null,
      suggestedAction: !results.length
        ? {
            type: 'increase_radius',
            toKm: Math.min(
              Number(params.radiusKm || radiusKm || DEFAULT_RADIUS) * 2,
              MAX_RADIUS,
            ),
          }
        : null,
      paramsHash,
    };
  }

  if (intent === 'find_nearby_with_virtual_tour') {
    if (!(latitude && longitude)) {
      return {
        intent,
        params,
        resultType: 'error',
        code: 'MISSING_LOCATION',
        error: 'missing_location',
        durationMs: Date.now() - started,
      };
    }
    const R = clampRadius(params.radiusKm || radiusKm);
    const bbox = computeBBox(parseFloat(latitude), parseFloat(longitude), R);
    const where = {
      isClaimed: true,
      virtualTourUrl: { [Op.ne]: null },
      latitude: { [Op.between]: [bbox.latMin, bbox.latMax] },
      longitude: { [Op.between]: [bbox.lonMin, bbox.lonMax] },
    };
    const candidates = await Restaurant.findAll({
      where,
      attributes: [
        'id',
        'name',
        'place',
        'address',
        'latitude',
        'longitude',
        'thumbnailUrl',
        'isClaimed',
        'virtualTourUrl',
      ],
    });
    const results = candidates
      .map((r) => {
        const d = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(r.latitude),
          parseFloat(r.longitude),
        );
        return { restaurant: decorateRestaurant(r), distance: d };
      })
      .filter((x) => isFinite(x.distance) && x.distance <= R)
      .sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance;
        return (a.restaurant.id || 0) - (b.restaurant.id || 0);
      });
    const { page, nextCursor, prevCursor, pageInfo } = paginateWithHash({
      list: results,
      limit: limit || params.limit,
      cursor,
      paramsHash,
    });
    return {
      intent,
      params,
      resultType: 'restaurants',
      restaurants: page,
      code: results.length ? undefined : 'NO_RESULTS',
      nextCursor,
      prevCursor,
      pageInfo,
      durationMs: Date.now() - started,
      model: llm.model || null,
      usage: llm.usage || null,
      llmError: llm.llmError || null,
      contextSummary: llm.contextSummary || null,
      paramsHash,
    };
  }

  if (intent === 'find_items_nearby') {
    if (!(latitude && longitude)) {
      return {
        intent,
        params,
        resultType: 'error',
        code: 'MISSING_LOCATION',
        error: 'missing_location',
        durationMs: Date.now() - started,
      };
    }
    const results = await findMenuItemsByNameNear({
      latitude,
      longitude,
      radiusKm,
      itemName: params.itemName,
      limit,
    });
    // Limit top items per restaurant to 3 for clean UI
    for (const r of results) {
      if (r.items && r.items.length > 3) r.items = r.items.slice(0, 3);
    }
    const { page, nextCursor, prevCursor, pageInfo } = paginateWithHash({
      list: results,
      limit,
      cursor,
      paramsHash,
    });
    return {
      intent,
      params,
      resultType: 'restaurants',
      code: results.length ? undefined : 'NO_RESULTS',
      restaurants: page,
      nextCursor,
      prevCursor,
      pageInfo,
      durationMs: Date.now() - started,
      model: llm.model || null,
      usage: llm.usage || null,
      llmError: llm.llmError || null,
      contextSummary: llm.contextSummary || null,
      paramsHash,
    };
  }

  if (intent === 'find_perk_nearby') {
    if (!(latitude && longitude)) {
      return {
        intent,
        params,
        resultType: 'error',
        code: 'MISSING_LOCATION',
        error: 'missing_location',
        durationMs: Date.now() - started,
      };
    }
    const results = await findRestaurantsByPerkNear({
      latitude,
      longitude,
      radiusKm,
      perkName: params.perkName,
      limit,
    });
    const { page, nextCursor, prevCursor, pageInfo } = paginateWithHash({
      list: results,
      limit,
      cursor,
      paramsHash,
    });
    return {
      intent,
      params,
      resultType: 'restaurants',
      code: results.length ? undefined : 'NO_RESULTS',
      restaurants: page,
      nextCursor,
      prevCursor,
      pageInfo,
      durationMs: Date.now() - started,
      model: llm.model || null,
      usage: llm.usage || null,
      llmError: llm.llmError || null,
      paramsHash,
    };
  }

  if (intent === 'find_restaurant_by_name_city') {
    const restaurant = await findRestaurantByNameCity({
      name: params.name,
      city: params.city,
    });
    const results = restaurant ? [{ restaurant, distance: null }] : [];
    const { page, nextCursor, prevCursor, pageInfo } = paginateWithHash({
      list: results,
      limit: limit || 20,
      cursor,
      paramsHash,
    });
    return {
      intent,
      params,
      resultType: restaurant ? 'restaurants' : 'answer',
      restaurants: restaurant ? page : undefined,
      answer: restaurant ? undefined : 'Nismo pronašli taj restoran.',
      nextCursor: restaurant ? nextCursor : null,
      prevCursor: restaurant ? prevCursor : null,
      pageInfo: restaurant ? pageInfo : undefined,
      durationMs: Date.now() - started,
      model: llm.model || null,
      usage: llm.usage || null,
      llmError: llm.llmError || null,
      contextSummary: llm.contextSummary || null,
      paramsHash,
    };
  }

  return {
    intent,
    params,
    resultType: 'answer',
    answer:
      'Možete pitati za jela i pogodnosti, npr. “Koji restoran blizu mene ima lignje i stolicu za djecu?”.',
    durationMs: Date.now() - started,
    model: llm.model || null,
    usage: llm.usage || null,
    llmError: llm.llmError || null,
    contextSummary: llm.contextSummary || null,
    paramsHash,
  };
}

async function routeQuery({ query, latitude, longitude, radiusKm = 5 }) {
  const { intent, params } = simpleIntentParser(query);

  if (intent === 'check_item_in_specific_restaurant') {
    const restaurant = await findRestaurantByNameCity({
      name: params.restaurantName,
      city: params.city,
    });
    if (!restaurant) {
      return {
        intent,
        params,
        resultType: 'answer',
        code: 'RESTAURANT_NOT_FOUND',
        answer: 'Nismo pronašli taj restoran.',
      };
    }
    const check = await checkItemInRestaurant({
      restaurantId: restaurant.id,
      itemName: params.itemName,
    });
    if (!restaurant.isClaimed) {
      return {
        intent,
        params,
        resultType: 'answer',
        code: 'NOT_PARTNER',
        answer:
          'Taj restoran trenutno nije partner Dinveru pa nemamo njihov službeni meni.',
        restaurant,
      };
    }
    return {
      intent,
      params,
      resultType: 'answer',
      restaurant,
      hasItem: check.found,
      items: check.items,
      answer: check.found
        ? 'Da, pronašli smo traženo jelo u meniju tog partnera.'
        : 'Nismo našli to jelo u meniju tog partnera.',
      code: check.found ? undefined : check.code || 'NO_RESULTS',
    };
  }

  if (intent === 'find_by_item_and_perk_nearby') {
    if (!(latitude && longitude)) {
      return {
        intent,
        params,
        resultType: 'error',
        code: 'MISSING_LOCATION',
        error: 'missing_location',
      };
    }
    const results = await findRestaurantsByItemAndPerkNear({
      latitude,
      longitude,
      radiusKm,
      itemName: params.itemName,
      perkName: params.perkName,
    });
    return {
      intent,
      params,
      resultType: 'restaurants',
      code: results.length ? undefined : 'NO_RESULTS',
      restaurants: results,
    };
  }

  if (intent === 'find_items_nearby') {
    if (!(latitude && longitude)) {
      return {
        intent,
        params,
        resultType: 'error',
        code: 'MISSING_LOCATION',
        error: 'missing_location',
      };
    }
    const results = await findMenuItemsByNameNear({
      latitude,
      longitude,
      radiusKm,
      itemName: params.itemName,
    });
    return {
      intent,
      params,
      resultType: 'restaurants',
      code: results.length ? undefined : 'NO_RESULTS',
      restaurants: results,
    };
  }

  if (intent === 'find_perk_nearby') {
    if (!(latitude && longitude)) {
      return {
        intent,
        params,
        resultType: 'error',
        code: 'MISSING_LOCATION',
        error: 'missing_location',
      };
    }
    const results = await findRestaurantsByPerkNear({
      latitude,
      longitude,
      radiusKm,
      perkName: params.perkName,
    });
    return {
      intent,
      params,
      resultType: 'restaurants',
      code: results.length ? undefined : 'NO_RESULTS',
      restaurants: results,
    };
  }

  return {
    intent,
    params,
    resultType: 'answer',
    answer:
      'Možete pitati za jela i pogodnosti, npr. “Koji restoran blizu mene ima lignje i stolicu za djecu?”.',
  };
}

module.exports = {
  routeQuery: routeQueryWithLLM,
  simpleIntentParser,
};
