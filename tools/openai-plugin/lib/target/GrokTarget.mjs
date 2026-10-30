// @ts-check
import path from "node:path";
import { MCP_CONFIG_PATH } from "../manifest/ManifestBuilder.mjs";
import {
  GROK_ICON_PATH,
  GROK_LICENSE_PATH,
  GROK_MANIFEST_PATH,
  GROK_README_PATH,
  GrokManifestBuilder,
} from "../manifest/GrokManifestBuilder.mjs";
import { GrokReadmeBuilder } from "../manifest/GrokReadmeBuilder.mjs";
import { ConfigError } from "../errors.mjs";
import { BRAND, createGrokRules } from "../validation/rules/grok/index.mjs";
import { Target } from "./Target.mjs";

/**
 * Hosts Octagon owns. Catalog `domains` trigger the plugin suggestion when a
 * user pastes a matching URL, so only these may be declared.
 */
export const OWNED_DOMAINS = Object.freeze([
  "octagonai.co",
  "www.octagonai.co",
  "docs.octagonai.co",
  "app.octagonai.co",
  "mcp.octagonai.co",
  "docs.octagonagents.com",
  "octagonagents.com",
]);

/**
 * The Grok Build marketplace package: a plugin directory with the native
 * manifest, an HTTP-only `.mcp.json`, a reviewer-facing README, the license,
 * and the icon. There is no archive; the directory is committed to the
 * repository and the marketplace catalog points at it by commit SHA and path.
 */
export class GrokTarget extends Target {
  /** @type {string} */ #licenseFile;

  /** @param {{ licenseFile: string }} options Absolute path of the repository's LICENSE. */
  constructor({ licenseFile }) {
    super();
    this.#licenseFile = licenseFile;
  }

  get id() {
    return /** @type {const} */ ("grok");
  }

  get manifestPath() {
    return GROK_MANIFEST_PATH;
  }

  /**
   * The `grok` block must exist, every keyword must carry the brand, and every
   * domain must be one Octagon owns. Keywords are re-checked on the shipped
   * manifest by `BrandKeywordRule`; domains only appear in the catalog entry,
   * so this is their one check.
   *
   * @param {import("../config/PluginConfig.mjs").PluginConfig} config
   */
  checkConfig(config) {
    const grok = config.grok();
    const problems = [];
    for (const keyword of grok.keywords) {
      if (!keyword.toLowerCase().includes(BRAND)) problems.push(`grok.keywords: "${keyword}" must contain "${BRAND}"`);
    }
    for (const domain of grok.domains) {
      if (!OWNED_DOMAINS.includes(domain.toLowerCase())) {
        problems.push(`grok.domains: "${domain}" is not an Octagon-owned host (${OWNED_DOMAINS.join(", ")})`);
      }
    }
    if (problems.length > 0) throw new ConfigError(`plugin "${config.data.name}"`, problems);
  }

  /** @param {import("./Target.mjs").EmitContext} context */
  async emit({ writer, config, skills, assetsRoot }) {
    const manifest = new GrokManifestBuilder(config);
    await writer.writeJson(GROK_MANIFEST_PATH, manifest.manifest());
    await writer.writeJson(MCP_CONFIG_PATH, manifest.mcpConfig());
    await writer.writeFile(GROK_README_PATH, new GrokReadmeBuilder(config).readme({ skills }));
    await writer.copyFile(this.#licenseFile, GROK_LICENSE_PATH);
    const icon = config.data.interface.composerIcon;
    if (typeof icon === "string") {
      await writer.copyFile(path.join(assetsRoot, icon.slice(2)), GROK_ICON_PATH);
    }
  }

  /** @param {import("./Target.mjs").RuleOptions} options */
  rules({ mcpUrl }) {
    return createGrokRules({ licenseFile: this.#licenseFile, mcpUrl });
  }
}
