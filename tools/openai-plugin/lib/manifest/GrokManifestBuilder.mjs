// @ts-check
import { MCP_CONFIG_PATH, SKILLS_DIR } from "./ManifestBuilder.mjs";

/** @typedef {import("../config/PluginConfig.mjs").PluginConfig} PluginConfig */

export const GROK_MANIFEST_PATH = ".grok-plugin/plugin.json";
/** Repository directory (POSIX, relative to the root) that holds the committed Grok packages. */
export const GROK_PLUGINS_DIR = "grok/plugins";
export const GROK_README_PATH = "README.md";
export const GROK_LICENSE_PATH = "LICENSE";
export const GROK_ICON_PATH = "assets/icon.png";

/**
 * Manifest fields Grok Build documents. Nothing else is written, so a reviewer
 * never has to ask what an unknown key does.
 */
export const GROK_MANIFEST_FIELDS = Object.freeze([
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "skills",
  "mcpServers",
]);

/**
 * Turns a {@link PluginConfig} into the Grok Build plugin manifest and its
 * `.mcp.json`. Pure: no I/O, stable key order.
 *
 * Keywords come from the `grok` block, not the listing keywords: the Grok
 * marketplace uses them to trigger a proactive suggestion, so they must be
 * brand-scoped rather than topical.
 */
export class GrokManifestBuilder {
  /** @type {PluginConfig} */ #config;

  /** @param {PluginConfig} config */
  constructor(config) {
    this.#config = config;
  }

  /** @returns {Record<string, unknown>} */
  manifest() {
    const config = this.#config.data;
    const grok = this.#config.grok();
    return compact({
      name: config.name,
      version: config.version,
      description: config.description,
      author: config.author,
      homepage: config.homepage,
      repository: config.repository,
      license: config.license,
      keywords: grok.keywords,
      skills: `./${SKILLS_DIR}/`,
      mcpServers: `./${MCP_CONFIG_PATH}`,
    });
  }

  /** @returns {{ mcpServers: Record<string, { type: "http", url: string }> }} */
  mcpConfig() {
    const { serverName, url } = this.#config.data.mcp;
    return { mcpServers: { [serverName]: { type: "http", url } } };
  }

  /**
   * The object a catalog PR appends to `xai-org/plugin-marketplace`'s
   * `.grok-plugin/marketplace.json`.
   *
   * @param {{ repoUrl: string, sha: string, path: string }} source
   * @returns {Record<string, unknown>}
   */
  catalogEntry({ repoUrl, sha, path }) {
    const config = this.#config.data;
    const grok = this.#config.grok();
    return compact({
      name: config.name,
      description: grok.catalogDescription ?? config.description,
      category: grok.category,
      source: { source: "url", url: repoUrl, sha, path },
      homepage: config.homepage,
      keywords: grok.keywords,
      domains: grok.domains,
    });
  }
}

/**
 * @param {Record<string, unknown>} object
 * @returns {Record<string, unknown>}
 */
function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}
