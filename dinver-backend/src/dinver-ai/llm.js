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
      '- Only answer using the JSON data provided below. Do not invent facts.',
      '- If data is missing, use the fallback guidance implicitly (e.g., suggest calling phone, or say info not available).',
      '- Never output raw JSON; respond conversationally.',
      '- Keep it short and natural (2–4 sentences).',
      '- Language: ' + (lang === 'hr' ? 'Croatian' : 'English') + '.',
      '- Scope: Dinver restaurants only. If question is out of scope, say you can only help with Dinver restaurants.',
    ].join('\n');

    const userContent = [
      `Question: ${question}`,
      `Intent: ${intent}`,
      `Data JSON: ${JSON.stringify(data)}`,
    ].join('\n');

    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
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
