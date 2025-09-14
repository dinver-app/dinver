'use strict';
const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INTENTS = [
  {
    id: 'hours',
    desc: 'Read openingHours.periods (7 items, 0=Mon..6=Sun). If close.day is next day, treat as after midnight. Consider customWorkingDays.',
  },
  {
    id: 'nearby',
    desc: 'Find partner restaurants (isClaimed=true) near provided coordinates (latitude/longitude). May include filters like terrace, vegetarian, etc.',
  },
  {
    id: 'menu_search',
    desc: 'Search dishes/drinks via MenuItemTranslations/DrinkItemTranslations and map to restaurantId; results only for partners.',
  },
  {
    id: 'menu_stats',
    desc: 'Menu statistics for a specific restaurant: most expensive / cheapest items with prices based on MenuItem/DrinkItem price fields.',
  },
  {
    id: 'perks',
    desc: 'Amenities from establishmentPerks (resolve ids). Examples: terrace, high chair, takeaway, AC.',
  },
  {
    id: 'meal_types',
    desc: 'Meals served via mealTypes ids (breakfast/lunch/dinner/brunch).',
  },
  {
    id: 'dietary_types',
    desc: 'Dietary options via dietaryTypes ids (vegetarian, vegan, halal, gluten free).',
  },
  {
    id: 'reservations',
    desc: 'Whether Dinver reservations are enabled (reservationEnabled boolean).',
  },
  { id: 'contact', desc: 'websiteUrl, fbUrl, igUrl, ttUrl, phone, email.' },
  {
    id: 'description',
    desc: 'description.hr / description.en from translations.',
  },
  { id: 'virtual_tour', desc: 'virtualTourUrl presence and link.' },
  { id: 'price', desc: 'priceCategory (nameHr/nameEn/icon/level).' },
  {
    id: 'reviews',
    desc: 'ratings (overall, foodQuality, service, atmosphere) and total reviews.',
  },
  {
    id: 'out_of_scope',
    desc: 'Anything not about Dinver restaurants/menus or partners.',
  },
];

async function inferIntent({ lang, message }) {
  if (!process.env.OPENAI_API_KEY) return { intent: 'out_of_scope' };
  try {
    const system = [
      'You select one best intent for a Dinver restaurant question.',
      'Return strict JSON only.',
      'If the question is not about Dinver restaurants/menus, use out_of_scope.',
      'Fields: intent (one of: ' +
        INTENTS.map((i) => i.id).join(', ') +
        '), restaurantQuery (string|null), filters (object|null), menuTerm (string|null).',
      'For menu_search specifically, extract a single canonical food/drink term (menuTerm), lemmatized to its base form in the same language (e.g., "pizza" for "pizzu/pizzi/pice/picu"). If unclear, set menuTerm to null.',
      'If the user asks generally what a restaurant offers or what is on the menu (phrases: "u ponudi", "ponuda", "jelovnik", "meni", "sta nudi/što nudi", "ima", or in EN: "what do they serve/offer/have"), choose intent=menu_search and set menuTerm=null.',
      'filters may include: perk (e.g., "terrace"/"vanjska terasa"). If none, set filters to null.',
    ].join('\n');

    const prompt = [
      'Question: ' + message,
      'Intents and data model hints:',
      ...INTENTS.map((i) => `- ${i.id}: ${i.desc}`),
      'Decide the single best intent and extract restaurantQuery when a specific restaurant is implied or named.',
      'Also extract simple filters when present (e.g., a perk like terrace).',
      'If intent is menu_search, provide menuTerm as the base food/drink word to search in our DB (no extra words like restaurant names). For general menu questions, set menuTerm to null.',
    ].join('\n');

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
    const intent =
      typeof json.intent === 'string' ? json.intent : 'out_of_scope';
    const restaurantQuery =
      typeof json.restaurantQuery === 'string' ? json.restaurantQuery : null;
    const filters =
      typeof json.filters === 'object' && json.filters !== null
        ? json.filters
        : null;
    const menuTerm = typeof json.menuTerm === 'string' ? json.menuTerm : null;
    return { intent, restaurantQuery, filters, menuTerm };
  } catch (e) {
    console.error('LLM router error:', e?.message || e);
    return { intent: 'out_of_scope' };
  }
}

module.exports = { inferIntent };
