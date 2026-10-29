// @ts-check

const HEADING = /^(#{1,6})[ \t]+\S/;
/**
 * A fence line: indentation, then a run of backticks or tildes. Any amount of
 * indentation is accepted because a fence inside a list item is indented
 * relative to its container, and this scanner does not track containers.
 */
const FENCE = /^( *)(`{3,}|~{3,})(.*)$/;

/** @typedef {{ char: string, length: number, indent: number }} OpenFence */

/**
 * Advances fenced-code-block state by one line, following the CommonMark rules:
 * a block opens on a fence run (a backtick run may not have backticks in its
 * info string) and closes only on a run of the same character that is at least
 * as long, with nothing but whitespace after it. The closer may be indented at
 * most three spaces more than the opener, which bounds the damage should an
 * indented literal fence ever be mistaken for an opener.
 *
 * @param {string} line
 * @param {OpenFence | null} open The fence that opened the current block, or `null`.
 * @returns {OpenFence | null} The fence that opens the block after this line, or `null`.
 */
function nextFence(line, open) {
  const match = FENCE.exec(line);
  if (!match) return open;
  const [, indent, run, rest] = match;
  if (open === null) {
    if (run[0] === "`" && rest.includes("`")) return null;
    return { char: run[0], length: run.length, indent: indent.length };
  }
  const closes =
    run[0] === open.char && run.length >= open.length && rest.trim() === "" && indent.length <= open.indent + 3;
  return closes ? null : open;
}

/**
 * Iterates lines with a flag that is true for every line inside a fenced code
 * block, including the opening and closing fence lines themselves.
 *
 * @param {string} text
 * @returns {Generator<[line: string, inFence: boolean]>}
 */
function* linesWithFenceState(text) {
  /** @type {OpenFence | null} */
  let fence = null;
  for (const line of text.split("\n")) {
    const wasInFence = fence !== null;
    fence = nextFence(line, fence);
    yield [line, wasInFence || fence !== null];
  }
}

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

  /** @type {string[]} */
  const output = [];
  let count = 0;
  let skipping = false;

  for (const [line, inFence] of linesWithFenceState(text)) {
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
  for (const [line, inFence] of linesWithFenceState(text)) {
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
