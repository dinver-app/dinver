'use strict';

/**
 * Recognized intents aligned with dinver-ai.md
 * - hours
 * - nearby
 * - menu_search
 * - perks
 * - meal_types
 * - dietary_types
 * - reservations
 * - contact
 * - description
 * - virtual_tour
 * - price
 * - reviews
 * - data_provenance
 * - what_offers (new: "što nudi restoran")
 * - combined_search (new: kombinacija više filtara)
 * - out_of_scope
 */

function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim();
}

function detectMultipleIntents(text, lang) {
  const t = normalizeText(text);
  const intents = [];
  
  // Check for each intent type
  if (hasHoursKeywords(t, lang)) intents.push('hours');
  if (hasNearbyKeywords(t, lang)) intents.push('nearby');
  if (hasMenuKeywords(t, lang)) intents.push('menu_search');
  if (hasPerksKeywords(t, lang)) intents.push('perks');
  if (hasMealTypesKeywords(t, lang)) intents.push('meal_types');
  if (hasDietaryKeywords(t, lang)) intents.push('dietary_types');
  if (hasReservationKeywords(t, lang)) intents.push('reservations');
  if (hasContactKeywords(t, lang)) intents.push('contact');
  if (hasDescriptionKeywords(t, lang)) intents.push('description');
  if (hasVirtualTourKeywords(t, lang)) intents.push('virtual_tour');
  if (hasPriceKeywords(t, lang)) intents.push('price');
  if (hasReviewsKeywords(t, lang)) intents.push('reviews');
  if (hasWhatOffersKeywords(t, lang)) intents.push('what_offers');
  
  return intents;
}

function hasHoursKeywords(t, lang) {
  const isHr = lang === 'hr';
  // Be more specific to avoid matching weather questions
  const hoursHr = /(radno vrijeme|koje je radno vrijeme|koje su radne sate|koje su radne sate restorana|radno vrijeme restorana|kada restoran radi|kada je restoran otvoren|kada je restoran zatvoren|kada se otvara|kada se zatvara|do kada radi|do kad radi|radi li|otvara se|zatvara se|nedjelj|ponedjelj|utorak|srijed|četvrt|petak|subot|danas.*rad|sada.*otvoren|trenutno.*rad|otvoren[oa]? sada|zatvoreno|radni dan|kada radi|kada je otvoren|kada je zatvoren|kada je otvoreno|kada je zatvoreno|u koje vrijeme radi|od kada do kada radi)/;
  const hoursEn = /(hours|open|close|closing time|opening time|sunday|monday|tuesday|wednesday|thursday|friday|saturday|open now|today.*open|closed|working hours|what time|when do you open|when do you close|when is the restaurant open|when is the restaurant closed|when are you open|when are you closed)/;
  return (isHr && hoursHr.test(t)) || (!isHr && hoursEn.test(t));
}

function hasNearbyKeywords(t, lang) {
  const isHr = lang === 'hr';
  const nearbyHr = /(blizu mene|u blizini|najbliž|najbliz|udaljen|koliko daleko|oko mene|u okolici)/;
  const nearbyEn = /(near me|nearby|closest|distance|how far|around me)/;
  return (isHr && nearbyHr.test(t)) || (!isHr && nearbyEn.test(t));
}

function hasMenuKeywords(t, lang) {
  const isHr = lang === 'hr';
  const menuHr = /(meni|jelovnik|ima li|ima\b|imate\b|imaju\b|što nudi|sto nudi|šta nudi|sta nudi|nudi\b|nudite\b|nude\b|tražim|trazim|biftek|pizza|burger|jela|pića|pica|piće|pice|desert|salata|lazanj|lazanje|pasta|tjestenina|juha|supa|piletina|riba|meso|vegetarijan|vegan|morski plodovi|deserti|vegan obrok|vegetarijanski obrok|bezglutensko jelo|bez glutena|gluten free|halal)/;
  const menuEn = /(menu|dish|food|drink|has.*(steak|pizza|burger|dessert|salad|lasagn|pasta|soup|chicken|fish|meat|seafood|vegan|vegetarian|gluten[- ]?free|halal)|looking for|do you serve|do you have|pizza|burger|steak|vegan|vegetarian|gluten[- ]?free|halal|dessert|salad|lasagna|pasta|soup|chicken|fish|meat|seafood|breakfast|lunch|dinner|brunch)/;
  return (isHr && menuHr.test(t)) || (!isHr && menuEn.test(t));
}

function hasPerksKeywords(t, lang) {
  const isHr = lang === 'hr';
  const perksHr = /(vanjsk[au] teras[au]|terasa|stolica za djecu|stolice za djecu|igralište|klimatiziran|kava za van|hrana za van|parking|pristup|wi[- ]?fi|dostava|takeaway|besplatan|kartice|kartica|kartom|plaćanje|imate li vi|ima li parking|ima li terasa|ima li igralište|ima li wi[- ]?fi|ima li dostava|ima li kartice|ima li kartica|ima li plaćanje)/;
  const perksEn = /(outdoor|terrace|high chair|high chairs|play area|air[- ]?conditioned|to go|takeaway|parking|accessible|wi[- ]?fi|delivery|payment|cards|card|do you have parking|do you have outdoor seating|do you have wi[- ]?fi|do you have delivery|do you have cards|do you have payment)/;
  return (isHr && perksHr.test(t)) || (!isHr && perksEn.test(t));
}

function hasMealTypesKeywords(t, lang) {
  const isHr = lang === 'hr';
  const mealHr = /(doručak|dorucak|ručak|rucak|večera|vecera|brunch|obrok|obroci|vrste obroka|tipovi obroka|koje obroke|koje vrste obroka)/;
  const mealEn = /(breakfast|lunch|dinner|brunch|meal|meals|types of meals|what meals|what kind of meals|meal types|types of food)/;
  return (isHr && mealHr.test(t)) || (!isHr && mealEn.test(t));
}

function hasDietaryKeywords(t, lang) {
  const isHr = lang === 'hr';
  const dietHr = /(vegetar|vegetarijan|vegetarijanski|vegan|veganski|halal|bez glutena|bezgluten|gluten free|bezglutensko|dijeta|dijetalan|dijetalno|dijetalna|dijetalni)/;
  const dietEn = /(vegetarian|vegetarian meal|vegetarian food|vegan|vegan meal|vegan food|halal|gluten[- ]?free|gluten free meal|gluten free food|diet|dietary|diet meal|diet food)/;
  return (isHr && dietHr.test(t)) || (!isHr && dietEn.test(t));
}

function hasReservationKeywords(t, lang) {
  const isHr = lang === 'hr';
  const resHr = /(rezervacij|rezervirat|rezervirati|rezervacije|rezervacija|booking)/;
  const resEn = /(reservations?|book( a)? table|reserve|booking)/;
  return (isHr && resHr.test(t)) || (!isHr && resEn.test(t));
}

function hasContactKeywords(t, lang) {
  const isHr = lang === 'hr';
  const contactHr = /(kontakt|telefon|telefona|broj telefona|email|web|facebook|instagram|tiktok|adresa|lokacija)/;
  const contactEn = /(contact|phone|telephone|number|email|website|facebook|instagram|tiktok|address|location)/;
  return (isHr && contactHr.test(t)) || (!isHr && contactEn.test(t));
}

function hasDescriptionKeywords(t, lang) {
  const isHr = lang === 'hr';
  const descHr = /(opis|recite nešto|reci nesto|o restoranu|kakav je|opišite|opisite)/;
  const descEn = /(describe|about the restaurant|description|what is.*like|tell me about)/;
  return (isHr && descHr.test(t)) || (!isHr && descEn.test(t));
}

function hasVirtualTourKeywords(t, lang) {
  const isHr = lang === 'hr';
  const vtHr = /(virtualna tura|virtualni obilazak|360|pogled|izgled)/;
  const vtEn = /(virtual tour|360|view|look)/;
  return (isHr && vtHr.test(t)) || (!isHr && vtEn.test(t));
}

function hasPriceKeywords(t, lang) {
  const isHr = lang === 'hr';
  const priceHr = /(cijena|cjena|cijene|cjene|skupoća|skupoca|kategorija cijene|price level|skup|jeftin|pristupačno|budžet|budget|kosta|košta)/;
  const priceEn = /(price( range)?|budget|expensive|cheap|affordable|cost|costs)/;
  return (isHr && priceHr.test(t)) || (!isHr && priceEn.test(t));
}

function hasReviewsKeywords(t, lang) {
  const isHr = lang === 'hr';
  const revHr = /(recenzij|recenzije|ocjen|ocjena|ocjene|rating|dojam|mišljenje|misljenje|kako je|kakva su iskustva|kakva su mišljenja|što misle|što kažu|što govore|dobro|loš|loše|iskustva|gosti|gostiju)/;
  const revEn = /(reviews?|review|rating|ratings|feedback|opinion|opinions|guest experience|guest reviews|how is|how are|what do people think|what do guests say|good|bad|experience|experiences)/;
  return (isHr && revHr.test(t)) || (!isHr && revEn.test(t));
}

function hasWhatOffersKeywords(t, lang) {
  const isHr = lang === 'hr';
  // Make this more specific to avoid conflicts with menu_search
  const offersHr = /(što nudi|sto nudi|šta nudi|sta nudi|što ima|sto ima|šta ima|sta ima|ponuda|kakva je ponuda)/;
  const offersEn = /(what do.*offer|what does.*offer|what.*have|what is.*menu)/;
  return (isHr && offersHr.test(t)) || (!isHr && offersEn.test(t));
}

function classifyIntent(text, lang, context = {}) {
  const t = normalizeText(text);
  const isHr = lang === 'hr';
  // First detect multiple intents
  const intents = detectMultipleIntents(text, lang);
  // If multiple intents detected, return combined_search ONLY if it makes sense
  if (intents.length > 1) {
    const hasNearby = intents.includes('nearby');
    const hasDietary = intents.includes('dietary_types');
    const hasMenu = intents.includes('menu_search');
    const hasPerks = intents.includes('perks');
    const hasWhatOffers = intents.includes('what_offers');
    // Fraze za traženje/restoran/nearby
    const searchPhrases = /(gdje|neki|restoran s|restoran za|near me|find|search|place|restaurant with|restoran|tražim|trazim)/i;
    // 0. Upiti za 'što nudi ovaj restoran' vraćaju what_offers ako postoji restaurantId/thread
  const isDirectWhatOffers = /što nudi|sto nudi|šta nudi|sta nudi|what does.*offer|what do.*offer/.test(t);
    if (hasWhatOffers && isDirectWhatOffers) {
      if (context.restaurantId || context.threadId) {
        return 'what_offers';
      } else {
        return 'combined_search';
      }
    }
    // 1. menu_search + nearby OR menu_search + search fraza → combined_search
    if ((hasMenu && hasNearby) || (hasMenu && searchPhrases.test(text))) return 'combined_search';
    // 2. perks + perks/menu_search OR perks + search fraza → combined_search
  const isDirectPerksQuestion = /(imate li vi|do you have|do you offer|do you provide)/i.test(t);
    if (hasPerks && intents.length === 1 && isDirectPerksQuestion) {
      if (context.restaurantId || context.threadId) {
        return 'perks';
      } else {
        return 'combined_search';
      }
    }
    if ((hasPerks && (intents.filter(i => i === 'perks').length > 1 || hasMenu)) || (hasPerks && searchPhrases.test(text))) return 'combined_search';
    // 3. dietary_types + "restoran s"/"restaurant with" → combined_search
    if (hasDietary && (/restoran s|restaurant with|opcijama|options/.test(text))) return 'combined_search';
    // 4. nearby + dietary_types → combined_search
    if (hasNearby && hasDietary) return 'combined_search';
    // Perks upiti bez kombinacije i bez search fraza
    if (hasPerks && intents.length === 1 && !searchPhrases.test(text)) return 'perks';
    // Don't combine if it's a simple question about one thing
    const isSimpleQuestion = /^(ima li|ima|imate|imaju|does|do you have|is there|do you serve)/i.test(text);
    if (isSimpleQuestion && intents.length === 2) {
      // For simple questions, prefer the more specific intent
      if (intents.includes('perks')) return 'perks';
      if (intents.includes('hours')) return 'hours';
      // Poboljšaj razliku dietary_types vs meal_types za engleski
      if (intents.includes('dietary_types') && lang === 'en') return 'dietary_types';
      if (intents.includes('meal_types') && lang === 'en' && !intents.includes('dietary_types')) return 'meal_types';
      if (intents.includes('dietary_types')) return 'dietary_types';
      if (intents.includes('menu_search')) return 'menu_search';
      if (intents.includes('meal_types')) return 'meal_types';
      if (intents.includes('reviews')) return 'reviews';
      if (intents.includes('price')) return 'price';
    }
    // Special case: "što nudi" should be what_offers not combined
    if (intents.includes('what_offers') && intents.length === 2) {
      return 'what_offers';
    }
    // If upit sadrži hours, reviews, meal_types, price, dietary_types, prefer specific intent
    if (intents.includes('hours')) return 'hours';
    if (intents.includes('reviews')) return 'reviews';
    // Poboljšaj razliku dietary_types vs meal_types za engleski
    if (intents.includes('dietary_types') && lang === 'en') return 'dietary_types';
    if (intents.includes('meal_types') && lang === 'en' && !intents.includes('dietary_types')) return 'meal_types';
    if (intents.includes('meal_types')) return 'meal_types';
    if (intents.includes('price')) return 'price';
    if (intents.includes('dietary_types')) return 'dietary_types';
    return 'combined_search';
  }
  
  // Single intent detection with context-aware logic
  // Check for out_of_scope first (weather, general questions), ali ne za radno vrijeme
  const outOfScopeHr = /(vrijeme(?!.*radno vrijeme)|weather|kako si|how are you|što radiš|what are you doing)/;
  const outOfScopeEn = /(weather|how are you|what are you doing|hello|hi there)/;
  if ((isHr && outOfScopeHr.test(t) && !hasHoursKeywords(t, lang)) || (!isHr && outOfScopeEn.test(t))) {
    return 'out_of_scope';
  }

  // what_offers: prefer specific intent if context present
  if (hasWhatOffersKeywords(t, lang)) {
    if (context.restaurantId || context.threadId) {
      return 'what_offers';
    } else {
      return 'combined_search';
    }
  }

  // perks: prefer specific intent if context present
  if (hasPerksKeywords(t, lang)) {
    if (context.restaurantId || context.threadId) {
      return 'perks';
    } else {
      return 'combined_search';
    }
  }

  // Dietary types (check before menu_search to be more specific)
  if (hasDietaryKeywords(t, lang)) return 'dietary_types';

  // Hours (check before menu_search as it might contain 'radi')
  if (hasHoursKeywords(t, lang)) return 'hours';

  // Nearby (enhanced)
  if (hasNearbyKeywords(t, lang)) return 'nearby';

  // Menu search (greatly expanded)
  if (hasMenuKeywords(t, lang)) return 'menu_search';

  // Meal types  
  if (hasMealTypesKeywords(t, lang)) return 'meal_types';

  // Reservations
  if (hasReservationKeywords(t, lang)) return 'reservations';

  // Contact/social
  if (hasContactKeywords(t, lang)) return 'contact';

  // Description
  if (hasDescriptionKeywords(t, lang)) return 'description';

  // Virtual tour
  if (hasVirtualTourKeywords(t, lang)) return 'virtual_tour';

  // Price
  if (hasPriceKeywords(t, lang)) return 'price';

  // Reviews
  if (hasReviewsKeywords(t, lang)) return 'reviews';

  // Data provenance
  const provHr = /(odakle (su|dolaze) podaci|izvora podataka|iz baze|od kud su info|odakle informacije)/;
  const provEn = /(where.*data.*from|data source|provenance)/;
  if ((isHr && provHr.test(t)) || (!isHr && provEn.test(t))) return 'data_provenance';

  return 'out_of_scope';
}

// Export additional helper for complex queries
function extractIntentsFromText(text, lang) {
  return detectMultipleIntents(text, lang);
}

module.exports = { 
  classifyIntent,
  extractIntentsFromText,
  hasHoursKeywords,
  hasNearbyKeywords,
  hasMenuKeywords,
  hasPerksKeywords,
  hasMealTypesKeywords,
  hasDietaryKeywords,
  hasWhatOffersKeywords
};
