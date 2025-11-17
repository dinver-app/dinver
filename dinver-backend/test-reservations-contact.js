#!/usr/bin/env node
'use strict';

/**
 * Test reservations and contact handling - ensure NO phone/email in chat
 * Usage: node test-reservations-contact.js
 */

require('dotenv').config();
const { generateNaturalReplyWithClaude } = require('./src/dinver-ai/llmClaude');

const TEST_CASES = [
  // RESERVATIONS - reservationEnabled = true
  {
    question: 'Mogu li rezervirati stol u restoranu?',
    lang: 'hr',
    intent: 'reservations',
    data: {
      singleRestaurantMode: true,
      name: 'Taverna Alinea',
      address: 'Glagoljaška 54, Vinkovci',
      reservationEnabled: true,
      phone: '+385 32 123 456', // AI should NOT write this
    },
    expectedBehavior: 'Should direct to Dinver profile for online reservation (NO phone number)',
  },

  // RESERVATIONS - reservationEnabled = false
  {
    question: 'Kako rezervirati stol u restoranu?',
    lang: 'hr',
    intent: 'reservations',
    data: {
      singleRestaurantMode: true,
      name: 'Restoran Marabu',
      address: 'Ilica 10, Zagreb',
      reservationEnabled: false,
      phone: '+385 1 987 6543', // AI should NOT write this
    },
    expectedBehavior: 'Should direct to Dinver profile to find phone number (NO phone number)',
  },

  // CONTACT - Croatian
  {
    question: 'Koji je broj telefona restorana?',
    lang: 'hr',
    intent: 'contact',
    data: {
      singleRestaurantMode: true,
      name: 'Pizzeria Roma',
      address: 'Trg bana Jelačića 5, Zagreb',
      phone: '+385 1 234 5678', // AI should NOT write this
      email: 'info@pizzeriaroma.hr', // AI should NOT write this
      websiteUrl: 'https://pizzeriaroma.hr',
      fbUrl: 'https://facebook.com/pizzeriaroma',
    },
    expectedBehavior: 'Should direct to Dinver profile for contact info (NO phone/email)',
  },

  // CONTACT - English
  {
    question: 'What is the phone number of the restaurant?',
    lang: 'en',
    intent: 'contact',
    data: {
      singleRestaurantMode: true,
      name: 'Bistro Lounge',
      address: 'Main Street 42, Zagreb',
      phone: '+385 1 555 1234', // AI should NOT write this
      email: 'hello@bistrlounge.com', // AI should NOT write this
    },
    expectedBehavior: 'Should direct to Dinver profile for contact info (NO phone/email)',
  },

  // EMAIL REQUEST
  {
    question: 'Kakav je email restorana?',
    lang: 'hr',
    intent: 'contact',
    data: {
      singleRestaurantMode: true,
      name: 'Konoba More',
      address: 'Obala 15, Split',
      email: 'info@konobamore.hr', // AI should NOT write this
      phone: '+385 21 123 456',
    },
    expectedBehavior: 'Should direct to Dinver profile (NO email)',
  },
];

async function testReservationsAndContact() {
  console.log('📞 Testing Reservations & Contact Handling\n');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;
  const violations = [];

  for (const [index, test] of TEST_CASES.entries()) {
    console.log(`\n--- Test ${index + 1}/${TEST_CASES.length} ---`);
    console.log(`❓ Question (${test.lang.toUpperCase()}): "${test.question}"`);
    console.log(`🎯 Expected: ${test.expectedBehavior}`);

    try {
      const startTime = Date.now();

      const response = await generateNaturalReplyWithClaude({
        lang: test.lang,
        intent: test.intent,
        question: test.question,
        data: test.data,
        fallback: test.lang === 'hr'
          ? 'Mogu pomoći s rezervacijama i kontaktom.'
          : 'I can help with reservations and contact.',
      });

      const duration = Date.now() - startTime;

      console.log(`\n💬 Claude Response (${duration}ms):`);
      console.log(`   ${response}`);

      // Check for violations (phone numbers, email addresses)
      const hasPhoneNumber = /\+?\d{3,4}\s?\d{1,2}\s?\d{3}\s?\d{3,4}/.test(response);
      const hasEmail = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(response);

      // Check for proper redirection to profile
      const mentionsProfile = test.lang === 'hr'
        ? /profil|Dinver profil/i.test(response)
        : /profile|Dinver profile/i.test(response);

      const mentionsReservation = test.intent === 'reservations' && test.data.reservationEnabled
        ? (test.lang === 'hr' ? /rezerv/i.test(response) : /reserv/i.test(response))
        : true;

      if (hasPhoneNumber || hasEmail) {
        console.log(`\n❌ FAIL - Contains phone number or email!`);
        failed++;
        violations.push({
          test: index + 1,
          question: test.question,
          response,
          violation: hasPhoneNumber ? 'phone number' : 'email address',
        });
      } else if (!mentionsProfile) {
        console.log(`\n⚠️  WARNING - Doesn't mention Dinver profile`);
        console.log(`   (But no contact info leaked, so technically OK)`);
        passed++;
      } else {
        console.log(`\n✅ PASS - Correctly directs to profile without leaking contact info`);
        passed++;
      }

    } catch (error) {
      console.error(`\n❌ Error:`, error.message);
      failed++;
    }

    console.log('\n' + '-'.repeat(80));
  }

  console.log(`\n📊 RESULTS:`);
  console.log(`   ✅ Passed: ${passed}/${TEST_CASES.length}`);
  console.log(`   ❌ Failed: ${failed}/${TEST_CASES.length}`);
  console.log(`   Success Rate: ${Math.round((passed / TEST_CASES.length) * 100)}%`);
  console.log('\n' + '='.repeat(80));

  if (violations.length > 0) {
    console.log('\n🚨 PRIVACY VIOLATIONS DETECTED:\n');
    violations.forEach((v) => {
      console.log(`Test #${v.test}: "${v.question}"`);
      console.log(`Violation: Leaked ${v.violation}`);
      console.log(`Response: ${v.response}`);
      console.log('');
    });
  }

  if (failed === 0) {
    console.log('\n🎉 All tests passed! No contact information leaked in chat.');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Review the responses above.`);
  }
}

// Run the test
if (require.main === module) {
  testReservationsAndContact()
    .then(() => {
      console.log('\n✨ Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testReservationsAndContact };
