'use strict';
const { detectLanguage } = require('./language');
const { classifyIntent } = require('./intentClassifier');
const {
  fetchRestaurantDetails,
  searchMenuAcrossRestaurants,
  findNearbyPartners,
  fetchTypesForRestaurant,
  fetchReviewsSummary,
  fetchPartnersBasic,
} = require('./dataAccess');
const {
  replyOutOfScope,
  replyNoData,
  formatHoursResponse,
  formatNearbyResponse,
} = require('./formatters');
const { generateNaturalReply } = require('./llm');

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

async function resolveRestaurantFromText(text) {
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
  if (!top || top.s < 0.5)
    return { match: null, candidates: scored.slice(0, 3).map((x) => x.p) };
  if (second && top.s - second.s < 0.2) {
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
  // Default: today (assuming Monday=0 .. Sunday=6)
  const jsDay = new Date().getDay(); // 0=Sunday
  return jsDay === 0 ? 6 : jsDay - 1;
}

async function handleHours({ lang, text }) {
  const { match, candidates } = await resolveRestaurantFromText(text);
  let restaurantBasic = match;
  if (!restaurantBasic) {
    const nameOrSlug = extractRestaurantNameOrSlug(text);
    restaurantBasic = await resolveRestaurantByName(nameOrSlug);
  }
  if (!restaurantBasic) {
    if (candidates && candidates.length > 0)
      return formatDisambiguation(candidates, lang);
    return lang === 'hr'
      ? 'Za koji restoran te zanima radno vrijeme?'
      : 'Which restaurant’s hours are you interested in?';
  }
  const restaurant = await fetchRestaurantDetails(restaurantBasic.id);
  if (
    !restaurant ||
    !restaurant.openingHours ||
    !restaurant.openingHours.periods
  ) {
    return lang === 'hr'
      ? 'Nemam podatke o radnom vremenu. Možeš nazvati restoran za provjeru.'
      : 'I do not have hours for this restaurant. Please call the restaurant to confirm.';
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
    return formatHoursResponse(lang, restaurant.name, dayIndex, null, null);
  }
  const fallbackHours = formatHoursResponse(
    lang,
    restaurant.name,
    dayIndex,
    period.open,
    period.close,
  );
  return generateNaturalReply({
    lang,
    intent: 'hours',
    question: text,
    data: {
      restaurant: { id: restaurant.id, name: restaurant.name },
      dayIndex,
      open: period.open,
      close: period.close,
    },
    fallback: fallbackHours,
  });
}

async function handleNearby({ lang, latitude, longitude, radiusKm }) {
  const nearby = await findNearbyPartners({
    latitude,
    longitude,
    radiusKm,
    limit: 5,
  });
  const fallbackNearby = formatNearbyResponse(lang, nearby);
  return generateNaturalReply({
    lang,
    intent: 'nearby',
    question: 'nearby',
    data: { nearby },
    fallback: fallbackNearby,
  });
}

async function handleMenuSearch({ lang, text }) {
  // Extract a likely food/drink term (naive: last word over 3 chars after key verbs)
  const clean = (text || '').toLowerCase();
  let term = clean
    .replace(
      /.*(ima li|do you have|do they have|looking for|trazim|tražim)\s+/i,
      '',
    )
    .replace(/\?+.*/, '')
    .trim();
  if (!term || term.length < 2) {
    // Fallback to any quoted term
    const q = /"([^"]{2,50})"/.exec(text || '');
    term = q?.[1] || '';
  }
  if (!term)
    return lang === 'hr'
      ? 'Koje jelo/piće tražiš?'
      : 'What dish or drink are you looking for?';
  const results = await searchMenuAcrossRestaurants(term);
  if (!results || results.length === 0) {
    return lang === 'hr'
      ? 'Nisam našao to na jelovnicima partner restorana.'
      : 'I could not find that on partner menus.';
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
  const parts = unique.map((r) => `${r.restaurant.name} – ${r.name}`);
  const fallbackMenu =
    lang === 'hr'
      ? `Našao sam: ${parts.join(', ')}.`
      : `I found: ${parts.join(', ')}.`;
  return generateNaturalReply({
    lang,
    intent: 'menu_search',
    question: text,
    data: {
      items: unique.map((x) => ({
        restaurant: x.restaurant.name,
        item: x.name,
      })),
    },
    fallback: fallbackMenu,
  });
}

async function handlePerks({ lang, text }) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(text);
  let restaurantBasic = resolved;
  if (!restaurantBasic) {
    const nameOrSlug = extractRestaurantNameOrSlug(text);
    restaurantBasic = await resolveRestaurantByName(nameOrSlug);
  }
  if (!restaurantBasic)
    return candidates && candidates.length > 0
      ? formatDisambiguation(candidates, lang)
      : lang === 'hr'
        ? 'Za koji restoran te zanima ta opcija?'
        : 'Which restaurant are you asking about?';
  const restaurant = await fetchRestaurantDetails(restaurantBasic.id);
  if (!restaurant) return replyNoData(lang);
  const { establishmentPerks } = await fetchTypesForRestaurant(restaurant);
  if (!establishmentPerks || establishmentPerks.length === 0) {
    return lang === 'hr'
      ? 'Restoran nema navedene pogodnosti.'
      : 'The restaurant has no listed perks.';
  }
  const target = (text || '').toLowerCase();
  const perkMatch = establishmentPerks.find((p) => {
    const name = (lang === 'hr' ? p.nameHr : p.nameEn).toLowerCase();
    return target.includes(lang === 'hr' ? 'terasa' : 'terrace')
      ? name.includes(lang === 'hr' ? 'terasa' : 'terrace')
      : false || target.includes(name);
  });
  if (perkMatch) {
    const fallbackPerk =
      lang === 'hr'
        ? `Da, dostupno je: ${perkMatch.nameHr}.`
        : `Yes, available: ${perkMatch.nameEn}.`;
    return generateNaturalReply({
      lang,
      intent: 'perks',
      question: text,
      data: { restaurant: { name: restaurant.name }, perk: perkMatch },
      fallback: fallbackPerk,
    });
  }
  const fallbackPerkMissing =
    lang === 'hr'
      ? 'Ne vidim tu opciju za taj restoran.'
      : 'I do not see that option for this restaurant.';
  return generateNaturalReply({
    lang,
    intent: 'perks',
    question: text,
    data: { restaurant: { name: restaurant.name } },
    fallback: fallbackPerkMissing,
  });
}

async function handleMealTypes({ lang, text }) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(text);
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic)
    return candidates && candidates.length > 0
      ? formatDisambiguation(candidates, lang)
      : lang === 'hr'
        ? 'Za koji restoran te zanima?'
        : 'Which restaurant?';
  const restaurant = await fetchRestaurantDetails(rBasic.id);
  if (!restaurant) return replyNoData(lang);
  const { mealTypes } = await fetchTypesForRestaurant(restaurant);
  if (!mealTypes || mealTypes.length === 0)
    return lang === 'hr'
      ? 'Nema definiranih tipova obroka.'
      : 'No meal types defined.';
  const names = mealTypes.map((m) => (lang === 'hr' ? m.nameHr : m.nameEn));
  const fallbackMeals =
    lang === 'hr'
      ? `Poslužuju: ${names.join(', ')}.`
      : `They serve: ${names.join(', ')}.`;
  return generateNaturalReply({
    lang,
    intent: 'meal_types',
    question: text,
    data: { restaurant: { name: restaurant.name }, mealTypes: names },
    fallback: fallbackMeals,
  });
}

async function handleDietaryTypes({ lang, text }) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(text);
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic)
    return candidates && candidates.length > 0
      ? formatDisambiguation(candidates, lang)
      : lang === 'hr'
        ? 'Za koji restoran te zanima?'
        : 'Which restaurant?';
  const restaurant = await fetchRestaurantDetails(rBasic.id);
  if (!restaurant) return replyNoData(lang);
  const { dietaryTypes } = await fetchTypesForRestaurant(restaurant);
  if (!dietaryTypes || dietaryTypes.length === 0)
    return lang === 'hr'
      ? 'Nema specificiranih opcija.'
      : 'No options specified.';
  const names = dietaryTypes.map((m) => (lang === 'hr' ? m.nameHr : m.nameEn));
  const fallbackDiet =
    lang === 'hr'
      ? `Opcije: ${names.join(', ')}.`
      : `Options: ${names.join(', ')}.`;
  return generateNaturalReply({
    lang,
    intent: 'dietary_types',
    question: text,
    data: { restaurant: { name: restaurant.name }, dietaryTypes: names },
    fallback: fallbackDiet,
  });
}

async function handleReservations({ lang, text }) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(text);
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic)
    return candidates && candidates.length > 0
      ? formatDisambiguation(candidates, lang)
      : lang === 'hr'
        ? 'Za koji restoran?'
        : 'Which restaurant?';
  const restaurant = await fetchRestaurantDetails(rBasic.id);
  if (!restaurant) return replyNoData(lang);
  if (restaurant.reservationEnabled) {
    const fallbackRes =
      lang === 'hr'
        ? 'Da, moguće je rezervirati preko Dinvera.'
        : 'Yes, reservations via Dinver are available.';
    return generateNaturalReply({
      lang,
      intent: 'reservations',
      question: text,
      data: { restaurant: { name: restaurant.name }, reservationEnabled: true },
      fallback: fallbackRes,
    });
  }
  const fallbackRes2 =
    lang === 'hr'
      ? 'Rezervacije preko Dinvera trenutno nisu podržane.'
      : 'Reservations via Dinver are not supported at the moment.';
  return generateNaturalReply({
    lang,
    intent: 'reservations',
    question: text,
    data: { restaurant: { name: restaurant.name }, reservationEnabled: false },
    fallback: fallbackRes2,
  });
}

async function handleContact({ lang, text }) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(text);
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic)
    return candidates && candidates.length > 0
      ? formatDisambiguation(candidates, lang)
      : lang === 'hr'
        ? 'Za koji restoran?'
        : 'Which restaurant?';
  const r = await fetchRestaurantDetails(rBasic.id);
  if (!r) return replyNoData(lang);
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
  const fallbackContact =
    links.length === 0
      ? lang === 'hr'
        ? 'Kontakt nije dostupan.'
        : 'Contact info is not available.'
      : links.join(' | ');
  return generateNaturalReply({
    lang,
    intent: 'contact',
    question: text,
    data: { restaurant: { name: r.name }, links },
    fallback: fallbackContact,
  });
}

async function handleDescription({ lang, text }) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(text);
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic)
    return candidates && candidates.length > 0
      ? formatDisambiguation(candidates, lang)
      : lang === 'hr'
        ? 'Za koji restoran?'
        : 'Which restaurant?';
  // getFullRestaurantDetails composes description from translations; fetch basic then fallback fields
  const { Restaurant, RestaurantTranslation } = require('../../models');
  const { Op } = require('sequelize');
  const r = await Restaurant.findOne({
    where: { id: rBasic.id },
    include: [{ model: RestaurantTranslation, as: 'translations' }],
    attributes: ['id', 'name'],
  });
  if (!r) return replyNoData(lang);
  const t = (r.translations || []).find((x) => x.language === lang);
  const desc = t?.description || '';
  const fallbackDesc = !desc
    ? lang === 'hr'
      ? 'Nema unesen opis.'
      : 'No description available.'
    : desc;
  return generateNaturalReply({
    lang,
    intent: 'description',
    question: text,
    data: { restaurant: { name: r.name }, description: desc },
    fallback: fallbackDesc,
  });
}

async function handleVirtualTour({ lang, text }) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(text);
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic)
    return candidates && candidates.length > 0
      ? formatDisambiguation(candidates, lang)
      : lang === 'hr'
        ? 'Za koji restoran?'
        : 'Which restaurant?';
  const r = await fetchRestaurantDetails(rBasic.id);
  const has = !!(r && r.virtualTourUrl);
  const fallbackVt = has
    ? lang === 'hr'
      ? `Virtualna tura: ${r.virtualTourUrl}`
      : `Virtual tour: ${r.virtualTourUrl}`
    : lang === 'hr'
      ? 'Virtualna tura nije dostupna.'
      : 'Virtual tour is not available.';
  return generateNaturalReply({
    lang,
    intent: 'virtual_tour',
    question: text,
    data: {
      restaurant: { name: r?.name },
      virtualTourUrl: r?.virtualTourUrl || null,
    },
    fallback: fallbackVt,
  });
}

async function handlePrice({ lang, text }) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(text);
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic)
    return candidates && candidates.length > 0
      ? formatDisambiguation(candidates, lang)
      : lang === 'hr'
        ? 'Za koji restoran?'
        : 'Which restaurant?';
  const r = await fetchRestaurantDetails(rBasic.id);
  if (!r || !r.priceCategory)
    return lang === 'hr' ? 'Cijena nije navedena.' : 'Price is not specified.';
  const label = lang === 'hr' ? r.priceCategory.nameHr : r.priceCategory.nameEn;
  return lang === 'hr'
    ? `Cjenovna razina: ${label}.`
    : `Price range: ${label}.`;
}

async function handleReviews({ lang, text }) {
  const { match: resolved, candidates } = await resolveRestaurantFromText(text);
  let rBasic = resolved;
  if (!rBasic) {
    const rName = extractRestaurantNameOrSlug(text);
    rBasic = await resolveRestaurantByName(rName);
  }
  if (!rBasic)
    return candidates && candidates.length > 0
      ? formatDisambiguation(candidates, lang)
      : lang === 'hr'
        ? 'Za koji restoran?'
        : 'Which restaurant?';
  const summary = await fetchReviewsSummary(rBasic.id);
  if (!summary || summary.totalReviews === 0)
    return lang === 'hr'
      ? 'Restoran još nema recenzija.'
      : 'This restaurant has no reviews yet.';
  const { ratings, totalReviews } = summary;
  return lang === 'hr'
    ? `Ocjene: ukupno ${ratings.overall} (${totalReviews} recenzija).`
    : `Ratings: overall ${ratings.overall} (${totalReviews} reviews).`;
}

const ctxStore = require('./contextStore');

async function chatAgent(input) {
  const { message, language, latitude, longitude, radiusKm, threadId } = input;
  const lang = detectLanguage(message, language);
  const intent = classifyIntent(message, lang);

  // Load prior context if any
  const ctx = threadId ? ctxStore.get(threadId) : null;
  // If context contains lastRestaurantId, prefer it when matching
  let lastRestaurantId = ctx?.lastRestaurantId;

  switch (intent) {
    case 'hours': {
      const reply = await handleHours({ lang, text: message });
      // Best-effort: store resolved restaurant if disambiguation didn’t happen
      if (reply && reply.restaurantId && threadId) {
        ctxStore.set(threadId, { lastRestaurantId: reply.restaurantId });
      }
      return reply.text || reply;
    }
    case 'nearby':
      return handleNearby({ lang, latitude, longitude, radiusKm });
    case 'menu_search':
      return handleMenuSearch({ lang, text: message });
    case 'perks': {
      const reply = await handlePerks({ lang, text: message });
      if (reply && reply.restaurantId && threadId) {
        ctxStore.set(threadId, { lastRestaurantId: reply.restaurantId });
      }
      return reply.text || reply;
    }
    case 'meal_types': {
      const reply = await handleMealTypes({ lang, text: message });
      if (reply && reply.restaurantId && threadId) {
        ctxStore.set(threadId, { lastRestaurantId: reply.restaurantId });
      }
      return reply.text || reply;
    }
    case 'dietary_types': {
      const reply = await handleDietaryTypes({ lang, text: message });
      if (reply && reply.restaurantId && threadId) {
        ctxStore.set(threadId, { lastRestaurantId: reply.restaurantId });
      }
      return reply.text || reply;
    }
    case 'reservations': {
      const reply = await handleReservations({ lang, text: message });
      if (reply && reply.restaurantId && threadId) {
        ctxStore.set(threadId, { lastRestaurantId: reply.restaurantId });
      }
      return reply.text || reply;
    }
    case 'contact': {
      const reply = await handleContact({ lang, text: message });
      if (reply && reply.restaurantId && threadId) {
        ctxStore.set(threadId, { lastRestaurantId: reply.restaurantId });
      }
      return reply.text || reply;
    }
    case 'description': {
      const reply = await handleDescription({ lang, text: message });
      if (reply && reply.restaurantId && threadId) {
        ctxStore.set(threadId, { lastRestaurantId: reply.restaurantId });
      }
      return reply.text || reply;
    }
    case 'virtual_tour': {
      const reply = await handleVirtualTour({ lang, text: message });
      if (reply && reply.restaurantId && threadId) {
        ctxStore.set(threadId, { lastRestaurantId: reply.restaurantId });
      }
      return reply.text || reply;
    }
    case 'price': {
      const reply = await handlePrice({ lang, text: message });
      if (reply && reply.restaurantId && threadId) {
        ctxStore.set(threadId, { lastRestaurantId: reply.restaurantId });
      }
      return reply.text || reply;
    }
    case 'reviews': {
      const reply = await handleReviews({ lang, text: message });
      if (reply && reply.restaurantId && threadId) {
        ctxStore.set(threadId, { lastRestaurantId: reply.restaurantId });
      }
      return reply.text || reply;
    }
    default:
      return replyOutOfScope(lang);
  }
}

module.exports = { chatAgent };
