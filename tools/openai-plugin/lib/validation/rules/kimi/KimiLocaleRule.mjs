// @ts-check
import { KIMI_LOCALES, KIMI_LOCALES_DIR, KIMI_SHORT_DESCRIPTION_MAX, KimiManifestBuilder } from "../../../manifest/KimiManifestBuilder.mjs";
import { isPlainObject } from "../../../util/object.mjs";
import { Rule } from "../../Rule.mjs";

const TRAILING_PUNCTUATION = /[.!?。！？,，;；:：]$/u;
const TEXT_FIELDS = ["displayName", "shortDescription", "longDescription", "developerName"];

/**
 * `locales/<locale>.json`, one per declared locale: a complete translation of
 * the manifest's interface text. The hosted validator demands the other
 * language's file whenever `interface` is present and checks that it covers
 * the interface text, every `skillOverrides` key, and every `mcpOverrides`
 * key, so this rule compares the file against the manifest key for key, and
 * flags locale files the config does not declare.
 */
export class KimiLocaleRule extends Rule {
  /** @type {readonly string[]} */ #locales;

  /** @param {{ locales: readonly string[] }} options The translated locales the config declares (the default locale excluded). */
  constructor({ locales }) {
    super();
    this.#locales = locales;
  }

  /** @param {import("../../Rule.mjs").ValidationContext} context */
  async check({ pkg }) {
    const manifest = pkg.manifestObject();
    const ui = manifest?.interface;
    if (!isPlainObject(ui)) return [];
    const findings = [];

    if (this.#locales.length === 0) {
      findings.push(this.error("at least one translated locale is required; the hosted validator rejects a single-language plugin", { path: KIMI_LOCALES_DIR }));
    }
    for (const locale of this.#locales) {
      if (!KIMI_LOCALES.includes(locale)) findings.push(this.error(`locale "${locale}" is not one Kimi accepts (${KIMI_LOCALES.join(", ")})`, { path: KIMI_LOCALES_DIR }));
      findings.push(...(await this.localeFindings(pkg, locale, ui)));
    }
    for (const file of pkg.files.filter(candidate => candidate.startsWith(`${KIMI_LOCALES_DIR}/`))) {
      const locale = file.slice(KIMI_LOCALES_DIR.length + 1).replace(/\.json$/, "");
      if (!file.endsWith(".json") || !this.#locales.includes(locale)) {
        findings.push(this.error("locale file is not declared in the config's kimi.translations", { path: file }));
      }
    }
    return findings;
  }

  /**
   * @param {import("../../PackageView.mjs").PackageView} pkg
   * @param {string} locale
   * @param {Record<string, unknown>} ui The manifest's `interface`.
   */
  async localeFindings(pkg, locale, ui) {
    const path = KimiManifestBuilder.localePath(locale);
    const at = { path };
    if (!pkg.has(path)) return [this.error(`translation file for ${locale} is missing`, at)];
    /** @type {unknown} */
    let text;
    try {
      text = JSON.parse(await pkg.readText(path));
    } catch (error) {
      return [this.error(`not valid JSON: ${/** @type {Error} */ (error).message}`, at)];
    }
    if (!isPlainObject(text)) return [this.error("must be a JSON object", at)];

    const findings = [];
    for (const field of TEXT_FIELDS) {
      if (typeof text[field] !== "string" || /** @type {string} */ (text[field]).trim() === "") {
        findings.push(this.error(`${field} is missing`, at));
      }
    }
    if (typeof text.shortDescription === "string") {
      const length = [...text.shortDescription].length;
      if (length > KIMI_SHORT_DESCRIPTION_MAX) findings.push(this.error(`shortDescription must be at most ${KIMI_SHORT_DESCRIPTION_MAX} characters (got ${length})`, at));
      if (TRAILING_PUNCTUATION.test(text.shortDescription)) findings.push(this.error("shortDescription must not end with punctuation", at));
    }
    const prompts = text.tryPrompts;
    const expectedPrompts = Array.isArray(ui.tryPrompts) ? ui.tryPrompts.length : 0;
    if (!Array.isArray(prompts) || !prompts.every(prompt => typeof prompt === "string" && prompt.trim() !== "")) {
      findings.push(this.error("tryPrompts must be a list of translated prompts", at));
    } else if (prompts.length !== expectedPrompts) {
      findings.push(this.error(`tryPrompts has ${prompts.length} prompts; the manifest has ${expectedPrompts}`, at));
    }
    for (const field of ["mcpOverrides", "skillOverrides"]) {
      findings.push(...this.overrideFindings(text[field], ui[field], field, at));
    }
    return findings;
  }

  /**
   * @param {unknown} translated
   * @param {unknown} original The manifest's override map.
   * @param {string} field
   * @param {{ path: string }} at
   */
  overrideFindings(translated, original, field, at) {
    const expectedKeys = isPlainObject(original) ? Object.keys(original) : [];
    if (!isPlainObject(translated)) return [this.error(`${field} is missing`, at)];
    const findings = [];
    for (const key of expectedKeys) {
      const text = translated[key];
      if (!isPlainObject(text)) {
        findings.push(this.error(`${field}.${key} is missing`, at));
        continue;
      }
      for (const prop of ["displayName", "description"]) {
        if (typeof text[prop] !== "string" || /** @type {string} */ (text[prop]).trim() === "") {
          findings.push(this.error(`${field}.${key}.${prop} is missing`, at));
        }
      }
    }
    for (const key of Object.keys(translated)) {
      if (!expectedKeys.includes(key)) findings.push(this.error(`${field}.${key} is not in the manifest`, at));
    }
    return findings;
  }
}
