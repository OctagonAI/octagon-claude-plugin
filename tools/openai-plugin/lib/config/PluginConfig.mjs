// @ts-check
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
 * }} PluginConfigData
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
    check.throwIfAny(source);
  }

  /** @returns {string[]} Asset paths (relative to `openai/`) referenced by the listing. */
  assetPaths() {
    return IMAGE_FIELDS.map(field => this.data.interface[field])
      .filter(value => typeof value === "string")
      .map(value => /** @type {string} */ (value).slice(2));
  }
}
