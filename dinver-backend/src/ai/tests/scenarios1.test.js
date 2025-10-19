#!/usr/bin/env node
'use strict';

/**
 * Scenario-based test script for Dinver AI
 * Tests real-world user scenarios with location context
 */

require('dotenv').config();
const { chatAgent } = require('../index');

// Zagreb coordinates (user's default location)
const ZAGREB_COORDS = { latitude: 45.815, longitude: 15.9819 };

// Vinkovci coordinates (for context)
const VINKOVCI_COORDS = { latitude: 45.2883, longitude: 18.8047 };

const TEST_SCENARIOS = [
  {
    id: 1,
    userLocation: 'Vinkovci',
    coords: VINKOVCI_COORDS,
    message: 'Preporuči mi restoran koji ima stolice za djecu i da ima pizzu?',
    expectedBehavior: 'Should search for pizza restaurants in Vinkovci that have high chairs for children (using user location)',
  },
  {
    id: 2,
    userLocation: 'Zagreb',
    coords: ZAGREB_COORDS,
    message: 'Gdje da jedem biftek u Vinkovcima?',
    expectedBehavior: 'Should search for biftek in Vinkovci (city mentioned overrides user location)',
  },
  {
    id: 3,
    userLocation: 'Vinkovci',
    coords: VINKOVCI_COORDS,
    message: 'Radi li Restoran Marabu sada?',
    expectedBehavior: 'Should check working hours for Restoran Marabu',
  },
  {
    id: 4,
    userLocation: 'Vinkovci',
    coords: VINKOVCI_COORDS,
    message: 'Ima li Marabu lazanje?',
    expectedBehavior: 'Should search menu items (lazanje) in restaurant Marabu',
  },
  {
    id: 5,
    userLocation: 'Vinkovci',
    coords: VINKOVCI_COORDS,
    message: 'Ima li restoran Marabu vegetarijansku hranu?',
    expectedBehavior: 'Should get restaurant details for Marabu and check dietary options',
  },
];

async function runScenario(scenario) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Scenario #${scenario.id}`);
  console.log(`User Location: ${scenario.userLocation} (${scenario.coords.latitude}, ${scenario.coords.longitude})`);
  console.log(`Message: "${scenario.message}"`);
  console.log(`Expected: ${scenario.expectedBehavior}`);
  console.log(`${'='.repeat(70)}`);

  try {
    const result = await chatAgent({
      message: scenario.message,
      language: 'hr',
      latitude: scenario.coords.latitude,
      longitude: scenario.coords.longitude,
      radiusKm: 60,
    });

    console.log('\n✅ Result:');
    console.log(JSON.stringify(result, null, 2));

    return { scenarioId: scenario.id, success: true, result };
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    return { scenarioId: scenario.id, success: false, error: error.message };
  }
}

async function runAllScenarios() {
  console.log('\n🎯 Dinver AI - Scenario Test Suite');
  console.log(`Testing ${TEST_SCENARIOS.length} real-world scenarios...\n`);

  // Check env vars
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set in environment');
    process.exit(1);
  }

  if (!process.env.APP_API_KEY) {
    console.warn('⚠️  APP_API_KEY not set - backend API calls may fail');
  }

  const results = [];

  for (const scenario of TEST_SCENARIOS) {
    const result = await runScenario(scenario);
    results.push(result);

    // Wait between tests to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Summary
  console.log('\n\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`✅ Successful: ${successful}/${TEST_SCENARIOS.length}`);
  console.log(`❌ Failed: ${failed}/${TEST_SCENARIOS.length}`);

  if (failed > 0) {
    console.log('\nFailed scenarios:');
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - Scenario #${r.scenarioId}: ${r.error}`);
      });
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  runAllScenarios().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runAllScenarios, runScenario, TEST_SCENARIOS };
