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
  const hoursHr = /(radno vrijeme|kada se otvara|do kada radi|radi li|otvara se|zatvara se|nedjelj|ponedjelj|utorak|srijed|četvrt|petak|subot|danas.*rad|sada.*otvoren|trenutno.*rad|otvoren[oa]? sada|zatvoreno|radni dan|kada radi|do kad radi)/;
  const hoursEn = /(hours|open|close|closing time|opening time|sunday|monday|tuesday|wednesday|thursday|friday|saturday|open now|today.*open|closed|working hours|what time)/;
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
  const menuHr = /(meni|jelovnik|ima li|ima\b|imate\b|imaju\b|što nudi|sto nudi|šta nudi|sta nudi|nudi\b|nudite\b|nude\b|tražim|trazim|biftek|pizza|burger|jela|pića|pica|piće|pice|desert|salata|lazanj|lazanje|pasta|tjestenina|juha|supa|piletina|riba|meso|vegetarijan|vegan|morski plodovi|deserti)/;
  const menuEn = /(menu|dish|food|drink|has.*(steak|pizza|burger|dessert|salad|lasagn|pasta|soup|chicken|fish|meat|seafood)|looking for|do you serve|do you have)/;
  return (isHr && menuHr.test(t)) || (!isHr && menuEn.test(t));
}

function hasPerksKeywords(t, lang) {
  const isHr = lang === 'hr';
  const perksHr = /(vanjsk[au] teras[au]|terasa|stolica za djecu|stolice za djecu|igralište|klimatiziran|kava za van|hrana za van|parking|pristup|wi[- ]?fi|dostava|takeaway|besplatan|kartice|kartica|kartom|plaćanje)/;
  const perksEn = /(outdoor|terrace|high chair|high chairs|play area|air[- ]?conditioned|to go|takeaway|parking|accessible|wi[- ]?fi|delivery|payment|cards|card)/;
  return (isHr && perksHr.test(t)) || (!isHr && perksEn.test(t));
}

function hasMealTypesKeywords(t, lang) {
  const isHr = lang === 'hr';
  const mealHr = /(doručak|dorucak|ručak|rucak|večera|vecera|brunch|obrok|obroci)/;
  const mealEn = /(breakfast|lunch|dinner|brunch|meal|meals)/;
  return (isHr && mealHr.test(t)) || (!isHr && mealEn.test(t));
}

function hasDietaryKeywords(t, lang) {
  const isHr = lang === 'hr';
  const dietHr = /(vegetar|vegan|halal|bez glutena|bezgluten|gluten free|dijeta|dijetalan)/;
  const dietEn = /(vegetarian|vegan|halal|gluten[- ]?free|diet|dietary)/;
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
  const revHr = /(recenzij|ocjen|ocjena|rating|dojam|mišljenje|misljenje|kako je|dobro|loš|loše)/;
  const revEn = /(reviews?|rating|feedback|opinion|good|bad|how is)/;
  return (isHr && revHr.test(t)) || (!isHr && revEn.test(t));
}

function hasWhatOffersKeywords(t, lang) {
  const isHr = lang === 'hr';
  // Make this more specific to avoid conflicts with menu_search
  const offersHr = /^(što nudi|sto nudi|šta nudi|sta nudi|što ima|sto ima|šta ima|sta ima|ponuda|kakva je ponuda)/;
  const offersEn = /^(what do.*offer|what does.*offer|what.*have|what is.*menu)/;
  return (isHr && offersHr.test(t)) || (!isHr && offersEn.test(t));
}

function classifyIntent(text, lang) {
  const t = normalizeText(text);
  const isHr = lang === 'hr';
  
  // First detect multiple intents
  const intents = detectMultipleIntents(text, lang);
  
  // If multiple intents detected, return combined_search ONLY if it makes sense
  if (intents.length > 1) {
    // Don't combine if it's a simple question about one thing
    const isSimpleQuestion = /^(ima li|ima|imate|imaju|does|do you have|is there|do you serve)/i.test(text);
    if (isSimpleQuestion && intents.length === 2) {
      // For simple questions, prefer the more specific intent
      if (intents.includes('perks')) return 'perks';
      if (intents.includes('hours')) return 'hours';
      if (intents.includes('dietary_types')) return 'dietary_types';
      if (intents.includes('menu_search')) return 'menu_search';
    }
    
    // Special case: "što nudi" should be what_offers not combined
    if (intents.includes('what_offers') && intents.length === 2) {
      return 'what_offers';
    }
    
    return 'combined_search';
  }
  
  // Single intent detection with enhanced patterns - order matters!
  
  // Check for out_of_scope first (weather, general questions)
  const outOfScopeHr = /(vrijeme|weather|kako si|how are you|što radiš|what are you doing)/;
  const outOfScopeEn = /(weather|how are you|what are you doing|hello|hi there)/;
  if ((isHr && outOfScopeHr.test(t)) || (!isHr && outOfScopeEn.test(t))) {
    return 'out_of_scope';
  }
  
  // Check for "what offers" first (specific pattern) 
  if (hasWhatOffersKeywords(t, lang)) return 'what_offers';
  
  // Dietary types (check before menu_search to be more specific)
  if (hasDietaryKeywords(t, lang)) return 'dietary_types';
  
  // Hours (check before menu_search as it might contain 'radi')
  if (hasHoursKeywords(t, lang)) return 'hours';

  // Perks (check before menu_search to catch terasa questions)
  if (hasPerksKeywords(t, lang)) return 'perks';

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

  // Nearby (enhanced)
  if (hasNearbyKeywords(t, lang)) return 'nearby';

  // Menu search (greatly expanded)
  if (hasMenuKeywords(t, lang)) return 'menu_search';

  // Perks (enhanced)
  if (hasPerksKeywords(t, lang)) return 'perks';

  // Meal types
  if (hasMealTypesKeywords(t, lang)) return 'meal_types';

  // Dietary types
  if (hasDietaryKeywords(t, lang)) return 'dietary_types';

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
