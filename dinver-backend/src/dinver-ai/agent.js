'use strict';
const { detectLanguage } = require('./language');
const {
  classifyIntent,
  extractIntentsFromText,
  hasMenuKeywords,
  hasPerksKeywords,
  hasNearbyKeywords,
} = require('./intentClassifier');
const { inferIntent } = require('./llmRouter');
const { getMediaUrl } = require('../../config/cdn');
const {
  fetchRestaurantDetails,
  searchMenuAcrossRestaurants,
  searchMenuForRestaurant,
  fetchAllMenuItemsForRestaurant,
  findNearbyPartners,
  fetchTypesForRestaurant,
  fetchReviewsSummary,
  fetchPartnersBasic,
  resolvePerkIdByName,
  findMostExpensiveItemsForRestaurant,
  findCheapestItemsForRestaurant,
  getRestaurantOfferings,
} = require('./dataAccess');
// (formatters no longer used for replies; LLM crafts all natural text)
const { generateNaturalReply } = require('./llm');
const { logAiInteraction } = require('../utils/metrics');
const {
  logIntentClassification,
  logMenuSearch,
  logContextUpdate,
  logError,
  logPerformance,
} = require('../utils/aiLogger');

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
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const zagreb = new Date(utc + 2 * 3600000); // UTC+2
  return zagreb;
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
    if (t.includes(key)) {
      return map[key];
    }
  }

  // Default to today
  const jsDay = getZagrebNow().getDay();
  const mon0 = jsDayToMon0(jsDay);
  return mon0;
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

  const firstCondition =
    !restaurant || !restaurant.openingHours || !restaurant.openingHours.periods;

  if (firstCondition) {
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

  // Check if we have no data at all
  const noDataCondition = !period || !period.open || !period.close;

  if (noDataCondition) {
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

  // Check if restaurant is closed (empty time strings)
  const isClosed = period.open.time === '' || period.close.time === '';

  if (isClosed) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'hours',
      question: text,
      data: {
        restaurant: { id: restaurant.id, name: restaurant.name },
        restaurantName: restaurant.name,
        dayIndex,
        open: period.open,
        close: period.close,
        openNow: computeOpenNow(restaurant.openingHours),
        isClosed: true,
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
        thumbnailUrl: details?.thumbnailUrl
          ? getMediaUrl(details.thumbnailUrl, 'image')
          : null,
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
  const restaurants = enrichedForLlm.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    place: r.place,
    thumbnailUrl: r.thumbnailUrl ? getMediaUrl(r.thumbnailUrl, 'image') : null,
    distance: r.distanceKm,
  }));
  return { text: textOut, restaurantId: null, restaurants };
}

function stripDiacritics(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s"']/gi, ' ')
    .toLowerCase();
}

function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Ukloni dijakritike
    .replace(/[^\w\s]/g, '') // Ukloni interpunkciju
    .trim();
}

function extractMenuSearchTerm(question, opts = {}) {
  console.log('[DEBUG] extractMenuSearchTerm called with:', { question, opts });
  const clean = stripDiacritics(question);
  console.log('[DEBUG] Clean question:', clean);
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

  // 2c) Remove general menu terms that shouldn't be searched
  const generalMenuTerms =
    /^(ponuda|ponud|jelovnik|meni|menu|sta ima|sto ima|šta ima|što ima|sta nudi|sto nudi|šta nudi|što nudi|nudi|nudite|nude|ima|imate|imaju|what.*have|what.*offer|what.*serve)$/i;
  if (generalMenuTerms.test(t)) {
    console.log('[DEBUG] Detected general menu query, returning empty term');
    return '';
  }

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

  // 2d) After removing restaurant words, if the text is a generic menu phrase, treat as general query
  const generalMenuStarts =
    /^(sta nudi|sto nudi|što nudi|šta nudi|sta ima|sto ima|što ima|šta ima|u ponudi|ponuda|jelovnik|meni|menu|what.*(serve|offer|have))/i;
  if (generalMenuStarts.test(t)) {
    console.log(
      '[DEBUG] General menu phrase after cleanup, returning empty term',
    );
    return '';
  }

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
  threadId,
}) {
  console.log('[DEBUG] Enhanced menu search:', {
    question,
    menuTerm,
    restaurantQuery,
    preferRestaurantId,
    threadId,
  });

  const startTime = Date.now();

  // Ako nema menuTerm, provjeri je li general menu query
  if (!menuTerm || menuTerm === '') {
    const generalMenuPatterns = [
      /ponud[au]?/i,
      /jelovnik/i,
      /meni/i,
      /št[ao] nudi/i,
      /što ima/i,
      /menu/i,
      /what.*serve/i,
      /what.*offer/i,
    ];

    const isGeneralMenu = generalMenuPatterns.some((p) => p.test(question));

    if (isGeneralMenu && preferRestaurantId) {
      // Dohvati random sample iz menija
      const samples = await fetchAllMenuItemsForRestaurant(
        preferRestaurantId,
        lang,
        10,
      );

      const restaurant = await fetchRestaurantDetails(preferRestaurantId);

      const reply = await generateNaturalReply({
        lang,
        intent: 'menu_search',
        question,
        data: {
          items: samples,
          restaurant: { id: restaurant.id, name: restaurant.name },
          isGeneralMenu: true,
        },
        fallback: '',
      });

      updateContext(threadId, {
        restaurantId: preferRestaurantId,
        intent: 'menu_search',
      });

      return { text: reply, restaurantId: preferRestaurantId };
    }
  }

  // Ako imamo menuTerm, normaliziraj ga
  if (menuTerm) {
    // Kanonski oblik za česte termine
    const canonicalForms = {
      pizzu: 'pizza',
      pizze: 'pizza',
      picu: 'pizza',
      pice: 'pizza',
      burgere: 'burger',
      hamburgere: 'burger',
      cevape: 'cevap',
      ćevape: 'cevap',
      lazanje: 'lazanja',
    };

    const normalized = normalizeText(menuTerm);
    menuTerm = canonicalForms[normalized] || menuTerm;
  }

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
  console.log('[DEBUG] Initial term from menuTerm:', term);
  if (!term) {
    term = extractMenuSearchTerm(question || '', {
      restaurantName: restaurantForScope?.name,
      restaurantSlug: restaurantForScope?.slug,
    });
    console.log('[DEBUG] Extracted term from question:', term);
  }
  if (!term) {
    // Check if this is a general menu request (asking about "ponuda", "jelovnik", etc.)
    const isGeneralMenuQuery = (text = '') => {
      const t = (text || '').toLowerCase();
      return /(ponuda|ponud|jelovnik|meni|menu|sta ima|sto ima|što ima|šta ima|sta nudi|sto nudi|što nudi|šta nudi|nudi|nudite|nude|what.*have|what.*offer|what.*serve)/.test(
        t,
      );
    };

    console.log('[DEBUG] No term found, checking general menu query');
    console.log('[DEBUG] Question:', question);
    console.log('[DEBUG] RestaurantIdForScope:', restaurantIdForScope);
    console.log('[DEBUG] IsGeneralMenuQuery:', isGeneralMenuQuery(question));

    if (isGeneralMenuQuery(question) && restaurantIdForScope) {
      const r =
        restaurantForScope ||
        (await fetchRestaurantDetails(restaurantIdForScope));

      const all = await fetchAllMenuItemsForRestaurant(
        restaurantIdForScope,
        lang,
        60,
      );
      if (all && all.length > 0) {
        const shuffled = all.slice().sort(() => Math.random() - 0.5);
        const sampleSize = Math.min(7, Math.max(5, Math.floor(all.length / 5)));
        const picks = shuffled.slice(0, sampleSize);
        const textOut = await generateNaturalReply({
          lang,
          intent: 'menu_search',
          question,
          data: {
            items: picks,
            restaurant: { id: r?.id, name: r?.name },
            isGeneralMenu: true,
          },
          fallback: '',
        });
        return { text: textOut, restaurantId: r?.id || null };
      }
    }

    const textOut = await generateNaturalReply({
      lang,
      intent: 'menu_search',
      question,
      data: { items: [], clarify: true },
      fallback: '',
    });
    return { text: textOut, restaurantId: restaurantIdForScope || null };
  }

  // If extracted term is actually a generic phrase (e.g., "u ponudi", "serve", "offer"),
  // treat it as a general menu request for the scoped restaurant
  const isGenericMenuTerm = (t = '') =>
    /^(u\s*ponudi|ponuda|ponud|jelovnik|meni|menu|serve|offer|have|nudi|nudite|nude|ima|imate|imaju)$/i.test(
      (t || '').trim(),
    );
  if (restaurantIdForScope && isGenericMenuTerm(term)) {
    const r =
      restaurantForScope ||
      (await fetchRestaurantDetails(restaurantIdForScope));
    const all = await fetchAllMenuItemsForRestaurant(
      restaurantIdForScope,
      lang,
      60,
    );
    if (all && all.length > 0) {
      const shuffled = all.slice().sort(() => Math.random() - 0.5);
      const sampleSize = Math.min(7, Math.max(5, Math.floor(all.length / 5)));
      const picks = shuffled.slice(0, sampleSize);
      const textOut = await generateNaturalReply({
        lang,
        intent: 'menu_search',
        question,
        data: {
          items: picks,
          restaurant: { id: r?.id, name: r?.name },
          isGeneralMenu: true,
        },
        fallback: '',
      });
      return { text: textOut, restaurantId: r?.id || null };
    }
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
      const items = scoped.map((it) => ({
        type: it.type,
        id: it.id,
        price: it.price ?? null,
        thumbnailUrl: it.thumbnailUrl || null,
        translations: it.translations || null,
        name: it.name || null,
        restaurantId: it.restaurantId || r?.id || null,
      }));
      return { text: textScoped, restaurantId: r?.id || null, items };
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
    return { text: textNf, restaurantId: r?.id || null, items: [] };
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

  const withDetails = unique.map((r) => ({
    restaurant: { id: r.restaurant.id, name: r.restaurant.name },
    type: r.type,
    item: r.item,
  }));

  const textGlobal = await generateNaturalReply({
    lang,
    intent: 'menu_search',
    question,
    data: { items: withDetails },
    fallback: '',
  });
  const restaurantIds = unique.map((x) => x.restaurant.id);
  const items = unique.map((r) => ({
    type: r.type,
    id: r.item?.id || null,
    price: r.item?.price ?? null,
    thumbnailUrl: r.item?.thumbnailUrl
      ? getMediaUrl(r.item.thumbnailUrl, 'image')
      : null,
    translations: r.item?.translations || null,
    name: r.item?.translations
      ? lang === 'hr'
        ? r.item.translations.hr?.name
        : r.item.translations.en?.name
      : r.item?.name || null,
    restaurantId: r.restaurant.id,
  }));
  const restaurants = unique.map((r) => ({
    id: r.restaurant.id,
    name: r.restaurant.name,
    place: r.restaurant.place || null,
    address: null,
    thumbnailUrl: null,
    distance: null,
  }));
  const duration = Date.now() - startTime;
  logPerformance('handleMenuSearch', duration, {
    term: menuTerm,
    restaurantId: preferRestaurantId,
    resultsCount: items.length,
  });

  return { text: textGlobal, restaurantId: null, restaurants, items };
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
  // In per-restaurant chat, preferRestaurantId is forced. Use it directly when present.
  if (preferRestaurantId) {
    const details = await fetchRestaurantDetails(preferRestaurantId);
    if (details) {
      const types = await fetchTypesForRestaurant(details);
      const priceLabel = details?.priceCategory
        ? { hr: details.priceCategory.nameHr, en: details.priceCategory.nameEn }
        : null;
      const openNow = computeOpenNow(
        details?.openingHours,
        details?.customWorkingDays,
      );
      const descriptionText =
        (lang === 'hr' ? details?.description?.hr : details?.description?.en) ||
        '';
      const data = {
        singleRestaurantMode: true,
        restaurant: {
          id: details?.id,
          name: details?.name,
          address: details?.address || null,
          place: details?.place || null,
          thumbnailUrl: details?.thumbnailUrl
            ? getMediaUrl(details.thumbnailUrl, 'image')
            : null,
          openNow,
          priceCategory: priceLabel,
        },
        description: descriptionText,
        perks: (types?.establishmentPerks || []).map((p) => ({
          id: p.id,
          name: lang === 'hr' ? p.nameHr : p.nameEn,
        })),
        foodTypes: (types?.foodTypes || []).map((p) => ({
          id: p.id,
          name: lang === 'hr' ? p.nameHr : p.nameEn,
        })),
      };
      const textOut = await generateNaturalReply({
        lang,
        intent: 'description',
        question: text,
        data,
        fallback: '',
      });
      return { text: textOut, restaurantId: details.id };
    }
  }

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
        singleRestaurantMode: true,
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }

  // Fetch rich details and build an overview payload
  const details = await fetchRestaurantDetails(rBasic.id);
  const types = details ? await fetchTypesForRestaurant(details) : null;
  const priceLabel = details?.priceCategory
    ? { hr: details.priceCategory.nameHr, en: details.priceCategory.nameEn }
    : null;
  const openNow = computeOpenNow(
    details?.openingHours,
    details?.customWorkingDays,
  );
  const descriptionText =
    (lang === 'hr' ? details?.description?.hr : details?.description?.en) || '';

  const data = {
    singleRestaurantMode: true,
    restaurant: {
      id: details?.id,
      name: details?.name,
      address: details?.address || null,
      place: details?.place || null,
      thumbnailUrl: details?.thumbnailUrl || null,
      openNow,
      priceCategory: priceLabel,
    },
    description: descriptionText,
    perks:
      types?.establishmentPerks?.map((p) => ({
        id: p.id,
        name: lang === 'hr' ? p.nameHr : p.nameEn,
      })) || [],
    foodTypes:
      types?.foodTypes?.map((p) => ({
        id: p.id,
        name: lang === 'hr' ? p.nameHr : p.nameEn,
      })) || [],
  };

  const textOut6 = await generateNaturalReply({
    lang,
    intent: 'description',
    question: text,
    data,
    fallback: '',
  });
  return { text: textOut6, restaurantId: details?.id || null };
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

// NEW: Handle "what_offers" intent
async function handleWhatOffers({
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
      intent: 'what_offers',
      question: text,
      data: {
        clarify: true,
        candidates: (candidates || []).map((c) => ({ id: c.id, name: c.name })),
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: null };
  }

  const offerings = await getRestaurantOfferings(restaurantBasic.id, lang);
  if (!offerings) {
    const textOut = await generateNaturalReply({
      lang,
      intent: 'what_offers',
      question: text,
      data: {
        restaurant: { id: restaurantBasic.id, name: restaurantBasic.name },
        noData: true,
      },
      fallback: '',
    });
    return { text: textOut, restaurantId: restaurantBasic.id };
  }

  const textOut = await generateNaturalReply({
    lang,
    intent: 'what_offers',
    question: text,
    data: offerings,
    fallback: '',
  });
  return { text: textOut, restaurantId: restaurantBasic.id };
}

// NEW: Handle "combined_search" intent (multiple criteria)
async function handleCombinedSearch({
  lang,
  text,
  latitude,
  longitude,
  radiusKm,
}) {
  const intents = extractIntentsFromText(text, lang);
  console.log('[AI][combined_search] Detected intents:', intents);

  const hasNearby = hasNearbyKeywords(text, lang);
  const hasMenu = hasMenuKeywords(text, lang);
  const hasPerks = hasPerksKeywords(text, lang);

  // Start with nearby restaurants if location criteria
  let restaurants = [];
  if (hasNearby && latitude && longitude) {
    restaurants = await findNearbyPartners({
      latitude,
      longitude,
      radiusKm: radiusKm || 5,
      limit: 20,
    });
  } else {
    // Get all partners if no location
    const partners = await fetchPartnersBasic();
    restaurants = partners.slice(0, 20);
  }

  // Filter by menu items if menu search
  if (hasMenu) {
    const menuTerms = extractMenuTerms(text);
    if (menuTerms.length > 0) {
      const menuResults = await searchMenuAcrossRestaurants(menuTerms[0]);
      const restaurantIdsWithMenu = new Set(
        menuResults.map((m) => m.restaurantId),
      );
      restaurants = restaurants.filter((r) => restaurantIdsWithMenu.has(r.id));
    }
  }

  // Filter by perks if perk criteria
  if (hasPerks) {
    const perkTerms = extractPerkTerms(text);
    if (perkTerms.length > 0) {
      const resolved = await resolvePerkIdByName(perkTerms[0]);
      if (resolved?.id) {
        const enriched = await Promise.all(
          restaurants.map(async (r) => {
            const details = await fetchRestaurantDetails(r.id);
            if (!details) return null;
            const has = Array.isArray(details.establishmentPerks)
              ? details.establishmentPerks.includes(resolved.id)
              : false;
            return has ? r : null;
          }),
        );
        restaurants = enriched.filter(Boolean);
      }
    }
  }

  const textOut = await generateNaturalReply({
    lang,
    intent: 'combined_search',
    question: text,
    data: {
      restaurants: restaurants.slice(0, 5), // Limit to top 5
      searchCriteria: {
        hasNearby,
        hasMenu,
        hasPerks,
        menuTerms: hasMenu ? extractMenuTerms(text) : [],
        perkTerms: hasPerks ? extractPerkTerms(text) : [],
      },
    },
    fallback: '',
  });
  return { text: textOut, restaurantId: null };
}

// Helper functions for combined search
function extractMenuTerms(text) {
  const t = text.toLowerCase();
  const foodWords = [
    'pizza',
    'burger',
    'pasta',
    'salata',
    'lazanje',
    'biftek',
    'piletina',
    'riba',
    'desert',
  ];
  return foodWords.filter((word) => t.includes(word));
}

function extractPerkTerms(text) {
  const t = text.toLowerCase();
  const perkWords = [
    'terasa',
    'parking',
    'stolica za djecu',
    'klimatiziran',
    'wi-fi',
  ];
  return perkWords.filter((word) => t.includes(word));
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
  const startTime = Date.now();

  const {
    message,
    language,
    latitude,
    longitude,
    radiusKm,
    threadId,
    forcedRestaurantId,
  } = input;

  const lang = detectLanguage(message, language);

  try {
    // Delegate intent inference to LLM. If router fails, fall back to simple classifier.
    let { intent, restaurantQuery, filters, menuTerm, confidence } =
      await inferIntent({
        lang,
        message,
      });
    if (!intent) intent = classifyIntent(message, lang);

    // Log intent classification
    logIntentClassification(
      message,
      intent,
      confidence || 1.0,
      restaurantQuery,
      menuTerm,
    );

    // Heuristic override: treat generic menu phrases as menu_search
    const msg = (message || '').toLowerCase();
    const genericMenuPhrase =
      /(u\s*ponudi|ponuda|jelovnik|meni|sta nudi|sto nudi|što nudi|šta nudi|sta ima|sto ima|što ima|šta ima|what do they (serve|offer|have)|what (do you|do they) (serve|offer|have))/;
    if (genericMenuPhrase.test(msg)) {
      intent = 'menu_search';
      // keep menuTerm as provided by router; general handling in handleMenuSearch will cover null/empty/gen terms
    }

    // Load prior context if any
    const ctx = threadId ? ctxStore.get(threadId) : null;
    // If context contains lastRestaurantId, prefer it when matching
    let lastRestaurantId = ctx?.lastRestaurantId;

    // Scoped-by-default behavior
    const scopedByContext = !!(forcedRestaurantId || ctx?.lastRestaurantId);
    const globalSignal = forcedRestaurantId ? false : isGlobalQuery(message);
    let preferId =
      forcedRestaurantId ||
      (scopedByContext && !globalSignal ? ctx.lastRestaurantId : null);

    function updateContext(threadId, data) {
      if (!threadId) return;
      const ctx = ctxStore.get(threadId) || {};

      // Pamti zadnjih 5 restorana spomenutih u razgovoru
      if (data.restaurantId) {
        ctx.restaurantHistory = ctx.restaurantHistory || [];
        if (!ctx.restaurantHistory.includes(data.restaurantId)) {
          ctx.restaurantHistory.unshift(data.restaurantId);
          ctx.restaurantHistory = ctx.restaurantHistory.slice(0, 5);
        }
        ctx.lastRestaurantId = data.restaurantId;
      }

      // Pamti zadnje pretražene termine
      if (data.searchTerm) {
        ctx.searchHistory = ctx.searchHistory || [];
        ctx.searchHistory.unshift(data.searchTerm);
        ctx.searchHistory = ctx.searchHistory.slice(0, 10);
      }

      // Pamti intent history za bolji flow
      if (data.intent) {
        ctx.intentHistory = ctx.intentHistory || [];
        ctx.intentHistory.unshift(data.intent);
        ctx.intentHistory = ctx.intentHistory.slice(0, 5);
      }

      ctxStore.set(threadId, ctx);
      logContextUpdate(threadId, data);
    }

    function saveContextMaybe(reply, thread) {
      if (!thread) return;
      const rid =
        reply && typeof reply === 'object' ? reply.restaurantId : null;
      if (rid) {
        updateContext(thread, { restaurantId: rid });
      }
    }

    // In single-restaurant mode, override intents that don't make sense globally
    if (forcedRestaurantId && intent === 'nearby') {
      intent = 'description';
    }

    switch (intent) {
      case 'menu_stats': {
        // Scoped by default; if not in scope, ask to specify restaurant via natural reply
        let restaurantIdForScope = preferId;
        if (!restaurantIdForScope) {
          const { match } = await resolveRestaurantFromText(
            restaurantQuery || message,
            null,
          );
          restaurantIdForScope = match?.id || null;
        }
        if (!restaurantIdForScope) {
          const textOut = await generateNaturalReply({
            lang,
            intent: 'menu_stats',
            question: message,
            data: { clarify: true },
            fallback: '',
          });
          return textOut;
        }
        const r = await fetchRestaurantDetails(restaurantIdForScope);
        // Decide max/cheapest from question
        const q = (message || '').toLowerCase();
        const wantMax =
          /najskuplj|najskup|most\s+expensive|highest\s+price/.test(q);
        const wantMin = /najjeftin|cheapest|lowest\s+price/.test(q);
        let payload;
        if (wantMin) {
          const { minPrice, items } = await findCheapestItemsForRestaurant(
            restaurantIdForScope,
            lang,
          );
          payload = {
            restaurant: { id: r?.id, name: r?.name },
            items,
            minPrice: minPrice ?? null,
            isMinPriceQuery: true,
          };
        } else {
          const { maxPrice, items } = await findMostExpensiveItemsForRestaurant(
            restaurantIdForScope,
            lang,
          );
          payload = {
            restaurant: { id: r?.id, name: r?.name },
            items,
            maxPrice: maxPrice ?? null,
            isMaxPriceQuery: true,
          };
        }
        const textStats = await generateNaturalReply({
          lang,
          intent: 'menu_stats',
          question: message,
          data: payload,
          fallback: '',
        });
        const reply = { text: textStats, restaurantId: r?.id || null };
        saveContextMaybe(reply, threadId);
        return reply;
      }
      case 'hours': {
        const t0 = Date.now();
        const reply = await handleHours({
          lang,
          text: message,
          restaurantQuery,
          preferRestaurantId: preferId,
        });
        saveContextMaybe(reply, threadId);
        logAiInteraction({
          intent: 'hours',
          message,
          lang,
          restaurantIdUsed: reply?.restaurantId || null,
          durationMs: Date.now() - t0,
          globalSignal,
          scopedByContext,
        });
        return reply;
      }
      case 'nearby': {
        const t0 = Date.now();
        const reply = await handleNearby({
          lang,
          latitude,
          longitude,
          radiusKm,
          filters,
          text: message,
        });
        saveContextMaybe(reply, threadId);
        logAiInteraction({
          intent: 'nearby',
          message,
          lang,
          restaurantIdUsed: null,
          durationMs: Date.now() - t0,
          globalSignal,
          scopedByContext,
        });
        return reply;
      }
      case 'menu_search': {
        console.log('[DEBUG] Calling handleMenuSearch with:', {
          message,
          menuTerm,
          restaurantQuery,
          preferId,
        });
        const t0 = Date.now();
        const reply = await handleMenuSearch({
          lang,
          question: message,
          menuTerm,
          restaurantQuery,
          preferRestaurantId: preferId,
        });
        saveContextMaybe(reply, threadId);
        logAiInteraction({
          intent: 'menu_search',
          message,
          lang,
          restaurantIdUsed: reply?.restaurantId || null,
          durationMs: Date.now() - t0,
          globalSignal,
          scopedByContext,
        });
        return reply;
      }
      case 'perks': {
        const t0 = Date.now();
        const reply = await handlePerks({
          lang,
          text: message,
          restaurantQuery,
          preferRestaurantId: preferId,
        });
        saveContextMaybe(reply, threadId);
        logAiInteraction({
          intent: 'perks',
          message,
          lang,
          restaurantIdUsed: reply?.restaurantId || null,
          durationMs: Date.now() - t0,
          globalSignal,
          scopedByContext,
        });
        return reply;
      }
      case 'meal_types': {
        const t0 = Date.now();
        const reply = await handleMealTypes({
          lang,
          text: message,
          restaurantQuery,
          preferRestaurantId: preferId,
        });
        saveContextMaybe(reply, threadId);
        logAiInteraction({
          intent: 'meal_types',
          message,
          lang,
          restaurantIdUsed: reply?.restaurantId || null,
          durationMs: Date.now() - t0,
          globalSignal,
          scopedByContext,
        });
        return reply;
      }
      case 'dietary_types': {
        const t0 = Date.now();
        const reply = await handleDietaryTypes({
          lang,
          text: message,
          restaurantQuery,
          preferRestaurantId: preferId,
        });
        saveContextMaybe(reply, threadId);
        logAiInteraction({
          intent: 'dietary_types',
          message,
          lang,
          restaurantIdUsed: reply?.restaurantId || null,
          durationMs: Date.now() - t0,
          globalSignal,
          scopedByContext,
        });
        return reply;
      }
      case 'reservations': {
        const t0 = Date.now();
        const reply = await handleReservations({
          lang,
          text: message,
          restaurantQuery,
          preferRestaurantId: preferId,
        });
        saveContextMaybe(reply, threadId);
        logAiInteraction({
          intent: 'reservations',
          message,
          lang,
          restaurantIdUsed: reply?.restaurantId || null,
          durationMs: Date.now() - t0,
          globalSignal,
          scopedByContext,
        });
        return reply;
      }
      case 'contact': {
        const t0 = Date.now();
        const reply = await handleContact({
          lang,
          text: message,
          restaurantQuery,
          preferRestaurantId: preferId,
        });
        saveContextMaybe(reply, threadId);
        logAiInteraction({
          intent: 'contact',
          message,
          lang,
          restaurantIdUsed: reply?.restaurantId || null,
          durationMs: Date.now() - t0,
          globalSignal,
          scopedByContext,
        });
        return reply;
      }
      case 'description': {
        const t0 = Date.now();
        const reply = await handleDescription({
          lang,
          text: message,
          restaurantQuery,
          preferRestaurantId: preferId,
        });
        saveContextMaybe(reply, threadId);
        logAiInteraction({
          intent: 'description',
          message,
          lang,
          restaurantIdUsed: reply?.restaurantId || null,
          durationMs: Date.now() - t0,
          globalSignal,
          scopedByContext,
        });
        return reply;
      }
      case 'virtual_tour': {
        const t0 = Date.now();
        const reply = await handleVirtualTour({
          lang,
          text: message,
          restaurantQuery,
          preferRestaurantId: preferId,
        });
        saveContextMaybe(reply, threadId);
        logAiInteraction({
          intent: 'virtual_tour',
          message,
          lang,
          restaurantIdUsed: reply?.restaurantId || null,
          durationMs: Date.now() - t0,
          globalSignal,
          scopedByContext,
        });
        return reply.text || reply;
      }
      case 'price': {
        const t0 = Date.now();
        const reply = await handlePrice({
          lang,
          text: message,
          restaurantQuery,
          preferRestaurantId: preferId,
        });
        saveContextMaybe(reply, threadId);
        logAiInteraction({
          intent: 'price',
          message,
          lang,
          restaurantIdUsed: reply?.restaurantId || null,
          durationMs: Date.now() - t0,
          globalSignal,
          scopedByContext,
        });
        return reply.text || reply;
      }
      case 'reviews': {
        const t0 = Date.now();
        const reply = await handleReviews({
          lang,
          text: message,
          restaurantQuery,
          preferRestaurantId: preferId,
        });
        saveContextMaybe(reply, threadId);
        logAiInteraction({
          intent: 'reviews',
          message,
          lang,
          restaurantIdUsed: reply?.restaurantId || null,
          durationMs: Date.now() - t0,
          globalSignal,
          scopedByContext,
        });
        return reply.text || reply;
      }
      case 'what_offers': {
        const t0 = Date.now();
        const reply = await handleWhatOffers({
          lang,
          text: message,
          restaurantQuery,
          preferRestaurantId: preferId,
        });
        saveContextMaybe(reply, threadId);
        logAiInteraction({
          intent: 'what_offers',
          message,
          lang,
          restaurantIdUsed: reply?.restaurantId || null,
          durationMs: Date.now() - t0,
          globalSignal,
          scopedByContext,
        });
        return reply;
      }
      case 'combined_search': {
        const t0 = Date.now();
        const reply = await handleCombinedSearch({
          lang,
          text: message,
          latitude,
          longitude,
          radiusKm,
        });
        saveContextMaybe(reply, threadId);
        logAiInteraction({
          intent: 'combined_search',
          message,
          lang,
          restaurantIdUsed: reply?.restaurantId || null,
          durationMs: Date.now() - t0,
          globalSignal,
          scopedByContext,
        });
        return reply;
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

    // Fallback return shouldn't happen; but log for diagnostics
    logAiInteraction({
      intent,
      message,
      lang,
      restaurantIdUsed: null,
      durationMs: null,
      note: 'fell through switch',
    });
    return generateNaturalReply({
      lang,
      intent: 'out_of_scope',
      question: message,
      data: {},
      fallback: '',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(error, {
      message,
      lang,
      threadId,
      duration,
    });

    // Return a safe fallback response
    return {
      text:
        lang === 'hr'
          ? 'Izvinjavam se, dogodila se greška. Molim pokušajte ponovno.'
          : 'Sorry, an error occurred. Please try again.',
      restaurantId: null,
    };
  }
}

module.exports = { chatAgent };
