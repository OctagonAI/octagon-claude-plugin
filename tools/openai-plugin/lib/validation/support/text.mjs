// @ts-check

/**
 * True when the text contains control characters other than an allowed newline.
 * Tabs count as unsupported, matching the portal's text rules.
 *
 * @param {string} text
 * @param {{ allowNewlines?: boolean }} [options]
 * @returns {boolean}
 */
export function hasUnsupportedCharacters(text, { allowNewlines = false } = {}) {
  const pattern = allowNewlines ? /[\u0000-\u0009\u000B-\u001F\u007F]/ : /[\u0000-\u001F\u007F]/;
  return pattern.test(text);
}

/**
 * Normalization used to detect duplicate starter prompts.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeForComparison(text) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Character count as the portal measures it (Unicode code points).
 *
 * @param {string} text
 * @returns {number}
 */
export function length(text) {
  return [...text].length;
}
