'use strict';

function levenshteinDistance(a, b) {
  if (!a || !b) return Math.max(a?.length || 0, b?.length || 0);
  if (a === b) return 0;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];

  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function isFuzzyMatch(a, b, threshold = 1) {
  if (!a || !b) return false;

  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return distance <= threshold;
}

function findBestFuzzyMatch(query, candidates, threshold = 1) {
  if (!query || !candidates || candidates.length === 0) return null;

  const queryLower = query.toLowerCase();
  let bestMatch = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    if (!candidate) continue;

    const candidateLower = candidate.toLowerCase();
    const distance = levenshteinDistance(queryLower, candidateLower);

    if (distance <= threshold && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

module.exports = {
  levenshteinDistance,
  isFuzzyMatch,
  findBestFuzzyMatch,
};
