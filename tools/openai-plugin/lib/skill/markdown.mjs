// @ts-check

const HEADING = /^(#{1,6})[ \t]+\S/;
const FENCE = /^(?:```|~~~)/;

/**
 * Replaces (or removes) a Markdown section identified by its exact heading line.
 *
 * A section runs from its heading to the next heading of the same or a higher
 * level. Lines inside fenced code blocks are never treated as headings.
 *
 * @param {string} text
 * @param {string} heading Exact heading line, e.g. `## Prerequisites`.
 * @param {string | null} body Replacement body, or `null` to drop the section.
 * @returns {{ text: string, count: number }}
 */
export function replaceSection(text, heading, body) {
  const level = headingLevel(heading);
  if (level === 0) throw new TypeError(`Not a Markdown heading: ${heading}`);

  const lines = text.split("\n");
  /** @type {string[]} */
  const output = [];
  let count = 0;
  let inFence = false;
  let skipping = false;

  for (const line of lines) {
    if (FENCE.test(line)) inFence = !inFence;
    const lineLevel = inFence ? 0 : headingLevel(line);

    if (skipping && lineLevel > 0 && lineLevel <= level) skipping = false;
    if (!skipping && !inFence && line.trimEnd() === heading) {
      count += 1;
      skipping = true;
      if (body !== null) output.push(heading, "", body.trim(), "");
      continue;
    }
    if (!skipping) output.push(line);
  }

  return { text: output.join("\n"), count };
}

/**
 * Lists the relative link targets of inline Markdown links and images, ignoring
 * anything inside fenced code blocks.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function relativeLinks(text) {
  /** @type {string[]} */
  const targets = [];
  let inFence = false;
  for (const line of text.split("\n")) {
    if (FENCE.test(line)) inFence = !inFence;
    if (inFence) continue;
    for (const match of line.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = match[1];
      if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) continue;
      targets.push(decodeURI(target.split("#")[0]));
    }
  }
  return targets.filter(Boolean);
}

/**
 * @param {string} line
 * @returns {number}
 */
function headingLevel(line) {
  const match = HEADING.exec(line);
  return match ? match[1].length : 0;
}
