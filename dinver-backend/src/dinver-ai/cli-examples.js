#!/usr/bin/env node

'use strict';

const {
  addExample,
  loadExternalExamples,
  initializeDefaultExamples,
} = require('./externalExamples');

/**
 * CLI tool for managing external examples
 * Usage: node cli-examples.js [command] [options]
 */

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'init':
      await initializeDefaultExamples();
      console.log('✅ Default examples initialized');
      break;

    case 'add':
      await addExampleFromArgs();
      break;

    case 'list':
      await listExamples();
      break;

    case 'help':
      showHelp();
      break;

    default:
      console.log('Unknown command. Use "help" for usage information.');
      process.exit(1);
  }
}

async function addExampleFromArgs() {
  const args = process.argv.slice(3);

  if (args.length < 4) {
    console.log(
      'Usage: node cli-examples.js add <intent> <language> <question> <response>',
    );
    console.log(
      'Example: node cli-examples.js add nearby hr "Gdje ima dobru pizzu?" "U blizini imate odlične opcije..."',
    );
    process.exit(1);
  }

  const [intent, language, question, response] = args;

  try {
    await addExample({
      intent,
      language,
      question,
      response,
    });
    console.log('✅ Example added successfully');
  } catch (error) {
    console.error('❌ Error adding example:', error.message);
    process.exit(1);
  }
}

async function listExamples() {
  const examples = await loadExternalExamples();

  if (!examples || examples.examples.length === 0) {
    console.log(
      'No examples found. Run "node cli-examples.js init" to initialize default examples.',
    );
    return;
  }

  console.log('\n📋 External Examples:');
  console.log('====================');

  examples.examples.forEach((example, index) => {
    console.log(`\n${index + 1}. [${example.intent}] (${example.language})`);
    console.log(`   Q: ${example.question}`);
    console.log(`   A: ${example.response}`);
    console.log(
      `   Added: ${new Date(example.createdAt).toLocaleDateString()}`,
    );
  });
}

function showHelp() {
  console.log(`
🤖 Dinver AI Examples Manager

Commands:
  init                    Initialize with default examples
  add <intent> <lang> <question> <response>    Add a new example
  list                    List all examples
  help                    Show this help

Examples:
  node cli-examples.js init
  node cli-examples.js add nearby hr "Gdje ima dobru pizzu?" "U blizini imate odlične opcije..."
  node cli-examples.js add menu_search en "Does it have pizza?" "Yes, they have excellent pizza options..."
  node cli-examples.js list

Intents: nearby, menu_search, hours, contact, description, reviews, reservations
Languages: hr, en
`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
