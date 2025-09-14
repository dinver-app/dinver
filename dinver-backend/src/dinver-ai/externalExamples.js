'use strict';

/**
 * External examples loader for OpenTable-style responses
 * This allows you to provide examples of how you want the AI to respond
 */

const fs = require('fs').promises;
const path = require('path');

const EXAMPLES_FILE = path.join(
  __dirname,
  '../../examples/external-examples.json',
);

/**
 * Load external examples from file
 */
async function loadExternalExamples() {
  try {
    const data = await fs.readFile(EXAMPLES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Could not load external examples:', error.message);
    return null;
  }
}

/**
 * Save external examples to file
 */
async function saveExternalExamples(examples) {
  try {
    // Ensure examples directory exists
    const examplesDir = path.dirname(EXAMPLES_FILE);
    await fs.mkdir(examplesDir, { recursive: true });

    await fs.writeFile(EXAMPLES_FILE, JSON.stringify(examples, null, 2));
    return true;
  } catch (error) {
    console.error('Could not save external examples:', error.message);
    return false;
  }
}

/**
 * Add a new example to the collection
 */
async function addExample(example) {
  const examples = (await loadExternalExamples()) || { examples: [] };

  // Validate example structure
  if (
    !example.intent ||
    !example.language ||
    !example.question ||
    !example.response
  ) {
    throw new Error(
      'Example must have intent, language, question, and response',
    );
  }

  examples.examples.push({
    id: Date.now().toString(),
    ...example,
    createdAt: new Date().toISOString(),
  });

  return await saveExternalExamples(examples);
}

/**
 * Get examples for specific intent and language
 */
async function getExamplesForIntent(intent, language) {
  const examples = await loadExternalExamples();
  if (!examples) return [];

  return examples.examples.filter(
    (ex) => ex.intent === intent && ex.language === language,
  );
}

/**
 * Generate system prompt with external examples
 */
async function generateSystemPromptWithExternalExamples(intent, language) {
  const examples = await getExamplesForIntent(intent, language);

  if (examples.length === 0) return '';

  let examplesText = '\n\nEXTERNAL EXAMPLES (OpenTable-style):\n';
  examples.forEach((example) => {
    examplesText += `\nQuestion: ${example.question}\n`;
    examplesText += `Response: ${example.response}\n`;
  });
  examplesText += '\nUse similar style and tone in your response.\n';

  return examplesText;
}

/**
 * Initialize with default examples
 */
async function initializeDefaultExamples() {
  const defaultExamples = {
    examples: [
      {
        id: '1',
        intent: 'nearby',
        language: 'hr',
        question: 'Gdje u blizini imaju dobru pizzu?',
        response:
          'U blizini imate nekoliko odličnih opcija za pizzu. Taverna Alinea na 0.5 km ima autentičnu talijansku pizzu, a Marabu caffe & pizzeria na 0.3 km nudi raznovrsne varijante. Oba su trenutno otvorena. Koji vam se čini najzanimljiviji?',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        intent: 'nearby',
        language: 'en',
        question: 'Where nearby has good pizza?',
        response:
          'You have several great pizza options nearby. Taverna Alinea at 0.5 km offers authentic Italian pizza, while Marabu caffe & pizzeria at 0.3 km has diverse varieties. Both are currently open. Which one interests you most?',
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        intent: 'menu_search',
        language: 'hr',
        question: 'Ima li restoran Vatikan pizzu?',
        response:
          'Da, restoran Vatikan ima odličnu pizzu u svom jelovniku. Imaju Margherita za 12 €, Capricciosa za 15 € i Quattro Stagioni za 16 €. Svi su napravljeni s autentičnim talijanskim sastojcima. Želite li znati više o sastojcima?',
        createdAt: new Date().toISOString(),
      },
      {
        id: '4',
        intent: 'menu_search',
        language: 'en',
        question: 'Does Vatikan restaurant have pizza?',
        response:
          'Yes, Vatikan restaurant has excellent pizza on their menu. They offer Margherita for 12 €, Capricciosa for 15 €, and Quattro Stagioni for 16 €. All are made with authentic Italian ingredients. Would you like to know more about the ingredients?',
        createdAt: new Date().toISOString(),
      },
      {
        id: '5',
        intent: 'hours',
        language: 'hr',
        question: 'Radi li restoran Vatikan nedjeljom?',
        response:
          'Nažalost, restoran Vatikan je nedjeljom zatvoren. Radi od ponedjeljka do subote od 10:00 do 22:00. Trebate li rezervaciju za neki drugi dan?',
        createdAt: new Date().toISOString(),
      },
      {
        id: '6',
        intent: 'hours',
        language: 'en',
        question: 'Is Vatikan restaurant open on Sunday?',
        response:
          "Unfortunately, Vatikan restaurant is closed on Sundays. They're open Monday through Saturday from 10:00 to 22:00. Do you need a reservation for another day?",
        createdAt: new Date().toISOString(),
      },
    ],
  };

  return await saveExternalExamples(defaultExamples);
}

module.exports = {
  loadExternalExamples,
  saveExternalExamples,
  addExample,
  getExamplesForIntent,
  generateSystemPromptWithExternalExamples,
  initializeDefaultExamples,
};
