'use strict';

const OpenAIClient = require('../services/openaiClient');

function buildMessages({
  question,
  intent,
  entities,
  results,
  code,
  defaultAnswer,
  openingHoursData,
}) {
  const sys = [
    'You are Dinver AI NLG. Generate a concise Croatian sentence for the user based ONLY on provided structured data.',
    'Do not invent restaurants, menus, times or numbers. If data is missing, say it is not available.',
    'Prefer short, helpful answers (one sentence). Avoid emojis and marketing tone.',
    'For opening hours: explain the current state and hours naturally based on the data.',
  ].join(' ');

  const data = {
    intent: intent || null,
    code: code || null,
    entities: entities || null,
    results: results || null,
    defaultAnswer: defaultAnswer || null,
    openingHoursData: openingHoursData || null,
  };

  const user = [
    'Pitanje korisnika:',
    question || '',
    'Podaci:',
    JSON.stringify(data),
    'Upute: Odgovori jednom kratkom rečenicom na hrvatskom. Ako ima lista rezultata, samo sažmi (npr. broj i scope), bez nabrajanja. Ako je code NO_RESULTS, predloži povećanje radijusa.',
  ].join('\n');

  return [
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ];
}

async function formatAnswer({
  question,
  intent,
  entities,
  results,
  code,
  defaultAnswer,
}) {
  try {
    const messages = buildMessages({
      question,
      intent,
      entities,
      results,
      code,
      defaultAnswer,
    });
    const started = Date.now();
    const resp = await OpenAIClient.chat.completions.create({
      model:
        process.env.OPENAI_NLG_MODEL ||
        process.env.OPENAI_MODEL ||
        'gpt-4o-mini',
      temperature: 0.2,
      messages,
    });
    const text = resp.choices?.[0]?.message?.content?.trim();
    return {
      ok: !!text,
      answer: text || defaultAnswer || null,
      model: resp.model || null,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    return {
      ok: false,
      answer: defaultAnswer || null,
      error: String((err && err.message) || err),
    };
  }
}

module.exports = { formatAnswer };
