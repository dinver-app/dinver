'use strict';
const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INTENTS = [
  {
    id: 'hours',
    desc: 'Working hours questions. Keywords: radi li, otvoren, zatvoren, dokad, kada, danas, sada, open, closed',
    examples: [
      'Radi li danas?',
      'Do kada rade?',
      'Jel otvoreno sada?',
      'Working hours?',
      'Are you open?',
    ],
  },
  {
    id: 'nearby',
    desc: 'Find partner restaurants (isClaimed=true) near provided coordinates (latitude/longitude). May include filters like terrace, vegetarian, etc.',
    examples: [
      'Restorani blizu mene',
      'Near me',
      'U blizini',
      'Restaurants nearby',
    ],
  },
  {
    id: 'menu_search',
    desc: 'Search dishes/drinks via MenuItemTranslations/DrinkItemTranslations and map to restaurantId; results only for partners.',
    examples: [
      'Ima li pizzu?',
      'Što nudi?',
      'Jelovnik',
      'Ima li burgere?',
      'What do you serve?',
      'Menu?',
    ],
  },
  {
    id: 'menu_stats',
    desc: 'Menu statistics for a specific restaurant: most expensive / cheapest items with prices based on MenuItem/DrinkItem price fields.',
    examples: [
      'Najskuplje jelo?',
      'Što je najjeftinije?',
      'Koliko košta najskuplja pizza?',
      'Most expensive?',
      'Cheapest item?',
    ],
  },
  {
    id: 'perks',
    desc: 'Amenities from establishmentPerks (resolve ids). Examples: terrace, high chair, takeaway, AC.',
    examples: [
      'Ima li terasu?',
      'Parking?',
      'WiFi?',
      'Terrace?',
      'Air conditioning?',
    ],
  },
  {
    id: 'meal_types',
    desc: 'Meals served via mealTypes ids (breakfast/lunch/dinner/brunch).',
    examples: [
      'Doručak?',
      'Ručak?',
      'Večera?',
      'Breakfast?',
      'Lunch?',
      'Dinner?',
    ],
  },
  {
    id: 'dietary_types',
    desc: 'Dietary options via dietaryTypes ids (vegetarian, vegan, halal, gluten free).',
    examples: [
      'Vegetarijanska hrana?',
      'Vegan opcije?',
      'Gluten free?',
      'Vegetarian?',
      'Vegan?',
    ],
  },
  {
    id: 'reservations',
    desc: 'Whether Dinver reservations are enabled (reservationEnabled boolean).',
    examples: [
      'Rezervacije?',
      'Mogu li rezervirati?',
      'Reservations?',
      'Can I book?',
    ],
  },
  {
    id: 'contact',
    desc: 'websiteUrl, fbUrl, igUrl, ttUrl, phone, email.',
    examples: ['Kontakt?', 'Telefon?', 'Email?', 'Contact?', 'Phone?'],
  },
  {
    id: 'description',
    desc: 'description.hr / description.en from translations.',
    examples: [
      'Opis restorana?',
      'O restoranu?',
      'About the restaurant?',
      'Description?',
    ],
  },
  {
    id: 'virtual_tour',
    desc: 'virtualTourUrl presence and link.',
    examples: ['Virtualna tura?', 'Virtual tour?', '360°?'],
  },
  {
    id: 'price',
    desc: 'priceCategory (nameHr/nameEn/icon/level).',
    examples: ['Cijene?', 'Koliko košta?', 'Price range?', 'How expensive?'],
  },
  {
    id: 'reviews',
    desc: 'ratings (overall, foodQuality, service, atmosphere) and total reviews.',
    examples: ['Recenzije?', 'Ocjene?', 'Reviews?', 'Ratings?'],
  },
  {
    id: 'out_of_scope',
    desc: 'Anything not about Dinver restaurants/menus or partners.',
    examples: ['Weather?', 'Politics?', 'Vrijeme?', 'Politika?'],
  },
];

async function inferIntent({ lang, message }) {
  if (!process.env.OPENAI_API_KEY) return { intent: 'out_of_scope' };

  try {
    const system = `You are an intent classifier for Dinver restaurant chatbot.
    
    IMPORTANT RULES:
    1. For menu questions, extract the CANONICAL food term (base form)
    2. For general menu questions ("ponuda", "što nudi", "jelovnik"), set menuTerm=null
    3. Handle Croatian declensions: pizzu→pizza, burgere→burger, lazanje→lazanje
    4. For price questions about specific items, use menu_stats intent
    5. If asking about a restaurant generally, use description intent
    6. For general "what do you offer" questions, use menu_search with menuTerm=null
    
    Return JSON: {
      "intent": "one of: ${INTENTS.map((i) => i.id).join(', ')}",
      "restaurantQuery": "extracted restaurant name or null",
      "filters": {"perk": "terrace/parking/etc or null"},
      "menuTerm": "canonical food term or null",
      "confidence": 0-1
    }`;

    // Dodaj primjere u prompt za bolju klasifikaciju
    const examplesText = INTENTS.map(
      (i) => `${i.id}: ${i.desc}\nExamples: ${i.examples?.join(', ')}`,
    ).join('\n\n');

    const prompt = `Question: ${message}
    Language: ${lang}
    
    Available intents with examples:
    ${examplesText}
    
    Classify the intent and extract entities.`;

    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const text = resp.choices?.[0]?.message?.content || '{}';
    const json = JSON.parse(text);

    // Validacija i fallback
    if (json.confidence && json.confidence < 0.5) {
      console.log('[LLM Router] Low confidence, using fallback classification');
      // Ako je low confidence, pokušaj s jednostavnim klasifikatorom
      const { classifyIntent } = require('./intentClassifier');
      const simpleIntent = classifyIntent(message, lang);
      if (simpleIntent !== 'out_of_scope') {
        json.intent = simpleIntent;
        json.confidence = 0.3; // Lower confidence for fallback
      }
    }

    const intent =
      typeof json.intent === 'string' ? json.intent : 'out_of_scope';
    const restaurantQuery =
      typeof json.restaurantQuery === 'string' ? json.restaurantQuery : null;
    const filters =
      typeof json.filters === 'object' && json.filters !== null
        ? json.filters
        : null;
    const menuTerm = typeof json.menuTerm === 'string' ? json.menuTerm : null;
    const confidence =
      typeof json.confidence === 'number' ? json.confidence : 1.0;

    console.log('[LLM Router] Classification result:', {
      message: message.substring(0, 50) + '...',
      intent,
      confidence,
      restaurantQuery,
      menuTerm,
    });

    return { intent, restaurantQuery, filters, menuTerm, confidence };
  } catch (e) {
    console.error('LLM router error:', e?.message || e);
    // Fallback na jednostavan klasifikator
    const { classifyIntent } = require('./intentClassifier');
    return {
      intent: classifyIntent(message, lang),
      restaurantQuery: null,
      filters: null,
      menuTerm: null,
      confidence: 0.1,
    };
  }
}

module.exports = { inferIntent };
