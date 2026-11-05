// @ts-check
import {
  KIMI_DEFAULT_LOCALE,
  KIMI_INTERFACE_FIELDS,
  KIMI_LOCALES,
  KIMI_LOCALES_DIR,
  KIMI_MANIFEST_PATH,
  KIMI_SHORT_DESCRIPTION_MAX,
  KIMI_TRY_PROMPTS_MAX,
} from "../../../manifest/KimiManifestBuilder.mjs";
import { isPlainObject } from "../../../util/object.mjs";
import { Rule } from "../../Rule.mjs";

const TRAILING_PUNCTUATION = /[.!?。！？,，;；:：]$/u;
const REQUIRED_TEXT = ["displayName", "shortDescription", "longDescription", "developerName"];

/**
 * The manifest's `interface`, as the hosted validator reads it: every
 * required field, a short description of at most 20 characters with no
 * trailing punctuation, one to three try prompts, the default locale and the
 * fixed locales directory, an `mcpOverrides` entry for every server with an
 * icon, and a `skillOverrides` entry for every shipped skill and no other.
 */
export class KimiInterfaceRule extends Rule {
  /** @param {import("../../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const at = { path: KIMI_MANIFEST_PATH };
    const manifest = pkg.manifestObject();
    const ui = manifest?.interface;
    if (!isPlainObject(ui)) return [];
    const findings = [];

    for (const key of REQUIRED_TEXT) {
      if (typeof ui[key] !== "string" || /** @type {string} */ (ui[key]).trim() === "") {
        findings.push(this.error(`interface.${key} is required`, at));
      }
    }
    findings.push(...this.shortDescriptionFindings(ui.shortDescription, "interface.shortDescription", at));

    const prompts = ui.tryPrompts;
    if (!Array.isArray(prompts) || prompts.length === 0 || !prompts.every(prompt => typeof prompt === "string" && prompt.trim() !== "")) {
      findings.push(this.error("interface.tryPrompts must list at least one example instruction", at));
    } else if (prompts.length > KIMI_TRY_PROMPTS_MAX) {
      findings.push(this.error(`interface.tryPrompts should list at most ${KIMI_TRY_PROMPTS_MAX} prompts; reviewers run them`, at));
    }

    if (ui.defaultLocale !== KIMI_DEFAULT_LOCALE) {
      findings.push(this.error(`interface.defaultLocale must be "${KIMI_DEFAULT_LOCALE}" (accepted: ${KIMI_LOCALES.join(", ")})`, at));
    }
    if (ui.locales !== `./${KIMI_LOCALES_DIR}/`) {
      findings.push(this.error(`interface.locales must be "./${KIMI_LOCALES_DIR}/"`, at));
    }
    if (typeof ui.websiteURL === "string" && !ui.websiteURL.startsWith("https://")) {
      findings.push(this.error("interface.websiteURL must be an https:// URL", at));
    }

    const servers = isPlainObject(manifest?.mcpServers) ? Object.keys(manifest.mcpServers) : [];
    findings.push(...this.overrideFindings(ui.mcpOverrides, "mcpOverrides", servers, { iconRequired: true }, at));
    findings.push(...this.overrideFindings(ui.skillOverrides, "skillOverrides", pkg.skills.map(skill => skill.dir), { iconRequired: false }, at));

    for (const key of Object.keys(ui)) {
      if (!KIMI_INTERFACE_FIELDS.includes(key)) findings.push(this.error(`interface.${key} is not a field this plugin declares`, at));
    }
    return findings;
  }

  /**
   * @param {unknown} value
   * @param {string} where
   * @param {{ path?: string }} at
   */
  shortDescriptionFindings(value, where, at) {
    if (typeof value !== "string") return [];
    const findings = [];
    const length = [...value].length;
    if (length > KIMI_SHORT_DESCRIPTION_MAX) {
      findings.push(this.error(`${where} must be at most ${KIMI_SHORT_DESCRIPTION_MAX} characters (got ${length})`, at));
    }
    if (TRAILING_PUNCTUATION.test(value)) findings.push(this.error(`${where} must not end with punctuation`, at));
    return findings;
  }

  /**
   * One override map must have exactly the keys of what it describes, each
   * with a display name and a description.
   *
   * @param {unknown} overrides
   * @param {string} field
   * @param {readonly string[]} expectedKeys
   * @param {{ iconRequired: boolean }} options
   * @param {{ path?: string }} at
   */
  overrideFindings(overrides, field, expectedKeys, { iconRequired }, at) {
    if (!isPlainObject(overrides)) return [this.error(`interface.${field} is required, with an entry per ${field === "mcpOverrides" ? "server" : "skill"}`, at)];
    const findings = [];
    for (const key of expectedKeys) {
      const text = overrides[key];
      if (!isPlainObject(text)) {
        findings.push(this.error(`interface.${field}.${key} is missing`, at));
        continue;
      }
      for (const prop of ["displayName", "description"]) {
        if (typeof text[prop] !== "string" || /** @type {string} */ (text[prop]).trim() === "") {
          findings.push(this.error(`interface.${field}.${key}.${prop} is required`, at));
        }
      }
      if (iconRequired && (typeof text.iconUrl !== "string" || !text.iconUrl.startsWith("https://"))) {
        findings.push(this.error(`interface.${field}.${key}.iconUrl must be an https:// URL; the catalog shows it`, at));
      }
    }
    for (const key of Object.keys(overrides)) {
      if (!expectedKeys.includes(key)) findings.push(this.error(`interface.${field}.${key} describes something the package does not ship`, at));
    }
    return findings;
  }
}
