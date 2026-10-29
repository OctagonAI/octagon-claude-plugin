// @ts-check

/** @typedef {import("../config/PluginConfig.mjs").PluginConfig} PluginConfig */

export const MANIFEST_PATH = ".codex-plugin/plugin.json";
export const MCP_CONFIG_PATH = ".mcp.json";
export const SKILLS_DIR = "skills";
export const OPENAI_EXTENSION = "com.openai";

/**
 * Turns a {@link PluginConfig} into the Codex-format package manifest and its
 * companion `.mcp.json`. Pure: no I/O, stable key order.
 */
export class ManifestBuilder {
  /** @type {PluginConfig} */ #config;

  /** @param {PluginConfig} config */
  constructor(config) {
    this.#config = config;
  }

  /** @returns {Record<string, unknown>} */
  manifest() {
    const config = this.#config.data;
    const extension = compact({
      onboardingSkill: config.onboardingSkill
        ? `./${SKILLS_DIR}/${config.onboardingSkill}/SKILL.md`
        : undefined,
      review: config.review,
      publication: config.publication,
    });

    return compact({
      name: config.name,
      version: config.version,
      description: config.description,
      author: config.author,
      homepage: config.homepage,
      repository: config.repository,
      license: config.license,
      keywords: config.keywords,
      skills: `./${SKILLS_DIR}/`,
      mcpServers: `./${MCP_CONFIG_PATH}`,
      interface: config.interface,
      extensions: Object.keys(extension).length > 0 ? { [OPENAI_EXTENSION]: extension } : undefined,
    });
  }

  /** @returns {{ mcpServers: Record<string, { url: string }> }} */
  mcpConfig() {
    const { serverName, url } = this.#config.data.mcp;
    return { mcpServers: { [serverName]: { url } } };
  }
}

/**
 * Drops `undefined` values so optional fields are omitted rather than serialized.
 *
 * @param {Record<string, unknown>} object
 * @returns {Record<string, unknown>}
 */
function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}
