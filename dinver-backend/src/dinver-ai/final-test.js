// Testovi za upite s restaurantId/threadId (konkretni restoran)
const contextTests = [
  { text: 'Što nudi ovaj restoran?', lang: 'hr', context: { restaurantId: 'abc123' }, expected: 'what_offers' },
  { text: 'What does this restaurant offer?', lang: 'en', context: { restaurantId: 'abc123' }, expected: 'what_offers' },
  { text: 'Imate li vi parking?', lang: 'hr', context: { restaurantId: 'abc123' }, expected: 'perks' },
  { text: 'Do you have outdoor seating?', lang: 'en', context: { restaurantId: 'abc123' }, expected: 'perks' },
  { text: 'Koja jela imate na meniju?', lang: 'hr', context: { restaurantId: 'abc123' }, expected: 'menu_search' },
  { text: 'What drinks do you offer?', lang: 'en', context: { restaurantId: 'abc123' }, expected: 'menu_search' },
  { text: 'Imate li bezglutenska jela?', lang: 'hr', context: { restaurantId: 'abc123' }, expected: 'dietary_types' },
  { text: 'Do you have vegan meals?', lang: 'en', context: { restaurantId: 'abc123' }, expected: 'dietary_types' },
  { text: 'Koje je radno vrijeme restorana?', lang: 'hr', context: { restaurantId: 'abc123' }, expected: 'hours' },
  { text: 'What are the opening hours?', lang: 'en', context: { restaurantId: 'abc123' }, expected: 'hours' },
  // Kombinacija perks + menu_search
  { text: 'Imate li vi parking i pizzu?', lang: 'hr', context: { restaurantId: 'abc123' }, expected: 'combined_search' },
  { text: 'Do you have outdoor seating and vegan options?', lang: 'en', context: { restaurantId: 'abc123' }, expected: 'combined_search' },
  // Edge case: bez restaurantId
  { text: 'Što nudi ovaj restoran?', lang: 'hr', context: {}, expected: 'combined_search' },
  { text: 'Imate li vi parking?', lang: 'hr', context: {}, expected: 'combined_search' },
];

console.log('🧪 Testovi za upite s restaurantId/threadId (konkretni restoran):\n');
let contextPassed = 0;
contextTests.forEach((test, index) => {
  const result = require('./intentClassifier').classifyIntent(test.text, test.lang, test.context);
  const success = result === test.expected;
  console.log(`${success ? '✅' : '❌'} ${test.text} [context: ${JSON.stringify(test.context)}]`);
  console.log(`   Expected: ${test.expected} | Got: ${result}\n`);
  if (success) contextPassed++;
});

'use strict';

// End-to-end test for Dinver AI improvements
const { classifyIntent } = require('./intentClassifier');

console.log('🚀 Finalni test Dinver AI poboljšanja...\n');


// Prošireni real-world testovi
const realWorldTests = [
  // Menu search & synonyms
  { text: 'Gdje mogu pojesti dobru pizzu u blizini?', lang: 'hr', expected: 'combined_search' },
  { text: 'Gdje ima pica?', lang: 'hr', expected: 'menu_search' },
  { text: 'Where can I get pizza?', lang: 'en', expected: 'menu_search' },
  { text: 'Restoran s burgerima i parkingom', lang: 'hr', expected: 'combined_search' },
  { text: 'Pizza place with parking near me', lang: 'en', expected: 'combined_search' },

  // Working hours
  { text: 'Koje je radno vrijeme restorana?', lang: 'hr', expected: 'hours' },
  { text: 'What are the opening hours?', lang: 'en', expected: 'hours' },
  { text: 'Kada se zatvara restoran?', lang: 'hr', expected: 'hours' },
  { text: 'What time do you close on Sunday?', lang: 'en', expected: 'hours' },

  // Description
  { text: 'Možeš li opisati restoran?', lang: 'hr', expected: 'description' },
  { text: 'Can you describe the restaurant?', lang: 'en', expected: 'description' },

  // Establishment perks
  { text: 'Ima li restoran parking?', lang: 'hr', expected: 'perks' },
  { text: 'Do you have outdoor seating?', lang: 'en', expected: 'perks' },
  { text: 'Restoran s terasom i parkingom', lang: 'hr', expected: 'combined_search' },

  // Meal types
  { text: 'Koje vrste obroka nudite?', lang: 'hr', expected: 'meal_types' },
  { text: 'What meal types are available?', lang: 'en', expected: 'meal_types' },

  // Dietary types
  { text: 'Imate li bezglutenska jela?', lang: 'hr', expected: 'dietary_types' },
  { text: 'Do you have gluten-free meals?', lang: 'en', expected: 'dietary_types' },
  { text: 'Restoran s veganskim opcijama', lang: 'hr', expected: 'combined_search' },
  { text: 'Vegan restaurant near me', lang: 'en', expected: 'combined_search' },

  // Menu items
  { text: 'Koja jela imate na meniju?', lang: 'hr', expected: 'menu_search' },
  { text: 'What dishes are on the menu?', lang: 'en', expected: 'menu_search' },

  // Drink items
  { text: 'Koja pića nudite?', lang: 'hr', expected: 'menu_search' },
  { text: 'What drinks do you offer?', lang: 'en', expected: 'menu_search' },

  // Price
  { text: 'Koliko košta jelo u restoranu X?', lang: 'hr', expected: 'price' },
  { text: 'What is the price of pizza?', lang: 'en', expected: 'price' },

  // Reservations
  { text: 'Može li se rezervirati stol?', lang: 'hr', expected: 'reservations' },
  { text: 'Can I book a table?', lang: 'en', expected: 'reservations' },

  // Contact
  { text: 'Koji je broj telefona restorana?', lang: 'hr', expected: 'contact' },
  { text: 'What is the restaurant phone number?', lang: 'en', expected: 'contact' },

  // What offers
  { text: 'Što nudi ovaj restoran?', lang: 'hr', expected: 'what_offers' },
  { text: 'What does this restaurant offer?', lang: 'en', expected: 'what_offers' },

  // Reviews
  { text: 'Kakve su recenzije?', lang: 'hr', expected: 'reviews' },
  { text: 'What are the reviews like?', lang: 'en', expected: 'reviews' },
];


console.log('📝 Prošireni real-world scenario tests:\n');
let passed = 0;
realWorldTests.forEach((test, index) => {
  const result = classifyIntent(test.text, test.lang);
  const success = result === test.expected;
  console.log(`${success ? '✅' : '❌'} ${test.text}`);
  console.log(`   Expected: ${test.expected} | Got: ${result}\n`);
  if (success) passed++;
});
console.log(`📊 Real-world tests: ${passed}/${realWorldTests.length} passed (${Math.round(passed/realWorldTests.length*100)}%)\n`);


// Edge cases + language checks
const edgeCases = [
  { text: '', lang: 'hr', expected: 'out_of_scope' },
  { text: 'Kakvo je vrijeme danas?', lang: 'hr', expected: 'out_of_scope' },
  { text: 'How are you?', lang: 'en', expected: 'out_of_scope' },
  { text: 'Pizza pizza pizza', lang: 'hr', expected: 'menu_search' },
  // Language checks
  { text: 'Koje je radno vrijeme?', lang: 'hr', expected: 'hours', checkLang: 'hr' },
  { text: 'What are the opening hours?', lang: 'en', expected: 'hours', checkLang: 'en' },
  { text: 'Imate li veganska jela?', lang: 'hr', expected: 'dietary_types', checkLang: 'hr' },
  { text: 'Do you have vegan meals?', lang: 'en', expected: 'dietary_types', checkLang: 'en' },
];


console.log('🔍 Edge case & language tests:\n');
let edgePassed = 0;
edgeCases.forEach((test, index) => {
  const result = classifyIntent(test.text, test.lang);
  const success = result === test.expected;
  let langCheck = true;
  if (test.checkLang) {
    // Simulate reply language check (replace with real LLM call in integration)
    langCheck = test.lang === test.checkLang;
  }
  console.log(`${success && langCheck ? '✅' : '❌'} "${test.text}" → ${result} ${test.checkLang ? `(lang: ${test.lang})` : ''}`);
  if (success && langCheck) edgePassed++;
});
console.log(`\n📊 Edge cases: ${edgePassed}/${edgeCases.length} passed (${Math.round(edgePassed/edgeCases.length*100)}%)\n`);

const totalTests = realWorldTests.length + edgeCases.length;
const totalPassed = passed + edgePassed;
const totalPercentage = Math.round(totalPassed/totalTests*100);

console.log('🎯 FINALNI REZULTAT:');
console.log(`📈 Ukupno: ${totalPassed}/${totalTests} testova prošlo (${totalPercentage}%)`);

if (totalPercentage >= 85) {
  console.log('🎉 USPJEH! Dinver AI poboljšanja su uspješno implementirana!');
  console.log('✅ Sistem je spreman za produkciju.');
} else {
  console.log('⚠️  Trebaju dodatne iteracije za optimalne rezultate.');
}

console.log('\n🔗 Sljedeći koraci:');
console.log('1. Deploy u development environment');
console.log('2. A/B test s pravim korisnicima');
console.log('3. Monitor feedback i performanse');
console.log('4. Iterativno poboljšavanje na temelju podataka');