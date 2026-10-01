// @ts-check
import { MANIFEST_PATH } from "../../manifest/ManifestBuilder.mjs";
import { isPlainObject } from "../../util/object.mjs";
import { Rule } from "../Rule.mjs";
import { hasUnsupportedCharacters, length, normalizeForComparison } from "../support/text.mjs";

/**
 * @typedef {{ field: string, max: number, multiline?: boolean, code: string }} TextField
 * @type {readonly TextField[]}
 */
const TEXT_FIELDS = [
  { field: "displayName", max: 30, code: "submission_display_name" },
  { field: "shortDescription", max: 30, code: "submission_subtitle" },
  { field: "longDescription", max: 4000, multiline: true, code: "submission_description" },
  { field: "developerName", max: 80, code: "submission_developer_name" },
  { field: "category", max: 120, code: "submission_category" },
];

/** Listing text in `interface`: required fields, limits, capabilities, starter prompts. */
export class ListingTextRule extends Rule {
  /** @param {import("../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const listing = pkg.manifestObject()?.interface;
    if (!isPlainObject(listing)) return [];
    const at = { path: MANIFEST_PATH };
    const findings = [];

    for (const { field, max, multiline = false, code } of TEXT_FIELDS) {
      const value = listing[field];
      if (typeof value !== "string" || value.trim() === "") {
        findings.push(this.error(`interface.${field} is required`, { ...at, code: `${code}_required` }));
        continue;
      }
      if (length(value) > max) {
        findings.push(this.error(`interface.${field} is ${length(value)} characters; the limit is ${max}`, { ...at, code: `${code}_too_long` }));
      }
      if (hasUnsupportedCharacters(value, { allowNewlines: multiline })) {
        findings.push(this.error(`interface.${field} must be ${multiline ? "free of control characters" : "a single line"}`, { ...at, code: `${code}_character_unsupported` }));
      }
    }

    const capabilities = listing.capabilities;
    if (!Array.isArray(capabilities)) {
      findings.push(this.error("interface.capabilities must be an array", at));
    } else {
      if (capabilities.length > 20) findings.push(this.error("interface.capabilities allows at most 20 entries", at));
      capabilities.forEach((capability, index) => {
        if (typeof capability !== "string" || capability.trim() === "" || length(capability) > 120 || hasUnsupportedCharacters(capability)) {
          findings.push(this.error(`interface.capabilities[${index}] must be a single line of 1–120 characters`, { ...at, code: "plugin_capability_invalid" }));
        }
      });
    }

    const prompts = listing.defaultPrompt === undefined ? [] : [listing.defaultPrompt].flat();
    if (prompts.length > 3) findings.push(this.error("interface.defaultPrompt allows at most 3 prompts", at));
    const seen = new Set();
    prompts.forEach((prompt, index) => {
      const where = `interface.defaultPrompt[${index}]`;
      if (typeof prompt !== "string" || prompt.trim() === "" || length(prompt) > 128) {
        findings.push(this.error(`${where} must be 1–128 characters`, at));
        return;
      }
      if (prompt.includes("@")) findings.push(this.error(`${where} must not contain @mentions`, { ...at, code: "plugin_default_prompt_mention" }));
      const key = normalizeForComparison(prompt);
      if (seen.has(key)) findings.push(this.error(`${where} duplicates another prompt`, { ...at, code: "plugin_default_prompt_duplicate" }));
      seen.add(key);
    });

    return findings;
  }
}
