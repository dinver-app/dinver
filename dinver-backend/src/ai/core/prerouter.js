'use strict';

function latinize(text) {
  const map = {
    š: 's',
    đ: 'd',
    č: 'c',
    ć: 'c',
    ž: 'z',
    Š: 'S',
    Đ: 'D',
    Č: 'C',
    Ć: 'C',
    Ž: 'Z',
  };

  return text.replace(/[šđčćžŠĐČĆŽ]/g, (match) => map[match] || match);
}

const PATTERNS = {
  opening_hours:
    /\b(otvoren|otvoreno|radno vrijeme|zatvara|otvara|when.*open|open.*now|opening|closing|hours?|radi\s+li)\b/i,
  details:
    /\b(detalj|info|informacij|address|lokacij|contact|broj|phone|adresa)\b/i,
  global_search:
    /\b(find|search|recommend|preporu|traž|gdje|restoran|mjesta?|places?|nađ)\b/i,
  restaurant_specific:
    /\b(?:[Ii]ma\s+li\s+|[Dd]oes\s+|[Ii]s\s+there\s+)?(?:[Rr]estoran|[Rr]estaurant)\s+([A-ZŠĐČĆŽ][a-zšđčćžA-ZŠĐČĆŽ\s]+?)(?:\s+(?:ima|imati|has|have|nudi|serve|vanjsk|terasu|biftek|pizza|burge|parking|wifi|i\s|and\s|,|\?))/,
  restaurant_question:
    /\b(?:[Rr]estoran|[Rr]estaurant)\s+([A-ZŠĐČĆŽ][a-zšđčćžA-ZŠĐČĆŽ\s]+?)\s+(?:ima|has|nudi|serves?|li|if|na)\b/,
  restaurant_name_direct:
    /(?:[Rr]estoran|[Rr]estaurant)\s+([A-ZŠĐČĆŽ][a-zšđčćžA-ZŠĐČĆŽ\s]+?)(?:\?|,|\s+(?:nudi|ima|serve|offer))/,
  menu_terms:
    /\b(pizza|pizze|sushi|ramen|burger|hambur|kava|coffee|čaj|tea|sok|juice|vege|bez\s?glutena|gluten[- ]?free|vegan|vegetarian|lazanj|pasta|salat|steak|biftek|grah|riž|krumpir)\b/i,
  perks:
    /\b(terasa|terrace|outdoor|vanjsk|parking|parkiranje|wifi|wi-fi|pets|kućni ljubimci|wheelchair|stolice za djecu|high chair|live music|tv|delivery|dostava|takeaway|za van)\b/i,
  dietary:
    /\b(vegetarian|vegan|gluten[- ]?free|bez\s?glutena|lactose[- ]?free|bez\s?laktoze|halal|kosher|vege)\b/i,
  location_city:
    /\b(?:u|in)\s+([A-ZŠĐČĆŽ][a-zšđčćž]+(?:\s+[A-ZŠĐČĆŽ][a-zšđčćž]+)?)\b/,
  coordinates: /\(?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?/,
  open_now:
    /\b(open\s+now|otvoreno\s+(sad|sada|trenutno)|radi\s+li\s+(sad|sada|trenutno))\b/i,
  time_ref:
    /\b(danas|sutra|today|tomorrow|ponedjeljak|utorak|srijeda|četvrtak|petak|subota|nedjelja|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2})\b/i,
  restaurant_name:
    /\b([A-ZŠĐČĆŽ][a-zšđčćž]+(?:\s+[A-ZŠĐČĆŽ][a-zšđčćž]+){0,3})\b/g,
};

function preRoute(text, context = {}) {
  const normalized = latinize(text).toLowerCase();
  const hints = {
    intent_hint: null,
    city: null,
    coordinates: null,
    time_ref: null,
    has_menu_terms: false,
    has_dietary: false,
    has_perks: false,
    possible_restaurant_names: [],
    specific_restaurant: null,
  };

  const restaurantSpecificMatch = text.match(PATTERNS.restaurant_specific);
  const restaurantQuestionMatch = text.match(PATTERNS.restaurant_question);
  const restaurantDirectMatch = text.match(PATTERNS.restaurant_name_direct);

  if (restaurantSpecificMatch && restaurantSpecificMatch[1]) {
    hints.specific_restaurant = restaurantSpecificMatch[1].trim();
    hints.intent_hint = 'RESTAURANT_DETAILS';
  } else if (restaurantQuestionMatch && restaurantQuestionMatch[1]) {
    hints.specific_restaurant = restaurantQuestionMatch[1].trim();
    hints.intent_hint = 'RESTAURANT_DETAILS';
  } else if (restaurantDirectMatch && restaurantDirectMatch[1]) {
    hints.specific_restaurant = restaurantDirectMatch[1].trim();
  }

  if (!hints.intent_hint) {
    if (
      PATTERNS.opening_hours.test(normalized) ||
      PATTERNS.open_now.test(normalized)
    ) {
      hints.intent_hint = 'OPEN_NOW';
    } else if (PATTERNS.details.test(normalized)) {
      hints.intent_hint = 'RESTAURANT_DETAILS';
    } else if (PATTERNS.menu_terms.test(normalized)) {
      hints.has_menu_terms = true;
    }
  }

  if (PATTERNS.perks.test(normalized)) {
    hints.has_perks = true;
  }

  const cityMatch = text.match(PATTERNS.location_city);
  if (cityMatch && cityMatch[1]) {
    hints.city = cityMatch[1];
  }

  const coordsMatch = text.match(PATTERNS.coordinates);
  if (coordsMatch) {
    hints.coordinates = {
      latitude: parseFloat(coordsMatch[1]),
      longitude: parseFloat(coordsMatch[2]),
    };
  }

  if (!hints.coordinates && context.latitude && context.longitude) {
    hints.coordinates = {
      latitude: context.latitude,
      longitude: context.longitude,
    };
  }

  const timeMatch = text.match(PATTERNS.time_ref);
  if (timeMatch) {
    hints.time_ref = timeMatch[0];
  }

  if (PATTERNS.dietary.test(normalized)) {
    hints.has_dietary = true;
  }

  hints.extracted_menu_terms = [];
  hints.extracted_perks = [];

  const stopWords = new Set([
    'kakve',
    'kakvo',
    'kakav',
    'koja',
    'koji',
    'koje',
    'što',
    'šta',
    'ima',
    'imaju',
    'li',
    'nudi',
    'nude',
    'se',
    'nalazi',
    'restoran',
    'restaurant',
    'caffe',
    'cafe',
    'pizzeria',
    'da',
    'i',
    'u',
    'na',
    'od',
    'do',
    'za',
    'sa',
    'iz',
    'mi',
    'meni',
    'menu',
    'meniju',
    'jelovnik',
    'jelovniku',
    'preporuči',
    'preporučite',
    'suggest',
    'recommend',
    'vanjsku',
    'vanjski',
    'vanjska',
    'vanjskog',
    'terasu',
    'terasa',
    'terase',
    'terasom',
    'what',
    'which',
    'does',
    'do',
    'have',
    'has',
    'offer',
    'offers',
    'the',
    'a',
    'an',
    'in',
    'at',
    'on',
    'of',
    'to',
    'for',
    'with',
    'from',
  ]);

  const words = text.split(/\s+/);
  const menuKeywords = [
    'pizza',
    'pizzu',
    'pizze',
    'biftek',
    'burger',
    'sushi',
    'pasta',
    'salata',
    'salatu',
    'juha',
    'juhe',
    'steak',
    'desert',
    'deserte',
    'deserti',
    'sladic',
    'sladoled',
    'lazanje',
    'lazanja',
    'piletina',
    'teletina',
    'riba',
    'ribu',
    'lignje',
    'škampi',
    'pršut',
  ];
  const perkKeywords = [
    'terasa',
    'terasom',
    'terasu',
    'parking',
    'parkiranje',
    'wifi',
    'stolice',
    'djeca',
    'djecu',
  ];

  words.forEach((word) => {
    const cleanWord = word.replace(/[.,!?]/g, '').toLowerCase();
    if (menuKeywords.some((kw) => cleanWord.includes(kw))) {
      const match = text.match(new RegExp('\\b' + cleanWord + '\\w*', 'i'));
      if (match && !hints.extracted_menu_terms.includes(match[0])) {
        hints.extracted_menu_terms.push(match[0]);
      }
    }
  });

  if (hints.specific_restaurant) {
    const restaurantWords = hints.specific_restaurant
      .toLowerCase()
      .split(/\s+/);

    words.forEach((word) => {
      const cleanWord = word.replace(/[.,!?]/g, '');
      const lowerWord = cleanWord.toLowerCase();

      if (
        !stopWords.has(lowerWord) &&
        !restaurantWords.includes(lowerWord) &&
        !hints.extracted_menu_terms.some(
          (term) => term.toLowerCase() === lowerWord,
        ) &&
        cleanWord.length >= 3 &&
        cleanWord.length <= 20 &&
        !/^\d+$/.test(cleanWord)
      ) {
        // Add as potential menu term
        hints.extracted_menu_terms.push(cleanWord);
      }
    });
  }

  const perkMatches = text
    .toLowerCase()
    .match(
      /vanjsk\w*\s+terasu?|parking|parkiranje|wifi|wi-fi|stolice\s+za\s+djecu/gi,
    );
  if (perkMatches) {
    hints.extracted_perks = perkMatches.map((m) => m.trim());
  }

  if (hints.specific_restaurant) {
    const restaurantWordsLower = hints.specific_restaurant
      .toLowerCase()
      .split(/\s+/);
    hints.extracted_menu_terms = hints.extracted_menu_terms.filter(
      (term) => !restaurantWordsLower.includes(term.toLowerCase()),
    );
  }

  console.log('[Prerouter] Extracted menu terms:', hints.extracted_menu_terms);
  console.log('[Prerouter] Extracted perks:', hints.extracted_perks);

  const nameMatches = [...text.matchAll(PATTERNS.restaurant_name)];
  if (nameMatches.length > 0) {
    const stopwords = [
      'Zagreb',
      'Split',
      'Rijeka',
      'Osijek',
      'Zadar',
      'Pula',
      'Vinkovci',
      'U',
      'I',
      'A',
    ];
    hints.possible_restaurant_names = nameMatches
      .map((m) => m[1])
      .filter((name) => !stopwords.includes(name))
      .slice(0, 3);
  }

  return hints;
}

function mergeHints(hints, routerOutput) {
  const entities = routerOutput.entities || {};

  if (!entities.city && hints.city) {
    entities.city = hints.city;
  }

  if (hints.coordinates && !entities.latitude && !entities.longitude) {
    entities.latitude = hints.coordinates.latitude;
    entities.longitude = hints.coordinates.longitude;
  }

  if (!entities.time_ref && hints.time_ref) {
    entities.time_ref = hints.time_ref;
  }

  if (hints.specific_restaurant) {
    const hasCompoundFilters =
      hints.extracted_menu_terms.length > 0 || hints.extracted_perks.length > 0;

    if (!entities.restaurant_name && !hasCompoundFilters) {
      entities.restaurant_name = hints.specific_restaurant;
      console.log(
        `[Prerouter] Suggested restaurant name: "${hints.specific_restaurant}"`,
      );
    }
  }

  if (
    (hints.extracted_menu_terms.length > 0 ||
      hints.extracted_perks.length > 0) &&
    (!entities.menu_terms || entities.menu_terms.length === 0)
  ) {
    entities.menu_terms = [
      ...hints.extracted_perks,
      ...hints.extracted_menu_terms,
    ];
    console.log(
      `[Prerouter] Added menu_terms from extraction: ${JSON.stringify(entities.menu_terms)}`,
    );
  }

  if (
    hints.intent_hint &&
    routerOutput.confidence < 0.7 &&
    !hints.specific_restaurant
  ) {
    routerOutput.intent = hints.intent_hint;
    routerOutput.confidence = Math.max(routerOutput.confidence, 0.65);
  }

  return { ...routerOutput, entities };
}

module.exports = {
  latinize,
  preRoute,
  mergeHints,
};
