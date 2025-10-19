const MAX_VARIANTS_DEFAULT = 10;

function normalizeBasic(s) {
  return (s || '').toString().trim().toLowerCase();
}

function latinize(s) {
  const table = {
    č: 'c',
    ć: 'c',
    š: 's',
    đ: 'd',
    ž: 'z',
    á: 'a',
    à: 'a',
    ä: 'a',
    â: 'a',
    å: 'a',
    é: 'e',
    è: 'e',
    ë: 'e',
    ê: 'e',
    í: 'i',
    ì: 'i',
    ï: 'i',
    î: 'i',
    ó: 'o',
    ò: 'o',
    ö: 'o',
    ô: 'o',
    ú: 'u',
    ù: 'u',
    ü: 'u',
    û: 'u',
    ñ: 'n',
  };
  return normalizeBasic(s)
    .split('')
    .map((ch) => table[ch] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const SYNONYMS = new Map([
  ['vegan', ['vegan', 'veganski', 'veganska', 'vegan options', 'vegan food']],
  [
    'vegetarian',
    ['vegetarian', 'vegetarijanski', 'vegetarijanska', 'vegetarian options'],
  ],
  [
    'gluten-free',
    ['gluten-free', 'gluten free', 'bez glutena', 'bezglutensko'],
  ],
  ['halal', ['halal', 'halal opcije']],
  ['breakfast', ['breakfast', 'doručak', 'dorucak']],
  ['lunch', ['lunch', 'ručak', 'rucak']],
  ['dinner', ['dinner', 'večera', 'vecera']],
  ['brunch', ['brunch']],
  ['pizza', ['pizza', 'pizze', 'pizzu', 'pica', 'pice', 'picu']],
  ['burger', ['burger', 'hamburger', 'burgeri', 'hamburgeri']],
  ['cevapi', ['ćevapi', 'cevapi', 'cevap', 'ćevape', 'cevape']],
  ['lazanja', ['lazanja', 'lazanje', 'lazanj', 'lasagna', 'lasagne']],
  ['pasta', ['pasta', 'paste', 'tjestenina', 'tjestenine']],
  ['salad', ['salad', 'salata', 'salate', 'salatu']],
  ['soup', ['soup', 'juha', 'juhe', 'juhu', 'supa', 'supu']],
  ['steak', ['steak', 'biftek', 'odrezak', 'meso', 'mesa']],
  ['chicken', ['chicken', 'piletina', 'pileca', 'pileća']],
  ['fish', ['fish', 'riba', 'ribe', 'ribu']],
  ['seafood', ['seafood', 'morski plodovi', 'plodovi mora']],
  ['dessert', ['dessert', 'desert', 'deserti', 'slastice', 'slastica']],
  ['pancakes', ['pancakes', 'pancake', 'palačinke', 'palacinke', 'palačinka']],
  ['coffee', ['coffee', 'kava', 'kave', 'kavu']],
  ['beer', ['beer', 'pivo', 'piva', 'pive']],
  ['wine', ['wine', 'vino', 'vina']],
  ['rice', ['rice', 'riža', 'riza', 'riže', 'rižu']],
]);

function expandWithSynonyms(termNorm) {
  const out = new Set([termNorm]);
  for (const [canon, list] of SYNONYMS) {
    const normCanon = latinize(canon);
    const hitCanon = termNorm === normCanon;
    const hitAny = list.some((s) => latinize(s) === termNorm);
    if (hitCanon || hitAny) {
      out.add(normCanon);
      list.forEach((s) => out.add(latinize(s)));
    }
  }
  return out;
}

function hrMorphology(word) {
  const forms = new Set([word]);
  if (word.endsWith('e')) {
    forms.add(word.slice(0, -1));
    forms.add(word.slice(0, -1) + 'a');
    forms.add(word.slice(0, -1) + 'i');
  }
  if (word.endsWith('i')) {
    forms.add(word.slice(0, -1));
    forms.add(word.slice(0, -1) + 'a');
  }
  if (word.endsWith('a')) {
    forms.add(word.slice(0, -1));
  }
  if (word.endsWith('he')) forms.add(word.slice(0, -1) + 'a');
  if (word.endsWith('pe')) forms.add(word.slice(0, -1) + 'a');
  if (word.endsWith('ci')) forms.add(word.slice(0, -2)); // mali bonus
  return forms;
}

function enMorphology(word) {
  const forms = new Set([word]);
  if (word.endsWith('ies') && word.length > 3) {
    forms.add(word.slice(0, -3) + 'y');
  } else if (word.endsWith('es') && word.length > 2) {
    forms.add(word.slice(0, -2));
  } else if (word.endsWith('s') && word.length > 1) {
    forms.add(word.slice(0, -1));
  } else {
    if (/(ch|sh|x|z|s|o)$/.test(word)) forms.add(word + 'es');
    forms.add(word + 's');
  }
  return forms;
}

function cleanupSpaces(s) {
  return s.replace(/\s+/g, ' ').trim();
}
function spaceHyphenVariants(s) {
  s = cleanupSpaces(s);
  const v = new Set([s]);
  if (s.includes(' ')) v.add(s.replace(/\s+/g, '-'));
  if (s.includes('-')) v.add(s.replace(/-+/g, ' ').replace(/\s+/g, ' ').trim());
  v.add(s.replace(/\s+/g, ''));
  return v;
}

function splitAndCombine(term) {
  const words = latinize(term)
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
  const out = new Set();
  if (!words.length) return out;

  words.forEach((w) => {
    hrMorphology(w).forEach((x) => out.add(x));
    enMorphology(w).forEach((x) => out.add(x));
  });

  const phrase = words.join(' ');
  spaceHyphenVariants(phrase).forEach((p) => out.add(p));

  for (let i = 0; i < words.length - 1; i++) {
    const bg = `${words[i]} ${words[i + 1]}`;
    spaceHyphenVariants(bg).forEach((b) => out.add(b));
  }

  return out;
}

function createEnhancedSearchVariations(query, opts = {}) {
  const max = Math.max(3, Math.min(opts.max ?? MAX_VARIANTS_DEFAULT, 30));

  const base = latinize(query);
  if (!base) return { variants: [], likePatterns: [] };

  const set = new Set();
  set.add(base);
  expandWithSynonyms(base).forEach((v) => set.add(v));
  hrMorphology(base).forEach((v) => set.add(v));
  enMorphology(base).forEach((v) => set.add(v));
  splitAndCombine(base).forEach((v) => set.add(v));
  spaceHyphenVariants(base).forEach((v) => set.add(v));
  if (base.length >= 4) set.add(base.slice(0, -1)); // prefix boost

  let all = Array.from(set).filter((v) => v && v.length > 1);

  const orig = base;
  const score = (v) => {
    let s = 0;
    if (v === orig) s += 5;
    if (v.startsWith(orig.slice(0, Math.max(3, Math.floor(orig.length * 0.6)))))
      s += 2;
    if (/\b/.test(v)) s += 0; // no-op, placeholder
    if (v.includes(' ')) s += 1;
    if (
      new RegExp(
        `\\b${orig.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`,
      ).test(v)
    )
      s += 1;
    if (
      /(pizza|pizz|burger|juha|soup|salad|salata|pasta|tjesten|cevap|cevapi|ćevap)/.test(
        v,
      )
    )
      s += 1;
    return s;
  };

  all.sort((a, b) => score(b) - score(a));
  const variants = all.slice(0, max);
  const likePatterns = variants.map((v) => `%${v}%`);

  return { variants, likePatterns };
}

module.exports = {
  createEnhancedSearchVariations,
  latinize,
  normalizeBasic,
};
