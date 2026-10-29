// @ts-check

export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * WCAG 2.x contrast ratio between two `#RRGGBB` colors.
 *
 * @param {string} first
 * @param {string} second
 * @returns {number}
 */
export function contrastRatio(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * @param {string} hex
 * @returns {number}
 */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(index => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
