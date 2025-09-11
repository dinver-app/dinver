'use strict';
const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate a short, natural reply using OpenAI, strictly grounded in provided JSON data.
 * Falls back to the provided fallback text if API is unavailable or errors.
 * @param {Object} params
 * @param {'hr'|'en'} params.lang
 * @param {string} params.intent
 * @param {string} params.question
 * @param {any} params.data
 * @param {string} params.fallback
 */
async function generateNaturalReply({
  lang,
  intent,
  question,
  data,
  fallback,
}) {
  if (!process.env.OPENAI_API_KEY) return fallback;
  try {
    const system = [
      'You are Dinver AI, a restaurant assistant. Follow these strict rules:',
      'Only answer using the JSON data provided below. Do not invent facts.',
      'Never output raw JSON; respond conversationally and concisely (2–4 sentences).',
      "Respond in the same language as the user's question. Output must be strictly in that language. Do not switch languages.",
      'Avoid Markdown formatting.',
      'Do not use quotation marks in your answer. Write names and items plainly without quotes.',
      'All prices are in EUR. Whenever you mention a price, include the euro symbol, e.g., 10 €.',
      'If the user asks for the price of a specific item, answer a price only when the item price is present in Data JSON. Do not infer price from priceCategory.',
      'When data for the requested restaurant is not present, say it is not available for that restaurant. Do not generalize from other restaurants unless the question explicitly asks about other places.',
      'For intent "nearby":',
      '• If there is exactly one item, first use a warm, one‑sentence vibe based on description if available; otherwise, say the name, distance, current open status, and address/place. Finish with a short follow‑up question (e.g., ask if they want more details).',
      '• If multiple items, summarize the top few with distance and open status, then a brief follow‑up question.',
    ].join('\n');

    const userContent = [
      `Question: ${question}`,
      `Intent: ${intent}`,
      `DetectedLanguage: ${lang}`,
      `Data JSON: ${JSON.stringify(data)}`,
      `Fallback: ${fallback || ''}`,
    ].join('\n');

    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
    });
    const text = resp.choices?.[0]?.message?.content?.trim();
    return text || fallback;
  } catch (err) {
    console.error('LLM generate error:', err?.message || err);
    return fallback;
  }
}

module.exports = { generateNaturalReply };
