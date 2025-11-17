#!/usr/bin/env node
'use strict';

/**
 * Test off-topic question handling
 * Usage: node test-off-topic.js
 */

require('dotenv').config();
const { generateNaturalReplyWithClaude } = require('./src/dinver-ai/llmClaude');

const OFF_TOPIC_QUESTIONS = [
  // Croatian
  { question: 'Je li trava zelena?', lang: 'hr', expectedBehavior: 'Decline + redirect to restaurants' },
  { question: 'Kakvo je vrijeme danas?', lang: 'hr', expectedBehavior: 'Decline + redirect to restaurants' },
  { question: 'Tko je predsjednik Hrvatske?', lang: 'hr', expectedBehavior: 'Decline + redirect to restaurants' },
  { question: 'Kako riješiti ovaj matematički problem?', lang: 'hr', expectedBehavior: 'Decline + redirect to restaurants' },
  { question: 'Koji je najbolji mobitel za kupiti?', lang: 'hr', expectedBehavior: 'Decline + redirect to restaurants' },
  { question: 'Kako naučiti programirati?', lang: 'hr', expectedBehavior: 'Decline + redirect to restaurants' },

  // English
  { question: 'Is the grass green?', lang: 'en', expectedBehavior: 'Decline + redirect to restaurants' },
  { question: 'What is the weather today?', lang: 'en', expectedBehavior: 'Decline + redirect to restaurants' },
  { question: 'Who is the president?', lang: 'en', expectedBehavior: 'Decline + redirect to restaurants' },
  { question: 'How to solve this math problem?', lang: 'en', expectedBehavior: 'Decline + redirect to restaurants' },

  // Edge cases - should answer (restaurant-related)
  { question: 'Kakvo je vrijeme - trebam li terasu?', lang: 'hr', expectedBehavior: 'Should answer (related to outdoor dining)' },
  { question: 'Ima li restoran terasu za lijep dan?', lang: 'hr', expectedBehavior: 'Should answer (restaurant question)' },
];

async function testOffTopicQuestions() {
  console.log('🚫 Testing Off-Topic Question Handling\n');
  console.log('=' .repeat(80));

  let passed = 0;
  let failed = 0;

  for (const [index, test] of OFF_TOPIC_QUESTIONS.entries()) {
    console.log(`\n--- Test ${index + 1}/${OFF_TOPIC_QUESTIONS.length} ---`);
    console.log(`❓ Question (${test.lang.toUpperCase()}): "${test.question}"`);
    console.log(`🎯 Expected: ${test.expectedBehavior}`);

    try {
      const startTime = Date.now();

      const response = await generateNaturalReplyWithClaude({
        lang: test.lang,
        intent: 'out_of_scope',
        question: test.question,
        data: {},
        fallback: test.lang === 'hr'
          ? 'Mogu pomoći samo s pitanjima vezanim za Dinver partner restorane.'
          : 'I can only help with questions about Dinver partner restaurants.',
      });

      const duration = Date.now() - startTime;

      console.log(`\n💬 Claude Response (${duration}ms):`);
      console.log(`   ${response}`);

      // Check if response appropriately declines
      const isDecline = test.lang === 'hr'
        ? /mogu pomoći.*restoran|samo.*restoran|pitanj.*restoran/i.test(response)
        : /can only help.*restaurant|help.*restaurant.*question/i.test(response);

      if (test.expectedBehavior.includes('Decline') && isDecline) {
        console.log(`\n✅ PASS - Correctly declined off-topic question`);
        passed++;
      } else if (test.expectedBehavior.includes('Should answer') && !isDecline) {
        console.log(`\n✅ PASS - Correctly answered restaurant-related question`);
        passed++;
      } else {
        console.log(`\n❌ FAIL - Response doesn't match expected behavior`);
        failed++;
      }

    } catch (error) {
      console.error(`\n❌ Error:`, error.message);
      failed++;
    }

    console.log('\n' + '-'.repeat(80));
  }

  console.log(`\n📊 RESULTS:`);
  console.log(`   ✅ Passed: ${passed}/${OFF_TOPIC_QUESTIONS.length}`);
  console.log(`   ❌ Failed: ${failed}/${OFF_TOPIC_QUESTIONS.length}`);
  console.log(`   Success Rate: ${Math.round((passed / OFF_TOPIC_QUESTIONS.length) * 100)}%`);
  console.log('\n' + '=' .repeat(80));

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Off-topic protection is working correctly.');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Review the responses above.`);
  }
}

// Run the test
if (require.main === module) {
  testOffTopicQuestions()
    .then(() => {
      console.log('\n✨ Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testOffTopicQuestions };
