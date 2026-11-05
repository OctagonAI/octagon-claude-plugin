// @ts-check
import { ConfigError } from "../errors.mjs";
import { deepFreeze } from "../util/object.mjs";
import { Checker, readJsonFile } from "./validate.mjs";

/** Interface fields that reference image files under `openai/assets/`. */
export const IMAGE_FIELDS = Object.freeze(["logo", "logoDark", "composerIcon", "composerIconDark"]);
export const ASSET_PREFIX = "./assets/";

/**
 * @param {string} value
 * @returns {boolean} True when `new URL(value)` accepts it; builders call that later.
 */
function parses(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** The listing fields that used to live under `grok` and now live under `listing`. */
const LISTING_FIELDS = Object.freeze(["oauthUrl", "readmeIntro", "scopeNote", "smokeTests"]);

/**
 * @typedef {{
 *   name: string,
 *   version: string,
 *   description: string,
 *   author: { name: string, email?: string, url?: string },
 *   homepage?: string,
 *   repository?: string,
 *   license?: string,
 *   keywords?: string[],
 *   mcp: { serverName: string, url: string, tools: string[] },
 *   interface: Record<string, unknown>,
 *   onboardingSkill?: string,
 *   review?: Record<string, unknown>,
 *   publication?: Record<string, unknown>,
 *   listing?: ListingConfigData,
 *   grok?: Partial<ListingConfigData> & GrokCatalogData,
 *   gemini?: GeminiConfigData,
 *   kimi?: KimiConfigData,
 * }} PluginConfigData
 *
 * @typedef {{
 *   oauthUrl: string,
 *   readmeIntro: string,
 *   scopeNote: string,
 *   smokeTests: { prompt: string, expect: string }[],
 * }} ListingConfigData Vendor-neutral copy every marketplace README and
 *   context file draws on: the OAuth host, the audience paragraph, the
 *   research-only scope, and the prompts a reviewer can run.
 *
 * @typedef {{
 *   keywords: string[],
 *   domains: string[],
 *   category?: string,
 *   catalogDescription?: string,
 * }} GrokCatalogData The Grok Build marketplace block: brand-scoped discovery
 *   terms and the catalog's browse text. The listing fields may also be set
 *   here for backward compatibility; `listing` is the preferred home.
 *
 * @typedef {GrokCatalogData & ListingConfigData} GrokConfigData
 *
 * @typedef {{
 *   serverName?: string,
 *   includeTools?: string[],
 *   repository: string,
 *   repoDescription: string,
 *   contextNotes?: string[],
 * }} GeminiConfigData The Gemini CLI extension block: the mirror repository
 *   the gallery indexes, its About text, an optional client-side tool
 *   allow-list, and extra standing rules for `GEMINI.md`.
 *
 * @typedef {{
 *   serverName?: string,
 *   mcpUrl?: string,
 *   enabledTools?: string[],
 *   shortDescription: string,
 *   cliDescription: string,
 *   repository: string,
 *   repoDescription: string,
 *   iconUrl: string,
 *   translations: Record<string, string>,
 *   systemPromptNotes?: string[],
 * }} KimiConfigData The Kimi plugin block: an optional endpoint and tool
 *   allow-list for the one remote server, the 20-character marketplace
 *   `shortDescription` and the terse `cliDescription` the Kimi Code TUI shows,
 *   the mirror repository and its About text, the hosted icon, one translation
 *   file per locale (profile-relative paths; `en-US` names the skills, every
 *   other locale is a complete translation), and extra rules for `SYSTEM.md`.
 */

/**
 * Declarative description of the OpenAI listing (`openai/plugin.config.json`).
 *
 * Loading checks structure only. Submission limits (lengths, URL reachability,
 * image sizes) are enforced by validation rules against the built package, so the
 * checks run on exactly the bytes that get uploaded.
 */
export class PluginConfig {
  /** @type {Readonly<PluginConfigData>} */ data;

  /** @param {PluginConfigData} data */
  constructor(data) {
    this.data = deepFreeze(structuredClone(data));
    Object.freeze(this);
  }

  /**
   * @param {string} file
   * @returns {Promise<PluginConfig>}
   */
  static async load(file) {
    const raw = await readJsonFile(file);
    PluginConfig.check(raw, file);
    return new PluginConfig(/** @type {PluginConfigData} */ (raw));
  }

  /**
   * @param {unknown} raw
   * @param {string} source
   */
  static check(raw, source) {
    const check = new Checker();
    if (!check.object(raw, "config")) return check.throwIfAny(source);

    check.string(raw.name, "name");
    check.string(raw.version, "version");
    check.string(raw.description, "description");
    for (const key of ["homepage", "repository", "license", "onboardingSkill"]) {
      check.optionalString(raw[key], key);
    }
    if (raw.keywords !== undefined) check.stringArray(raw.keywords, "keywords");

    if (check.object(raw.author, "author")) {
      check.string(raw.author.name, "author.name");
      check.optionalString(raw.author.email, "author.email");
      check.optionalString(raw.author.url, "author.url");
    }

    if (check.object(raw.mcp, "mcp")) {
      check.string(raw.mcp.serverName, "mcp.serverName");
      if (check.string(raw.mcp.url, "mcp.url") && !parses(raw.mcp.url)) check.fail("mcp.url must be a valid URL");
      check.stringArray(raw.mcp.tools, "mcp.tools");
    }

    if (check.object(raw.interface, "interface")) {
      for (const field of IMAGE_FIELDS) {
        const value = raw.interface[field];
        if (value !== undefined && (typeof value !== "string" || !value.startsWith(ASSET_PREFIX))) {
          check.fail(`interface.${field} must be a path under ${ASSET_PREFIX}`);
        }
      }
      if (raw.interface.screenshots !== undefined) {
        check.fail("interface.screenshots is only allowed for plugins with custom UI");
      }
    }

    for (const key of ["review", "publication"]) {
      if (raw[key] !== undefined) check.object(raw[key], key);
    }
    if (raw.listing !== undefined && check.object(raw.listing, "listing")) {
      PluginConfig.#checkListing(raw.listing, "listing", check, { required: true });
    }
    if (raw.grok !== undefined) PluginConfig.#checkGrok(raw.grok, raw.listing, check);
    if (raw.gemini !== undefined) PluginConfig.#checkGemini(raw.gemini, raw.mcp, check);
    if (raw.kimi !== undefined) PluginConfig.#checkKimi(raw.kimi, raw.mcp, check);
    check.throwIfAny(source);
  }

  /**
   * @param {Record<string, unknown>} block
   * @param {string} where
   * @param {Checker} check
   * @param {{ required: boolean }} options When not required, absent fields are fine (legacy `grok` block with a `listing` beside it).
   */
  static #checkListing(block, where, check, { required }) {
    for (const key of ["oauthUrl", "readmeIntro", "scopeNote"]) {
      if (required || block[key] !== undefined) check.string(block[key], `${where}.${key}`);
    }
    if (typeof block.oauthUrl === "string") {
      if (!block.oauthUrl.startsWith("https://")) check.fail(`${where}.oauthUrl must be an https:// URL`);
      else if (!parses(block.oauthUrl)) check.fail(`${where}.oauthUrl must be a valid URL`);
    }
    if (!required && block.smokeTests === undefined) return;
    if (check.array(block.smokeTests, `${where}.smokeTests`)) {
      if (block.smokeTests.length === 0) check.fail(`${where}.smokeTests must list at least one prompt`);
      block.smokeTests.forEach((item, index) => {
        if (check.object(item, `${where}.smokeTests[${index}]`)) {
          check.string(item.prompt, `${where}.smokeTests[${index}].prompt`);
          check.string(item.expect, `${where}.smokeTests[${index}].expect`);
        }
      });
    }
  }

  /**
   * @param {unknown} grok
   * @param {unknown} listing
   * @param {Checker} check
   */
  static #checkGrok(grok, listing, check) {
    if (!check.object(grok, "grok")) return;
    if (check.stringArray(grok.keywords, "grok.keywords") && grok.keywords.length === 0) {
      check.fail("grok.keywords must list at least one keyword");
    }
    if (check.stringArray(grok.domains, "grok.domains") && grok.domains.length === 0) {
      check.fail("grok.domains must list at least one domain");
    }
    check.optionalString(grok.category, "grok.category");
    check.optionalString(grok.catalogDescription, "grok.catalogDescription");
    // Listing copy is required somewhere: in `listing`, or (legacy) here.
    PluginConfig.#checkListing(grok, "grok", check, { required: listing === undefined });
  }

  /**
   * @param {unknown} gemini
   * @param {unknown} mcp
   * @param {Checker} check
   */
  static #checkGemini(gemini, mcp, check) {
    if (!check.object(gemini, "gemini")) return;
    check.optionalString(gemini.serverName, "gemini.serverName");
    if (check.string(gemini.repository, "gemini.repository") && !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(gemini.repository)) {
      check.fail("gemini.repository must be a https://github.com/<owner>/<repo> URL");
    }
    if (check.string(gemini.repoDescription, "gemini.repoDescription") && gemini.repoDescription.length > 350) {
      check.fail("gemini.repoDescription must be at most 350 characters (GitHub's About field)");
    }
    if (gemini.includeTools !== undefined && check.stringArray(gemini.includeTools, "gemini.includeTools")) {
      if (gemini.includeTools.length === 0) check.fail("gemini.includeTools must list at least one tool when present");
      const known = /** @type {string[]} */ (mcp && typeof mcp === "object" && Array.isArray(/** @type {any} */ (mcp).tools) ? /** @type {any} */ (mcp).tools : []);
      for (const tool of gemini.includeTools) {
        if (!known.includes(tool)) check.fail(`gemini.includeTools: "${tool}" is not in mcp.tools`);
      }
    }
    if (gemini.contextNotes !== undefined) check.stringArray(gemini.contextNotes, "gemini.contextNotes");
  }

  /**
   * @param {unknown} kimi
   * @param {unknown} mcp
   * @param {Checker} check
   */
  static #checkKimi(kimi, mcp, check) {
    if (!check.object(kimi, "kimi")) return;
    check.optionalString(kimi.serverName, "kimi.serverName");
    if (kimi.mcpUrl !== undefined && check.string(kimi.mcpUrl, "kimi.mcpUrl")) {
      if (!kimi.mcpUrl.startsWith("https://")) check.fail("kimi.mcpUrl must be an https:// URL");
      else if (!parses(kimi.mcpUrl)) check.fail("kimi.mcpUrl must be a valid URL");
    }
    check.string(kimi.shortDescription, "kimi.shortDescription");
    check.string(kimi.cliDescription, "kimi.cliDescription");
    if (check.string(kimi.repository, "kimi.repository") && !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(kimi.repository)) {
      check.fail("kimi.repository must be a https://github.com/<owner>/<repo> URL");
    }
    if (check.string(kimi.repoDescription, "kimi.repoDescription") && kimi.repoDescription.length > 350) {
      check.fail("kimi.repoDescription must be at most 350 characters (GitHub's About field)");
    }
    if (check.string(kimi.iconUrl, "kimi.iconUrl") && (!kimi.iconUrl.startsWith("https://") || !parses(kimi.iconUrl))) {
      check.fail("kimi.iconUrl must be an https:// URL");
    }
    if (check.object(kimi.translations, "kimi.translations")) {
      const locales = Object.keys(kimi.translations);
      if (locales.length === 0) check.fail("kimi.translations must map at least one locale to a file");
      for (const [locale, file] of Object.entries(kimi.translations)) {
        if (!/^[a-z]{2}-[A-Z]{2}$/.test(locale)) check.fail(`kimi.translations: "${locale}" is not a <language>-<REGION> locale such as en-US`);
        if (typeof file !== "string" || !file.startsWith("./")) check.fail(`kimi.translations.${locale} must be a ./ path relative to the profile`);
      }
    }
    if (kimi.enabledTools !== undefined && check.stringArray(kimi.enabledTools, "kimi.enabledTools")) {
      if (kimi.enabledTools.length === 0) check.fail("kimi.enabledTools must list at least one tool when present");
      const known = /** @type {string[]} */ (mcp && typeof mcp === "object" && Array.isArray(/** @type {any} */ (mcp).tools) ? /** @type {any} */ (mcp).tools : []);
      for (const tool of kimi.enabledTools) {
        if (!known.includes(tool)) check.fail(`kimi.enabledTools: "${tool}" is not in mcp.tools`);
      }
    }
    if (kimi.systemPromptNotes !== undefined) check.stringArray(kimi.systemPromptNotes, "kimi.systemPromptNotes");
  }

  /**
   * The vendor-neutral listing copy, from `listing` or, for configs that
   * predate it, from the same fields under `grok`.
   *
   * @returns {Readonly<ListingConfigData>}
   * @throws {ConfigError} when neither block provides it.
   */
  listing() {
    const listing = /** @type {Record<string, unknown> | undefined} */ (this.data.listing);
    const grok = /** @type {Record<string, unknown> | undefined} */ (this.data.grok);
    /** @type {Record<string, unknown>} */
    const merged = {};
    for (const key of LISTING_FIELDS) {
      const value = listing?.[key] ?? grok?.[key];
      if (value !== undefined) merged[key] = value;
    }
    const missing = LISTING_FIELDS.filter(key => merged[key] === undefined);
    if (missing.length > 0) {
      throw new ConfigError(`plugin "${this.data.name}"`, [`a "listing" block with ${missing.join(", ")} is required to build a marketplace target`]);
    }
    return /** @type {ListingConfigData} */ (/** @type {unknown} */ (merged));
  }

  /**
   * The Grok block, with the listing copy merged in so Grok builders read one object.
   *
   * @returns {Readonly<GrokConfigData>}
   * @throws {ConfigError} when the config has no `grok` block.
   */
  grok() {
    if (!this.data.grok) {
      throw new ConfigError(`plugin "${this.data.name}"`, ['a "grok" block is required to build the Grok target']);
    }
    return Object.freeze({ ...this.data.grok, ...this.listing() });
  }

  /**
   * @returns {Readonly<GeminiConfigData>}
   * @throws {ConfigError} when the config has no `gemini` block.
   */
  gemini() {
    if (!this.data.gemini) {
      throw new ConfigError(`plugin "${this.data.name}"`, ['a "gemini" block is required to build the Gemini target']);
    }
    return this.data.gemini;
  }

  /**
   * @returns {Readonly<KimiConfigData>}
   * @throws {ConfigError} when the config has no `kimi` block.
   */
  kimi() {
    if (!this.data.kimi) {
      throw new ConfigError(`plugin "${this.data.name}"`, ['a "kimi" block is required to build the Kimi target']);
    }
    return this.data.kimi;
  }

  /** @returns {string[]} Asset paths (relative to `openai/`) referenced by the listing. */
  assetPaths() {
    return IMAGE_FIELDS.map(field => this.data.interface[field])
      .filter(value => typeof value === "string")
      .map(value => /** @type {string} */ (value).slice(2));
  }
}
