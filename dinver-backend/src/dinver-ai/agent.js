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
  for (const tok of tokens) {
    if (tok.length < 3) continue;
    if (textNorm.includes(tok)) hits += 1;
  }
  if (tokens.length > 0) score += hits / tokens.length; // partial coverage
  if (candidateSlug && textNorm.includes(candidateSlug)) score += 0.25;
  return score; // 0..2.25
}

async function resolveRestaurantFromText(text) {
  const partners = await fetchPartnersBasic();
  const t = normalize(text);
  const scored = partners.map((p) => {
    const nameN = normalize(p.name);
    const slug = (p.slug || '').toLowerCase();
    return { p, s: scoreMatch(t, nameN, slug) };
  });
  scored.sort((a, b) => b.s - a.s);
  const top = scored[0];
  const second = scored[1];
  if (!top || top.s < 0.75)
    return { match: null, candidates: scored.slice(0, 3).map((x) => x.p) };
  if (second && top.s - second.s < 0.25) {
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
  return formatHoursResponse(
    lang,
    restaurant.name,
    dayIndex,
    period.open,
    period.close,
  );
}

async function handleNearby({ lang, latitude, longitude, radiusKm }) {
  const nearby = await findNearbyPartners({
    latitude,
    longitude,
    radiusKm,
    limit: 5,
  });
  return formatNearbyResponse(lang, nearby);
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
  return lang === 'hr'
    ? `Našao sam: ${parts.join(', ')}.`
    : `I found: ${parts.join(', ')}.`;
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
    return lang === 'hr'
      ? `Da, dostupno je: ${perkMatch.nameHr}.`
      : `Yes, available: ${perkMatch.nameEn}.`;
  }
  return lang === 'hr'
    ? 'Ne vidim tu opciju za taj restoran.'
    : 'I do not see that option for this restaurant.';
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
  return lang === 'hr'
    ? `Poslužuju: ${names.join(', ')}.`
    : `They serve: ${names.join(', ')}.`;
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
  return lang === 'hr'
    ? `Opcije: ${names.join(', ')}.`
    : `Options: ${names.join(', ')}.`;
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
    return lang === 'hr'
      ? 'Da, moguće je rezervirati preko Dinvera.'
      : 'Yes, reservations via Dinver are available.';
  }
  return lang === 'hr'
    ? 'Rezervacije preko Dinvera trenutno nisu podržane.'
    : 'Reservations via Dinver are not supported at the moment.';
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
  if (links.length === 0)
    return lang === 'hr'
      ? 'Kontakt nije dostupan.'
      : 'Contact info is not available.';
  return links.join(' | ');
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
  if (!desc)
    return lang === 'hr' ? 'Nema unesen opis.' : 'No description available.';
  return desc;
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
  if (!r || !r.virtualTourUrl)
    return lang === 'hr'
      ? 'Virtualna tura nije dostupna.'
      : 'Virtual tour is not available.';
  return lang === 'hr'
    ? `Virtualna tura: ${r.virtualTourUrl}`
    : `Virtual tour: ${r.virtualTourUrl}`;
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

async function chatAgent(input) {
  const { message, language, latitude, longitude, radiusKm } = input;
  const lang = detectLanguage(message, language);
  const intent = classifyIntent(message, lang);

  switch (intent) {
    case 'hours':
      return handleHours({ lang, text: message });
    case 'nearby':
      return handleNearby({ lang, latitude, longitude, radiusKm });
    case 'menu_search':
      return handleMenuSearch({ lang, text: message });
    case 'perks':
      return handlePerks({ lang, text: message });
    case 'meal_types':
      return handleMealTypes({ lang, text: message });
    case 'dietary_types':
      return handleDietaryTypes({ lang, text: message });
    case 'reservations':
      return handleReservations({ lang, text: message });
    case 'contact':
      return handleContact({ lang, text: message });
    case 'description':
      return handleDescription({ lang, text: message });
    case 'virtual_tour':
      return handleVirtualTour({ lang, text: message });
    case 'price':
      return handlePrice({ lang, text: message });
    case 'reviews':
      return handleReviews({ lang, text: message });
    default:
      return replyOutOfScope(lang);
  }
}

module.exports = { chatAgent };
