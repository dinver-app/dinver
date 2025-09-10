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
 * - out_of_scope
 */

function classifyIntent(text, lang) {
  const t = (text || '').toLowerCase();
  const isHr = lang === 'hr';

  // Hours
  const hoursHr =
    /(radno vrijeme|kada se otvara|do kada radi|radi li|otvara|zatvara|nedjelj|ponedjelj|utorak|srijed|četvrt|petak|subot)/;
  const hoursEn =
    /(hours|open|close|closing|opening|sunday|monday|tuesday|wednesday|thursday|friday|saturday)/;
  if ((isHr && hoursHr.test(t)) || (!isHr && hoursEn.test(t))) return 'hours';

  // Nearby
  const nearbyHr =
    /(blizu mene|u blizini|najbliž|najbliz|udaljen|koliko daleko)/;
  const nearbyEn = /(near me|nearby|closest|distance|how far)/;
  if ((isHr && nearbyHr.test(t)) || (!isHr && nearbyEn.test(t)))
    return 'nearby';

  // Menu search (food/drink)
  const menuHr =
    /(meni|jelovnik|ima li|tražim|trazim|biftek|pizza|burger|jela|pića|pica|piće|pice|desert|salata)/;
  const menuEn =
    /(menu|dish|food|drink|has.*(steak|pizza|burger|dessert|salad)|looking for|do you serve)/;
  if ((isHr && menuHr.test(t)) || (!isHr && menuEn.test(t)))
    return 'menu_search';

  // Perks
  const perksHr =
    /(terasa|stolica za djecu|igralište|klimatiziran|kava za van|hrana za van|parking|pristup|wi[- ]?fi)/;
  const perksEn =
    /(outdoor|terrace|high chair|play area|air[- ]?conditioned|to go|takeaway|parking|accessible|wi[- ]?fi)/;
  if ((isHr && perksHr.test(t)) || (!isHr && perksEn.test(t))) return 'perks';

  // Meal types
  const mealHr = /(doručak|dorucak|ručak|rucak|večera|vecera|brunch)/;
  const mealEn = /(breakfast|lunch|dinner|brunch)/;
  if ((isHr && mealHr.test(t)) || (!isHr && mealEn.test(t)))
    return 'meal_types';

  // Dietary types
  const dietHr = /(vegetar|vegan|halal|bez glutena|gluten free)/;
  const dietEn = /(vegetarian|vegan|halal|gluten[- ]?free)/;
  if ((isHr && dietHr.test(t)) || (!isHr && dietEn.test(t)))
    return 'dietary_types';

  // Reservations
  const resHr = /(rezervacij|rezervirat|rezervirati|rezervacije)/;
  const resEn = /(reservations?|book( a)? table|reserve)/;
  if ((isHr && resHr.test(t)) || (!isHr && resEn.test(t)))
    return 'reservations';

  // Contact/social
  const contactHr = /(kontakt|telefon|email|web|facebook|instagram|tiktok)/;
  const contactEn = /(contact|phone|email|website|facebook|instagram|tiktok)/;
  if ((isHr && contactHr.test(t)) || (!isHr && contactEn.test(t)))
    return 'contact';

  // Description
  const descHr = /(opis|recite nešto|reci nesto|o restoranu)/;
  const descEn = /(describe|about the restaurant|description)/;
  if ((isHr && descHr.test(t)) || (!isHr && descEn.test(t)))
    return 'description';

  // Virtual tour
  const vtHr = /(virtualna tura|virtualni obilazak|360)/;
  const vtEn = /(virtual tour|360)/;
  if ((isHr && vtHr.test(t)) || (!isHr && vtEn.test(t))) return 'virtual_tour';

  // Price
  const priceHr = /(cijena|skupoća|kategorija cijene|price level)/;
  const priceEn = /(price( range)?|budget|expensive|cheap)/;
  if ((isHr && priceHr.test(t)) || (!isHr && priceEn.test(t))) return 'price';

  // Reviews
  const revHr = /(recenzij|ocjen|ocjena|rating|dojam)/;
  const revEn = /(reviews?|rating|feedback)/;
  if ((isHr && revHr.test(t)) || (!isHr && revEn.test(t))) return 'reviews';

  return 'out_of_scope';
}

module.exports = { classifyIntent };
