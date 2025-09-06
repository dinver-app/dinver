const threadStore = require('./threadContext');
const MAX_RADIUS = Number(process.env.AI_MAX_RADIUS_KM || 10);
const DEFAULT_RADIUS = Number(process.env.AI_DEFAULT_RADIUS_KM || 1.5);

function parseConfirmation(text) {
  const q = (text || '').toLowerCase().trim();
  if (!q) return null;
  if (/(^da$|^moze$|^može$|^ok$|^uredu$)/i.test(q)) return { type: 'yes' };
  const mKm = q.match(/(?:na|do)\s*(\d+(?:[\.,]\d+)?)\s*km/);
  if (mKm)
    return { type: 'set_radius', value: parseFloat(mKm[1].replace(',', '.')) };
  const rem = q.match(/(makni|ukloni)\s+(.+)/);
  if (rem) return { type: 'remove_filter', value: rem[2].trim() };
  const add = q.match(/(dodaj)\s+(.+)/);
  if (add) return { type: 'add_filter', value: add[2].trim() };
  return null;
}

function applyConfirmation(threadId, conf) {
  const state = threadStore.get(threadId);
  if (!state || !state.lastParams || !state.lastIntent) return null;
  const params = { ...state.lastParams };
  if (conf.type === 'yes') {
    if (state.suggestedAction?.type === 'increase_radius') {
      params.radiusKm = state.suggestedAction.toKm;
    } else {
      const current = Number(params.radiusKm || DEFAULT_RADIUS);
      params.radiusKm = Math.min(current * 2, MAX_RADIUS);
    }
  } else if (conf.type === 'set_radius' && isFinite(conf.value)) {
    params.radiusKm = conf.value;
  } else if (conf.type === 'remove_filter') {
    const v = conf.value;
    // naive: remove perk by name substring
    if (params.perks)
      params.perks = params.perks.filter((p) => !p.toLowerCase().includes(v));
    if (params.foodTypes)
      params.foodTypes = params.foodTypes.filter(
        (f) => !f.toLowerCase().includes(v),
      );
  } else if (conf.type === 'add_filter') {
    const v = conf.value;
    params.perks = Array.isArray(params.perks) ? params.perks : [];
    params.perks.push(v);
  }
  threadStore.update(threadId, { lastParams: params, suggestedAction: null });
  return { intent: state.lastIntent, params };
}

module.exports = { parseConfirmation, applyConfirmation };
