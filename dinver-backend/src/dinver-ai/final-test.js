#!/usr/bin/env node
'use strict';

// End-to-end test for Dinver AI improvements
const { classifyIntent } = require('./intentClassifier');

console.log('🚀 Finalni test Dinver AI poboljšanja...\n');

// Real-world test cases
const realWorldTests = [
  { text: 'Gdje mogu pojesti dobru pizzu u blizini?', lang: 'hr', expected: 'combined_search' },
  { text: 'Koliko košta jelo u restoranu X?', lang: 'hr', expected: 'price' },
  { text: 'Može li se rezervirati stol?', lang: 'hr', expected: 'reservations' },
  { text: 'Imaju li bezglutenska jela?', lang: 'hr', expected: 'dietary_types' },
  { text: 'What time do you close on Sunday?', lang: 'en', expected: 'hours' },
  { text: 'Do you have outdoor seating?', lang: 'en', expected: 'perks' },
  { text: 'Pizza place with parking near me', lang: 'en', expected: 'combined_search' },
  { text: 'What does this restaurant offer?', lang: 'en', expected: 'what_offers' },
];

console.log('📝 Real-world scenario tests:\n');

let passed = 0;
realWorldTests.forEach((test, index) => {
  const result = classifyIntent(test.text, test.lang);
  const success = result === test.expected;
  
  console.log(`${success ? '✅' : '❌'} ${test.text}`);
  console.log(`   Expected: ${test.expected} | Got: ${result}\n`);
  
  if (success) passed++;
});

console.log(`📊 Real-world tests: ${passed}/${realWorldTests.length} passed (${Math.round(passed/realWorldTests.length*100)}%)\n`);

// Edge cases
const edgeCases = [
  { text: '', lang: 'hr', expected: 'out_of_scope' },
  { text: 'Kakvo je vrijeme danas?', lang: 'hr', expected: 'out_of_scope' },
  { text: 'How are you?', lang: 'en', expected: 'out_of_scope' },
  { text: 'Pizza pizza pizza', lang: 'hr', expected: 'menu_search' },
];

console.log('🔍 Edge case tests:\n');

let edgePassed = 0;
edgeCases.forEach((test, index) => {
  const result = classifyIntent(test.text, test.lang);
  const success = result === test.expected;
  
  console.log(`${success ? '✅' : '❌'} "${test.text}" → ${result}`);
  if (success) edgePassed++;
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