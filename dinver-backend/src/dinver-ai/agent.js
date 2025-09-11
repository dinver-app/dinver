'use strict';
const { detectLanguage } = require('./language');
const { classifyIntent } = require('./intentClassifier');
const { inferIntent } = require('./llmRouter');
const {
  fetchRestaurantDetails,
  searchMenuAcrossRestaurants,
  searchMenuForRestaurant,
  findNearbyPartners,
  fetchTypesForRestaurant,
  fetchReviewsSummary,
  fetchPartnersBasic,
  resolvePerkIdByName,
  findMostExpensiveItemsForRestaurant,
} = require('./dataAccess');
// (formatters no longer used for replies; LLM crafts all natural text)
const { generateNaturalReply } = require('./llm');

// ---- Scope helpers ----
function isGlobalQuery(text = '') {
  const t = (text || '').toLowerCase();
  return /\b(blizu mene|u blizini|near me|nearby|neki restoran|neki restorani|restaurants|restorani|u okolici|oko mene)\b/.test(
    t,
  );
}

// ---- Time helpers (Europe/Zagreb) ----
function getZagrebNow() {
  const now = new Date();
  // Convert to Europe/Zagreb by using localeString trick
  return new Date(now.toLocaleString('en-GB', { timeZone: 'Europe/Zagreb' }));
}

function jsDayToMon0(jsDay) {
  // JS: 0=Sunday..6=Saturday; Mon0: 0=Mon..6=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

function parseMinutes(hhmm) {
  if (!hhmm || hhmm.length < 2) return null;
  const h = Number(hhmm.slice(0, 2));
  const m = Number(hhmm.slice(2, 4) || '0');
  return h * 60 + m;
}

function getTodayPeriod(openingHours, customWorkingDays) {
  const now = getZagrebNow();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const key = `${y}-${m}-${d}`;

  const override = customWorkingDays && customWorkingDays[key];
  if (override && override.open && override.close) {
    const toHHmm = (s) => (s || '').replace(':', '').padEnd(4, '0').slice(0, 4);
    const jsDay = now.getDay();
    const mon0 = jsDay === 0 ? 6 : jsDay - 1;
    const nextDay = (mon0 + 1) % 7;
    const spansMidnight = override.closeDayOffset === 1;
    return {
      open: { day: mon0, time: toHHmm(override.open) },
      close: {
        day: spansMidnight ? nextDay : mon0,
        time: toHHmm(override.close),
      },
    };
  }

  const jsDay = now.getDay();
  const mon0 = jsDay === 0 ? 6 : jsDay - 1;
  const p = openingHours?.periods?.[mon0];
  return p || null;
}

function computeOpenNow(openingHours, customWorkingDays) {
  try {
    const now = getZagrebNow();
    const minutes = now.getHours() * 60 + now.getMinutes();

    const today = getTodayPeriod(openingHours, customWorkingDays);
    if (!today?.open?.time || !today?.close?.time) return false;

    const o = parseMinutes(today.open.time);
    const c = parseMinutes(today.close.time);
    const spansMidnight = today.close.day !== today.open.day;

    if (o == null || c == null) return false;
    if (!spansMidnight) return minutes >= o && minutes < c;

    if (minutes >= o) return true;
    if (minutes < c) return true;
    return false;
  } catch {
    return false;
  }
}

function extractRestaurantNameOrSlug(text) {
  // Heuristic: words after keywords "restoran", "restaurant", or explicit quotes
  const m = /(?:restoran|restaurant)\s+([a-z0-9\- _]+)/i.exec(text || '');
  if (m && m[1]) return m[1].trim();
  const q = /"([^"]{2,100})"/i.exec(text || '');
  if (q && q[1]) return q[1].trim();
  return null;
}

async function resolveRestaurantByName(nameLike) {
  if (!nameLike) return null;
  const { Restaurant } = require('../../models');
  const { Op } = require('sequelize');
  const r = await Restaurant.findOne({
    where: {
      isClaimed: true,
      [Op.or]: [
        { name: { [Op.iLike]: `%${nameLike}%` } },
        {
          slug: {
            [Op.iLike]: `%${nameLike.replace(/\s+/g, '-').toLowerCase()}%`,
          },
        },
      ],
    },
    attributes: ['id', 'name', 'slug'],
  });
  return r ? (r.get ? r.get() : r) : null;
}

// --- Partner-based fuzzy resolution from the whole message ---
function normalize(str) {
  return (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function scoreMatch(textNorm, candidateNameNorm, candidateSlug) {
  let score = 0;
  if (!textNorm || !candidateNameNorm) return 0;
  if (textNorm.includes(candidateNameNorm)) score += 1.0; // full phrase match
  const tokens = candidateNameNorm.split(/\s+/).filter(Boolean);
  let hits = 0;
  const head = tokens[0];
  for (const tok of tokens) {
    if (tok.length < 3) continue;
    if (textNorm.includes(tok)) hits += 1;
  }
  if (tokens.length > 0) score += hits / tokens.length; // partial coverage
  // Strong brand/head-token boost (e.g., "marabu")
  if (head && head.length >= 4 && textNorm.includes(head)) score += 0.6;
  if (candidateSlug && textNorm.includes(candidateSlug)) score += 0.25;
  return score; // 0..2.25
}

async function resolveRestaurantFromText(text, preferRestaurantId) {
  const partners = await fetchPartnersBasic();
  let t = normalize(text);
  // Remove generic tokens that commonly appear in questions but aren't part of names
  t = t
    .replace(
      /\b(restoran|caffe|kafi[cć]|bar|pizzeria|club|kavana|coffee|restaurant)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();
  const scored = partners.map((p) => {
    const nameN = normalize(p.name);
    const slug = (p.slug || '').toLowerCase();
    return { p, s: scoreMatch(t, nameN, slug) };
  });
  scored.sort((a, b) => b.s - a.s);
  const top = scored[0];
  const second = scored[1];
  if (!top || top.s < 0.5) {
    if (preferRestaurantId)
      return { match: { id: preferRestaurantId }, candidates: [] };
    return { match: null, candidates: scored.slice(0, 3).map((x) => x.p) };
  }
  if (second && top.s - second.s < 0.2) {
    if (preferRestaurantId)
      return { match: { id: preferRestaurantId }, candidates: [] };
    return { match: null, candidates: scored.slice(0, 3).map((x) => x.p) };
  }
  return {
    match: { id: top.p.id, name: top.p.name, slug: top.p.slug },
    candidates: [],
  };
}

function formatDisambiguation(candidates, lang) {
  const names = candidates
    .slice(0, 3)
    .map((c) => c.name)
    .join(', ');
  return lang === 'hr' ? `Mislite li na: ${names}?` : `Did you mean: ${names}?`;
}

function pickDayIndexFromText(text, lang) {
  const t = (text || '').toLowerCase();
  const mapHr = {
    pon: 0,
    uto: 1,
    sri: 2,
    čet: 3,
    cet: 3,
    pet: 4,
    sub: 5,
    ned: 6,
  };
  const mapEn = {
    mon: 0,
    tue: 1,
    wed: 2,
    thu: 3,
    fri: 4,
    sat: 5,
    sun: 6,
  };
  const map = lang === 'hr' ? mapHr : mapEn;
  for (const key of Object.keys(map)) {
    if (t.includes(key)) return map[key];
  }
  // Default to today
  const jsDay = getZagrebNow().getDay();
  return jsDayToMon0(jsDay);
}

async function handleHours({
  lang,
  text,
  restaurantQuery,
  preferRestaurantId,
}) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(
    restaurantQuery || text,
    preferRestaurantId,
  );
  let restaurantBasic = resolved;
  if (!restaurantBasic) {
    const nameOrSlug = extractRestaurantNameOrSlug(text);
    restaurantBasic = await resolveRestaurantByName(nameOrSlug);
  }
  if (!restaurantBasic) {
    // Delegate clarification to LLM (no fallback text)
    const textOut = await generateNaturalReply({
      lang,
      intent: 'hours',
      question: text,
      data: {
        clarify: true,
        candidates: (candidates || []).map((c) => ({ id: c.id, name: c.name })),
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const restaurant = await fetchRestaurantDetails(restaurantBasic.id);
  if (
    !restaurant ||
    !restaurant.openingHours ||
    !restaurant.openingHours.periods
  ) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'hours',
      question: text,
      data: {
        restaurant: { id: restaurantBasic.id, name: restaurantBasic.name },
        missingHours: true,
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: restaurantBasic.id };
  }
  const dayIndex = pickDayIndexFromText(text, lang);
  const period = restaurant.openingHours.periods[dayIndex];
  if (
    !period ||
    !period.open ||
    !period.close ||
    !period.open.time ||
    !period.close.time
  ) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'hours',
      question: text,
      data: {
        restaurant: { id: restaurant.id, name: restaurant.name },
        dayIndex,
        open: null,
        close: null,
        openNow: computeOpenNow(restaurant.openingHours),
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: restaurant.id };
  }
  const openNow = computeOpenNow(restaurant.openingHours);
  const textOut = await generateNaturalReply({
    lang,
    intent: 'hours',
    question: text,
    data: {
      restaurant: { id: restaurant.id, name: restaurant.name },
      dayIndex,
      open: period.open,
      close: period.close,
      openNow: computeOpenNow(
        restaurant.openingHours,
        restaurant.customWorkingDays,
      ),
    },
    fallback: '',
  });
  return { text: textOut, restaurantId: restaurant.id };
}

async function handleNearby({
  lang,
  latitude,
  longitude,
  radiusKm,
  filters,
  text,
}) {
  const initialNearby = await findNearbyPartners({
    latitude,
    longitude,
    radiusKm,
    limit: 20,
  });
  console.log('[AI][nearby] query', {
    latitude,
    longitude,
    radiusKm,
    filters,
    initialCount: initialNearby.length,
  });

  let nearby = [...initialNearby];
  // Filter by perk if requested
  if (filters && filters.perk) {
    // Resolve to specific perk id (hr/en synonyms supported)
    const resolved = await resolvePerkIdByName(filters.perk);
    console.log('[AI][nearby] perk resolve', { input: filters.perk, resolved });
    if (resolved?.id) {
      const targetId = resolved.id;
      const enriched = await Promise.all(
        nearby.map(async (r) => {
          const details = await fetchRestaurantDetails(r.id);
          if (!details) return null;
          const has = Array.isArray(details.establishmentPerks)
            ? details.establishmentPerks.includes(targetId)
            : false;
          return has ? r : null;
        }),
      );
      nearby = enriched.filter(Boolean);
    } else {
      // If we cannot resolve the perk name to an id, force empty to avoid hallucinations
      nearby = [];
    }
    console.log('[AI][nearby] after perk filter', {
      perk: filters.perk,
      count: nearby.length,
      sample: nearby
        .slice(0, 3)
        .map((x) => x?.name)
        .filter(Boolean),
    });
  }
  // Food type filter
  if (filters && filters.foodType) {
    const term = String(filters.foodType).toLowerCase();
    const enriched = await Promise.all(
      nearby.map(async (r) => {
        const details = await fetchRestaurantDetails(r.id);
        if (!details) return null;
        const { foodTypes } = await fetchTypesForRestaurant(details);
        const has = foodTypes?.some((ft) =>
          (ft.nameHr || ft.nameEn || '').toLowerCase().includes(term),
        );
        return has ? r : null;
      }),
    );
    nearby = enriched.filter(Boolean);
    console.log('[AI][nearby] after foodType filter', {
      foodType: term,
      count: nearby.length,
      sample: nearby.slice(0, 3).map((x) => x.name),
    });
  }

  // Ranking: distance asc, then rating desc
  nearby.sort((a, b) => {
    if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    const ra = a.rating || 0;
    const rb = b.rating || 0;
    return rb - ra;
  });

  // Enrich for LLM: priceCategory + openNow + short description
  const enrichedForLlm = await Promise.all(
    nearby.slice(0, 5).map(async (r) => {
      const details = await fetchRestaurantDetails(r.id);
      const openNow = computeOpenNow(
        details?.openingHours,
        details?.customWorkingDays,
      );
      const priceLabel = details?.priceCategory
        ? { hr: details.priceCategory.nameHr, en: details.priceCategory.nameEn }
        : null;
      const descShort =
        lang === 'hr' ? details?.description?.hr : details?.description?.en;
      return {
        id: r.id,
        name: r.name,
        distanceKm: r.distanceKm,
        rating: r.rating || null,
        priceCategory: priceLabel,
        openNow,
        address: details?.address || null,
        place: details?.place || null,
        description: descShort || '',
      };
    }),
  );

  // Clearer fallback when no matches
  let fallbackNearby = '';

  console.log('[AI][nearby] final', {
    count: enrichedForLlm.length,
    names: enrichedForLlm.slice(0, 5).map((x) => x.name),
  });

  const textOut = await generateNaturalReply({
    lang,
    intent: 'nearby',
    question: text || 'nearby',
    data: { nearby: enrichedForLlm, filters: filters || null },
    fallback: fallbackNearby,
  });
  return { text: textOut, restaurantId: null };
}

function stripDiacritics(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s"']/gi, ' ')
    .toLowerCase();
}

function extractMenuSearchTerm(question, opts = {}) {
  const clean = stripDiacritics(question);
  // 1) Quoted term has priority
  const quoted = /"([^"]{2,60})"|'([^']{2,60})'/.exec(clean);
  if (quoted) return (quoted[1] || quoted[2] || '').trim();

  // 2) Remove common prefixes and helper phrases
  let t = clean
    .replace(/^\s*da[,\s]+/, '')
    .replace(
      /.*(imaju li|ima li|da li imaju|da li ima|jel imaju|jeli imaju|do you have|do they have|have you got|looking for|trazim|trazim|tražim|ima|imaju)\s+/i,
      '',
    )
    .replace(/\?+.*/, '')
    .trim();

  // 2a) Remove restaurant words if provided
  const restaurantName = opts.restaurantName
    ? stripDiacritics(opts.restaurantName)
    : '';
  const restaurantSlug = opts.restaurantSlug
    ? stripDiacritics(opts.restaurantSlug.replace(/-/g, ' '))
    : '';
  const generic = /(restoran|restaurant|kafi[cć]|caffe|bar|pizzeria|kavana)/g;
  t = t.replace(generic, ' ');
  if (restaurantName) {
    const nameTokens = restaurantName.split(/\s+/).filter(Boolean);
    for (const tok of nameTokens) {
      t = t.replace(new RegExp(`\\b${tok}\\b`, 'g'), ' ');
    }
  }
  if (restaurantSlug) {
    const slugTokens = restaurantSlug.split(/\s+/).filter(Boolean);
    for (const tok of slugTokens) {
      t = t.replace(new RegExp(`\\b${tok}\\b`, 'g'), ' ');
    }
  }
  t = t.replace(/\s+/g, ' ').trim();

  // 2b) If contains obvious food roots like pizza/piz/pica, return that root
  const pizzaMatch = /(pizza|piz+\w*|pica|pice)/i.exec(t);
  if (pizzaMatch) return pizzaMatch[1];

  // 3) If still long, take last 1-3 tokens that look like a dish
  if (!t || t.length < 2) return '';
  const tokens = t.split(/\s+/).filter(Boolean);
  if (tokens.length > 3) t = tokens.slice(-3).join(' ');
  return t.trim();
}

async function handleMenuSearch({
  lang,
  question,
  menuTerm,
  restaurantQuery,
  preferRestaurantId,
}) {
  // Resolve restaurant scope: prefer thread context, otherwise from question/router
  let restaurantForScope = null;
  let restaurantIdForScope = preferRestaurantId || null;
  if (!restaurantIdForScope) {
    const { match } = await resolveRestaurantFromText(
      restaurantQuery || question,
      null,
    );
    if (match?.id) restaurantIdForScope = match.id;
  }
  if (restaurantIdForScope) {
    restaurantForScope = await fetchRestaurantDetails(restaurantIdForScope);
  }

  function isMostExpensiveQuery(text = '') {
    const t = (text || '').toLowerCase();
    return /najskuplj|najskup|most\s+expensive|highest\s+price|najvi[sš]e\s+ko[sš]ta/.test(
      t,
    );
  }

  const askMax = isMostExpensiveQuery(question);
  if (restaurantIdForScope && askMax) {
    const { maxPrice, items } = await findMostExpensiveItemsForRestaurant(
      restaurantIdForScope,
      lang,
    );
    const r =
      restaurantForScope ||
      (await fetchRestaurantDetails(restaurantIdForScope));
    const textMax = await generateNaturalReply({
      lang,
      intent: 'menu_search',
      question,
      data: {
        restaurant: { id: r?.id, name: r?.name },
        items: (items || []).map((x) => ({ name: x.name, price: x.price })),
        maxPrice: maxPrice ?? null,
        isMaxPriceQuery: true,
      },
      fallback: '',
    });
    return { text: textMax, restaurantId: r?.id || null };
  }

  // Extract term: prefer LLM-provided canonical term, else derive from question
  let term = (menuTerm || '').trim();
  if (!term) {
    term = extractMenuSearchTerm(question || '', {
      restaurantName: restaurantForScope?.name,
      restaurantSlug: restaurantForScope?.slug,
    });
  }
  if (!term) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'menu_search',
      question,
      data: { items: [], clarify: true },
      fallback: '',
    });
    return { text: textOut, restaurantId: restaurantIdForScope || null };
  }

  const askedGlobal = isGlobalQuery(question);
  // If we have a restaurant in scope and not asking global, restrict to that restaurant
  if (restaurantIdForScope && !askedGlobal) {
    const scoped = await searchMenuForRestaurant(restaurantIdForScope, term);
    const r =
      restaurantForScope ||
      (await fetchRestaurantDetails(restaurantIdForScope));
    if (scoped && scoped.length > 0) {
      const textScoped = await generateNaturalReply({
        lang,
        intent: 'menu_search',
        question,
        data: { items: scoped, restaurant: { id: r?.id, name: r?.name } },
        fallback: '',
      });
      return { text: textScoped, restaurantId: r?.id || null };
    }
    const textNf = await generateNaturalReply({
      lang,
      intent: 'menu_search',
      question,
      data: {
        items: [],
        restaurant: { id: r?.id, name: r?.name },
        notFoundInThisRestaurant: true,
        term,
      },
      fallback: '',
    });
    return { text: textNf, restaurantId: r?.id || null };
  }

  // Otherwise search across all partners
  const results = await searchMenuAcrossRestaurants(term);
  if (!results || results.length === 0) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'menu_search',
      question,
      data: { items: [], term },
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const unique = [];
  const seen = new Set();
  for (const r of results) {
    const key = `${r.restaurant.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
    if (unique.length >= 3) break;
  }

  const withPrice = await Promise.all(
    unique.map(async (r) => {
      const details = await fetchRestaurantDetails(r.restaurant.id);
      const priceLabel = details?.priceCategory
        ? { hr: details.priceCategory.nameHr, en: details.priceCategory.nameEn }
        : null;
      return {
        restaurant: { id: r.restaurant.id, name: r.restaurant.name },
        item: r.name,
        priceCategory: priceLabel,
      };
    }),
  );

  const textGlobal = await generateNaturalReply({
    lang,
    intent: 'menu_search',
    question,
    data: { items: withPrice },
    fallback: '',
  });
  return {
    text: textGlobal,
    restaurantId: null,
  };
}

async function handlePerks({
  lang,
  text,
  restaurantQuery,
  preferRestaurantId,
}) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(
    restaurantQuery || text,
    preferRestaurantId,
  );
  let restaurantBasic = resolved;
  if (!restaurantBasic) {
    const nameOrSlug = extractRestaurantNameOrSlug(text);
    restaurantBasic = await resolveRestaurantByName(nameOrSlug);
  }
  if (!restaurantBasic) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'perks',
      question: text,
      data: {
        clarify: true,
        candidates: (candidates || []).map((c) => ({ id: c.id, name: c.name })),
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const restaurant = await fetchRestaurantDetails(restaurantBasic.id);
  if (!restaurant) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'perks',
      question: text,
      data: {},
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const { establishmentPerks } = await fetchTypesForRestaurant(restaurant);
  if (!establishmentPerks || establishmentPerks.length === 0) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'perks',
      question: text,
      data: { restaurant: { name: restaurant.name }, perks: [] },
      fallback: '',
    });
    return { text: textOut, restaurantId: restaurant.id };
  }
  const target = (text || '').toLowerCase();
  const perkMatch = establishmentPerks.find((p) => {
    const name = (lang === 'hr' ? p.nameHr : p.nameEn).toLowerCase();
    return target.includes(lang === 'hr' ? 'terasa' : 'terrace')
      ? name.includes(lang === 'hr' ? 'terasa' : 'terrace')
      : false || target.includes(name);
  });
  const textOut = await generateNaturalReply({
    lang,
    intent: 'perks',
    question: text,
    data: {
      restaurant: { id: restaurant.id, name: restaurant.name },
      perk: perkMatch || null,
      perks: establishmentPerks,
    },
    fallback: '',
  });
  return { text: textOut, restaurantId: restaurant.id };
}

async function handleMealTypes({
  lang,
  text,
  restaurantQuery,
  preferRestaurantId,
}) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(
    restaurantQuery || text,
    preferRestaurantId,
  );
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'meal_types',
      question: text,
      data: {
        clarify: true,
        candidates: (candidates || []).map((c) => ({ id: c.id, name: c.name })),
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const restaurant = await fetchRestaurantDetails(rBasic.id);
  if (!restaurant) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'meal_types',
      question: text,
      data: {},
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const { mealTypes } = await fetchTypesForRestaurant(restaurant);
  if (!mealTypes || mealTypes.length === 0) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'meal_types',
      question: text,
      data: { restaurant: { name: restaurant.name }, mealTypes: [] },
      fallback: '',
    });
    return { text: textOut, restaurantId: restaurant.id };
  }
  const names = mealTypes.map((m) => (lang === 'hr' ? m.nameHr : m.nameEn));
  const textOut2 = await generateNaturalReply({
    lang,
    intent: 'meal_types',
    question: text,
    data: { restaurant: { name: restaurant.name }, mealTypes: names },
    fallback: '',
  });
  return { text: textOut2, restaurantId: restaurant.id };
}

async function handleDietaryTypes({
  lang,
  text,
  restaurantQuery,
  preferRestaurantId,
}) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(
    restaurantQuery || text,
    preferRestaurantId,
  );
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'dietary_types',
      question: text,
      data: {
        clarify: true,
        candidates: (candidates || []).map((c) => ({ id: c.id, name: c.name })),
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const restaurant = await fetchRestaurantDetails(rBasic.id);
  if (!restaurant) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'dietary_types',
      question: text,
      data: {},
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const { dietaryTypes } = await fetchTypesForRestaurant(restaurant);
  if (!dietaryTypes || dietaryTypes.length === 0) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'dietary_types',
      question: text,
      data: { restaurant: { name: restaurant.name }, dietaryTypes: [] },
      fallback: '',
    });
    return { text: textOut, restaurantId: restaurant.id };
  }
  const names = dietaryTypes.map((m) => (lang === 'hr' ? m.nameHr : m.nameEn));
  const textOut3 = await generateNaturalReply({
    lang,
    intent: 'dietary_types',
    question: text,
    data: { restaurant: { name: restaurant.name }, dietaryTypes: names },
    fallback: '',
  });
  return { text: textOut3, restaurantId: restaurant.id };
}

async function handleReservations({
  lang,
  text,
  restaurantQuery,
  preferRestaurantId,
}) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(
    restaurantQuery || text,
    preferRestaurantId,
  );
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'reservations',
      question: text,
      data: {
        clarify: true,
        candidates: (candidates || []).map((c) => ({ id: c.id, name: c.name })),
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const restaurant = await fetchRestaurantDetails(rBasic.id);
  if (!restaurant) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'reservations',
      question: text,
      data: {},
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const textOut4 = await generateNaturalReply({
    lang,
    intent: 'reservations',
    question: text,
    data: {
      restaurant: { name: restaurant.name },
      reservationEnabled: !!restaurant.reservationEnabled,
    },
    fallback: '',
  });
  return { text: textOut4, restaurantId: restaurant.id };
}

async function handleContact({
  lang,
  text,
  restaurantQuery,
  preferRestaurantId,
}) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(
    restaurantQuery || text,
    preferRestaurantId,
  );
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'contact',
      question: text,
      data: {
        clarify: true,
        candidates: (candidates || []).map((c) => ({ id: c.id, name: c.name })),
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const r = await fetchRestaurantDetails(rBasic.id);
  if (!r) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'contact',
      question: text,
      data: {},
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const links = [];
  if (r.websiteUrl)
    links.push(
      lang === 'hr' ? `Web: ${r.websiteUrl}` : `Website: ${r.websiteUrl}`,
    );
  if (r.fbUrl) links.push(`Facebook: ${r.fbUrl}`);
  if (r.igUrl) links.push(`Instagram: ${r.igUrl}`);
  if (r.ttUrl) links.push(`TikTok: ${r.ttUrl}`);
  if (r.phone) links.push((lang === 'hr' ? 'Telefon: ' : 'Phone: ') + r.phone);
  if (r.email) links.push('Email: ' + r.email);
  const textOut5 = await generateNaturalReply({
    lang,
    intent: 'contact',
    question: text,
    data: { restaurant: { name: r.name }, links },
    fallback: '',
  });
  return { text: textOut5, restaurantId: r.id };
}

async function handleDescription({
  lang,
  text,
  restaurantQuery,
  preferRestaurantId,
}) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(
    restaurantQuery || text,
    preferRestaurantId,
  );
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'description',
      question: text,
      data: {
        clarify: true,
        candidates: (candidates || []).map((c) => ({ id: c.id, name: c.name })),
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  // getFullRestaurantDetails composes description from translations; fetch basic then fallback fields
  const { Restaurant, RestaurantTranslation } = require('../../models');
  const { Op } = require('sequelize');
  const r = await Restaurant.findOne({
    where: { id: rBasic.id },
    include: [{ model: RestaurantTranslation, as: 'translations' }],
    attributes: ['id', 'name'],
  });
  if (!r) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'description',
      question: text,
      data: {},
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const t = (r.translations || []).find((x) => x.language === lang);
  const desc = t?.description || '';
  const textOut6 = await generateNaturalReply({
    lang,
    intent: 'description',
    question: text,
    data: { restaurant: { name: r.name }, description: desc },
    fallback: '',
  });
  return { text: textOut6, restaurantId: r.id };
}

async function handleVirtualTour({
  lang,
  text,
  restaurantQuery,
  preferRestaurantId,
}) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(
    restaurantQuery || text,
    preferRestaurantId,
  );
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'virtual_tour',
      question: text,
      data: {
        clarify: true,
        candidates: (candidates || []).map((c) => ({ id: c.id, name: c.name })),
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const r = await fetchRestaurantDetails(rBasic.id);
  const has = !!(r && r.virtualTourUrl);
  const textOut7 = await generateNaturalReply({
    lang,
    intent: 'virtual_tour',
    question: text,
    data: {
      restaurant: { name: r?.name },
      virtualTourUrl: r?.virtualTourUrl || null,
    },
    fallback: '',
  });
  return { text: textOut7, restaurantId: r?.id || null };
}

async function handlePrice({
  lang,
  text,
  restaurantQuery,
  preferRestaurantId,
}) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(
    restaurantQuery || text,
    preferRestaurantId,
  );
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'price',
      question: text,
      data: {
        clarify: true,
        candidates: (candidates || []).map((c) => ({ id: c.id, name: c.name })),
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const r = await fetchRestaurantDetails(rBasic.id);
  const textOut8 = await generateNaturalReply({
    lang,
    intent: 'price',
    question: text,
    data: {
      restaurant: { name: r?.name },
      priceCategory: r?.priceCategory || null,
    },
    fallback: '',
  });
  return { text: textOut8, restaurantId: r?.id || null };
}

async function handleReviews({
  lang,
  text,
  restaurantQuery,
  preferRestaurantId,
}) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(
    restaurantQuery || text,
    preferRestaurantId,
  );
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'reviews',
      question: text,
      data: {
        clarify: true,
        candidates: (candidates || []).map((c) => ({ id: c.id, name: c.name })),
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }
  const summary = await fetchReviewsSummary(rBasic.id);
  if (!summary || summary.totalReviews === 0) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'reviews',
      question: text,
      data: { reviews: [], totalReviews: 0 },
      fallback: '',
    });
    return { text: textOut, restaurantId: rBasic.id };
  }
  const { ratings, totalReviews } = summary;
  const textOut9 = await generateNaturalReply({
    lang,
    intent: 'reviews',
    question: text,
    data: { ratings, totalReviews },
    fallback: '',
  });
  return { text: textOut9, restaurantId: rBasic.id };
}

async function handleDataProvenance({ lang, text }) {
  return generateNaturalReply({
    lang,
    intent: 'data_provenance',
    question: text,
    data: {
      sources: [
        'Dinver database (partner restaurants: isClaimed=true)',
        'Restaurant model fields (address, place, hours, types, perks, priceCategory, social)',
        'Menus & Drinks (MenuItemTranslations/DrinkItemTranslations mapped to restaurantId)',
        'Opening hours with customWorkingDays overrides',
      ],
    },
    fallback:
      lang === 'hr'
        ? 'AI koristi Dinver bazu i podatke partner restorana (jelovnici, radno vrijeme, tipovi, pogodnosti).'
        : "AI uses Dinver's database and partner data (menus, hours, types, perks).",
  });
}

const ctxStore = require('./contextStore');

async function chatAgent(input) {
  const { message, language, latitude, longitude, radiusKm, threadId } = input;
  const lang = detectLanguage(message, language);
  // Delegate intent inference to LLM. If router fails, fall back to simple classifier.
  let { intent, restaurantQuery, filters, menuTerm } = await inferIntent({
    lang,
    message,
  });
  if (!intent) intent = classifyIntent(message, lang);

  // Load prior context if any
  const ctx = threadId ? ctxStore.get(threadId) : null;
  // If context contains lastRestaurantId, prefer it when matching
  let lastRestaurantId = ctx?.lastRestaurantId;

  // Scoped-by-default behavior
  const scopedByContext = !!ctx?.lastRestaurantId;
  const globalSignal = isGlobalQuery(message);
  let preferId = scopedByContext && !globalSignal ? ctx.lastRestaurantId : null;

  function saveContextMaybe(reply, thread) {
    if (!thread) return;
    const rid = reply && typeof reply === 'object' ? reply.restaurantId : null;
    if (rid) {
      const prev = ctxStore.get(thread) || {};
      ctxStore.set(thread, { ...prev, lastRestaurantId: rid });
    }
  }

  switch (intent) {
    case 'hours': {
      const reply = await handleHours({
        lang,
        text: message,
        restaurantQuery,
        preferRestaurantId: preferId,
      });
      saveContextMaybe(reply, threadId);
      return reply.text || reply;
    }
    case 'nearby': {
      const reply = await handleNearby({
        lang,
        latitude,
        longitude,
        radiusKm,
        filters,
        text: message,
      });
      saveContextMaybe(reply, threadId);
      return reply.text || reply;
    }
    case 'menu_search': {
      const reply = await handleMenuSearch({
        lang,
        question: message,
        menuTerm,
        restaurantQuery,
        preferRestaurantId: preferId,
      });
      saveContextMaybe(reply, threadId);
      return reply.text || reply;
    }
    case 'perks': {
      const reply = await handlePerks({
        lang,
        text: message,
        restaurantQuery,
        preferRestaurantId: preferId,
      });
      saveContextMaybe(reply, threadId);
      return reply.text || reply;
    }
    case 'meal_types': {
      const reply = await handleMealTypes({
        lang,
        text: message,
        restaurantQuery,
        preferRestaurantId: preferId,
      });
      saveContextMaybe(reply, threadId);
      return reply.text || reply;
    }
    case 'dietary_types': {
      const reply = await handleDietaryTypes({
        lang,
        text: message,
        restaurantQuery,
        preferRestaurantId: preferId,
      });
      saveContextMaybe(reply, threadId);
      return reply.text || reply;
    }
    case 'reservations': {
      const reply = await handleReservations({
        lang,
        text: message,
        restaurantQuery,
        preferRestaurantId: preferId,
      });
      saveContextMaybe(reply, threadId);
      return reply.text || reply;
    }
    case 'contact': {
      const reply = await handleContact({
        lang,
        text: message,
        restaurantQuery,
        preferRestaurantId: preferId,
      });
      saveContextMaybe(reply, threadId);
      return reply.text || reply;
    }
    case 'description': {
      const reply = await handleDescription({
        lang,
        text: message,
        restaurantQuery,
        preferRestaurantId: preferId,
      });
      saveContextMaybe(reply, threadId);
      return reply.text || reply;
    }
    case 'virtual_tour': {
      const reply = await handleVirtualTour({
        lang,
        text: message,
        restaurantQuery,
        preferRestaurantId: preferId,
      });
      saveContextMaybe(reply, threadId);
      return reply.text || reply;
    }
    case 'price': {
      const reply = await handlePrice({
        lang,
        text: message,
        restaurantQuery,
        preferRestaurantId: preferId,
      });
      saveContextMaybe(reply, threadId);
      return reply.text || reply;
    }
    case 'reviews': {
      const reply = await handleReviews({
        lang,
        text: message,
        restaurantQuery,
        preferRestaurantId: preferId,
      });
      saveContextMaybe(reply, threadId);
      return reply.text || reply;
    }
    case 'data_provenance':
      return handleDataProvenance({ lang, text: message });
    default:
      // No predefined phrase; let LLM craft a natural, scoped reply.
      return generateNaturalReply({
        lang,
        intent: 'out_of_scope',
        question: message,
        data: {},
        fallback: '',
      });
  }
}

module.exports = { chatAgent };
