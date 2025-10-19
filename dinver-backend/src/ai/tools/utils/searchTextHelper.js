'use strict';

const { latinize } = require('./variations');

function normalize(s = '') {
  return s
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDiacritics(text) {
  return latinize(text?.toLowerCase() || '');
}

function exactWordHit(text, term) {
  if (!text || !term) return false;
  const t = latinize(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const normalized = latinize(text);
  return new RegExp(`\\b${t}\\b`, 'i').test(normalized);
}

function createILIKEConditions(
  { Op, sequelize },
  translationsAlias,
  fields,
  searchTerms,
) {
  if (!searchTerms?.length) return undefined;

  const conditions = [];

  for (const raw of searchTerms) {
    const cleanTerm = raw.replace(/[%_]/g, '');
    if (!cleanTerm) continue;

    for (const f of fields) {
      conditions.push({ [f]: { [Op.iLike]: `%${cleanTerm}%` } });
    }

    const normalizedTerm = normalizeDiacritics(cleanTerm);
    for (const f of fields) {
      conditions.push(
        sequelize.where(
          sequelize.fn(
            'LOWER',
            sequelize.fn(
              'TRANSLATE',
              sequelize.col(`${translationsAlias}.${f}`),
              'čćđšžČĆĐŠŽàáâãäåèéêëìíîïòóôõöùúûüñ',
              'ccdszCCDSZaaaaaaeeeeiiiioooouuuun',
            ),
          ),
          { [Op.iLike]: `%${normalizedTerm}%` },
        ),
      );
    }
  }

  return { [Op.or]: conditions };
}

function calculateTextScore(text, searchTerms) {
  if (!text || !searchTerms?.length) return 0;
  const normalizedText = normalizeDiacritics(text);
  let score = 0;
  for (const term of searchTerms) {
    const normalizedTerm = normalizeDiacritics(term.replace(/[%_]/g, ''));
    if (normalizedText.includes(normalizedTerm)) {
      score += normalizedTerm.length / text.length;
    }
  }
  return Math.min(score, 1);
}

function calculateItemScore(item, searchTerms) {
  if (!searchTerms?.length) return 0;

  const hr = item.translations?.find((t) => t.language === 'hr');
  const en = item.translations?.find((t) => t.language === 'en');

  const nameScoreHr = calculateTextScore(hr?.name, searchTerms) * 1.0;
  const nameScoreEn = calculateTextScore(en?.name, searchTerms) * 1.0;
  const descScoreHr = calculateTextScore(hr?.description, searchTerms) * 0.7;
  const descScoreEn = calculateTextScore(en?.description, searchTerms) * 0.7;

  const exactHr = searchTerms.some((t) => exactWordHit(hr?.name, t));
  const exactEn = searchTerms.some((t) => exactWordHit(en?.name, t));
  const exactBoost = exactHr || exactEn ? 0.15 : 0;

  return Math.min(
    1,
    Math.max(nameScoreHr, nameScoreEn, descScoreHr, descScoreEn) + exactBoost,
  );
}

function getItemPrice(item) {
  if (item.price !== null && item.price !== undefined) {
    return Number(parseFloat(item.price).toFixed(2));
  }
  if (item.sizes && item.sizes.length > 0) {
    const valid = item.sizes
      .map((s) => Number.parseFloat(s.price))
      .filter(Number.isFinite);
    if (valid.length > 0) return Number(Math.min(...valid).toFixed(2));
  }
  return null;
}

function splitCommaTerms(q) {
  return (q || '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

module.exports = {
  normalize,
  normalizeDiacritics,
  exactWordHit,
  createILIKEConditions,
  calculateTextScore,
  calculateItemScore,
  getItemPrice,
  splitCommaTerms,
};
