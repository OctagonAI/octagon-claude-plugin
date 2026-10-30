// @ts-check
import { ConfigError } from "../errors.mjs";
import { deepFreeze } from "../util/object.mjs";
import { Checker, readJsonFile } from "./validate.mjs";

/** Interface fields that reference image files under `openai/assets/`. */
export const IMAGE_FIELDS = Object.freeze(["logo", "logoDark", "composerIcon", "composerIconDark"]);
export const ASSET_PREFIX = "./assets/";

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
 *   grok?: GrokConfigData,
 * }} PluginConfigData
 *
 * @typedef {{
 *   keywords: string[],
 *   domains: string[],
 *   category?: string,
 *   catalogDescription?: string,
 *   oauthUrl: string,
 *   readmeIntro: string,
 *   scopeNote: string,
 *   smokeTests: { prompt: string, expect: string }[],
 * }} GrokConfigData The Grok Build marketplace block: brand-scoped discovery
 *   terms, the catalog's browse text, and the reviewer-facing README copy.
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
      check.string(raw.mcp.url, "mcp.url");
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
    if (raw.grok !== undefined) PluginConfig.#checkGrok(raw.grok, check);
    check.throwIfAny(source);
  }

  /**
   * @param {unknown} grok
   * @param {Checker} check
   */
  static #checkGrok(grok, check) {
    if (!check.object(grok, "grok")) return;
    if (check.stringArray(grok.keywords, "grok.keywords") && grok.keywords.length === 0) {
      check.fail("grok.keywords must list at least one keyword");
    }
    if (check.stringArray(grok.domains, "grok.domains") && grok.domains.length === 0) {
      check.fail("grok.domains must list at least one domain");
    }
    check.optionalString(grok.category, "grok.category");
    check.optionalString(grok.catalogDescription, "grok.catalogDescription");
    for (const key of ["oauthUrl", "readmeIntro", "scopeNote"]) check.string(grok[key], `grok.${key}`);
    if (typeof grok.oauthUrl === "string" && !grok.oauthUrl.startsWith("https://")) {
      check.fail("grok.oauthUrl must be an https:// URL");
    }
    if (check.array(grok.smokeTests, "grok.smokeTests")) {
      if (grok.smokeTests.length === 0) check.fail("grok.smokeTests must list at least one prompt");
      grok.smokeTests.forEach((item, index) => {
        if (check.object(item, `grok.smokeTests[${index}]`)) {
          check.string(item.prompt, `grok.smokeTests[${index}].prompt`);
          check.string(item.expect, `grok.smokeTests[${index}].expect`);
        }
      });
    }
  }

  /**
   * @returns {Readonly<GrokConfigData>}
   * @throws {ConfigError} when the config has no `grok` block.
   */
  grok() {
    if (!this.data.grok) {
      throw new ConfigError(`plugin "${this.data.name}"`, ['a "grok" block is required to build the Grok target']);
    }
    return this.data.grok;
  }

  /** @returns {string[]} Asset paths (relative to `openai/`) referenced by the listing. */
  assetPaths() {
    return IMAGE_FIELDS.map(field => this.data.interface[field])
      .filter(value => typeof value === "string")
      .map(value => /** @type {string} */ (value).slice(2));
  }
}
