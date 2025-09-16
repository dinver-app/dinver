#!/usr/bin/env node
'use strict';

// Test script to validate Dinver AI improvements
const { classifyIntent, extractIntentsFromText } = require('./intentClassifier');

// Test cases for intent classification
const testCases = [
  // Single intents
  { text: 'Kada radi restoran?', lang: 'hr', expected: 'hours' },
  { text: 'Što nudi restoran?', lang: 'hr', expected: 'what_offers' },
  { text: 'Ima li pizza?', lang: 'hr', expected: 'menu_search' },
  { text: 'Ima li vanjsku terasu?', lang: 'hr', expected: 'perks' },
  
  // Combined intents
  { text: 'Pizza blizu mene s vanjskom terasom', lang: 'hr', expected: 'combined_search' },
  { text: 'Vegetarijanski restoran u blizini', lang: 'hr', expected: 'combined_search' },
  { text: 'Burger near me with parking', lang: 'en', expected: 'combined_search' },
  
  // Enhanced keyword detection
  { text: 'Neki restoran za lazanje blizu mene', lang: 'hr', expected: 'combined_search' },
  { text: 'Ima li stolice za djecu?', lang: 'hr', expected: 'perks' },
  { text: 'Do you serve vegetarian food?', lang: 'en', expected: 'menu_search' },
];

console.log('🧪 Testing Dinver AI Improvements...\n');

let passed = 0;
let total = testCases.length;

testCases.forEach((test, index) => {
  const result = classifyIntent(test.text, test.lang);
  const success = result === test.expected;
  
  console.log(`Test ${index + 1}: ${success ? '✅' : '❌'}`);
  console.log(`  Input: "${test.text}" (${test.lang})`);
  console.log(`  Expected: ${test.expected}`);
  console.log(`  Got: ${result}`);
  
  if (result === 'combined_search') {
    const intents = extractIntentsFromText(test.text, test.lang);
    console.log(`  Detected intents: [${intents.join(', ')}]`);
  }
  
  console.log('');
  
  if (success) passed++;
});

console.log(`\n📊 Results: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);

if (passed === total) {
  console.log('🎉 All tests passed! Dinver AI improvements working correctly.');
} else {
  console.log('⚠️  Some tests failed. Review intent classification logic.');
}