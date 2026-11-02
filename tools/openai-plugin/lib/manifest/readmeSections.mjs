// @ts-check

/** @typedef {import("../skill/SkillDocument.mjs").SkillDocument} SkillDocument */

/**
 * Fragments shared by the marketplace README builders, so the Grok and Gemini
 * READMEs describe the same skills and smoke tests in the same words.
 */

/**
 * A description flattened to one Markdown table cell.
 *
 * @param {string} text
 * @returns {string}
 */
export function oneLine(text) {
  return text.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}

/**
 * @param {Record<string, unknown>} object
 * @param {string} key
 * @returns {string}
 */
export function stringField(object, key) {
  const value = object[key];
  return typeof value === "string" ? value : "";
}

/**
 * @param {readonly SkillDocument[]} skills
 * @returns {SkillDocument[]} Sorted by name, so the table is stable across builds.
 */
export function sortedSkills(skills) {
  return [...skills].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * @param {readonly SkillDocument[]} skills
 * @returns {string[]} Markdown table lines, header included.
 */
export function skillsTable(skills) {
  return ["| Skill | What it does |", "|---|---|", ...sortedSkills(skills).map(skill => `| \`${skill.name}\` | ${oneLine(skill.description)} |`)];
}

/**
 * @param {readonly { prompt: string, expect: string }[]} smokeTests
 * @returns {string[]}
 */
export function smokeTestLines(smokeTests) {
  return smokeTests.flatMap(({ prompt, expect }) => [`- \`${prompt}\``, `  Expected: ${expect}`]);
}

/**
 * @param {{ license?: string, homepage?: string }} config
 * @param {Record<string, unknown>} listing The OpenAI `interface` object, which carries the support and policy URLs.
 * @returns {string[]}
 */
export function licenseAndSupportLines(config, listing) {
  return [
    `- License: ${config.license ?? "see LICENSE"} (see \`LICENSE\`).`,
    `- Homepage: ${config.homepage ?? ""}`,
    `- Support: ${stringField(listing, "supportURL")}`,
    `- Privacy policy: ${stringField(listing, "privacyPolicyURL")}`,
    `- Terms of service: ${stringField(listing, "termsOfServiceURL")}`,
  ];
}
