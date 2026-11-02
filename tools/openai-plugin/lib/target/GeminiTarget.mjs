// @ts-check
import { ConfigError } from "../errors.mjs";
import { GeminiContextBuilder } from "../manifest/GeminiContextBuilder.mjs";
import {
  GEMINI_CONTEXT_PATH,
  GEMINI_EXTENSIONS_DIR,
  GEMINI_LICENSE_PATH,
  GEMINI_MANIFEST_PATH,
  GEMINI_README_PATH,
  GeminiManifestBuilder,
} from "../manifest/GeminiManifestBuilder.mjs";
import { GeminiReadmeBuilder } from "../manifest/GeminiReadmeBuilder.mjs";
import { createGeminiRules } from "../validation/rules/gemini/index.mjs";
import { Target } from "./Target.mjs";

/** The GitHub organization every mirror repository must live under. */
export const MIRROR_OWNER = "OctagonAI";

/**
 * The Gemini CLI extension: a directory with the native manifest (remote
 * Streamable HTTP server, OAuth by discovery), a short always-on `GEMINI.md`,
 * the skills, a README, and the license. No archive; the directory is
 * committed under `gemini/extensions/<name>/` and mirrored to its own public
 * repository, which the gallery crawler indexes by topic.
 */
export class GeminiTarget extends Target {
  /** @type {string} */ #licenseFile;

  /** @param {{ licenseFile: string }} options Absolute path of the repository's LICENSE. */
  constructor({ licenseFile }) {
    super();
    this.#licenseFile = licenseFile;
  }

  get id() {
    return /** @type {const} */ ("gemini");
  }

  get manifestPath() {
    return GEMINI_MANIFEST_PATH;
  }

  get repoDir() {
    return GEMINI_EXTENSIONS_DIR;
  }

  /**
   * The `gemini` and `listing` blocks must exist, the allow-list must name
   * configured tools (also checked at load), and the mirror must be under the
   * Octagon organization so the gallery shows the brand's own avatar.
   *
   * @param {import("../config/PluginConfig.mjs").PluginConfig} config
   */
  checkConfig(config) {
    const gemini = config.gemini();
    config.listing();
    const problems = [];
    if (!gemini.repository.startsWith(`https://github.com/${MIRROR_OWNER}/`)) {
      problems.push(`gemini.repository must be under https://github.com/${MIRROR_OWNER}/`);
    }
    if (problems.length > 0) throw new ConfigError(`plugin "${config.data.name}"`, problems);
  }

  /** @param {import("./Target.mjs").EmitContext} context */
  async emit({ writer, config, skills }) {
    const manifest = new GeminiManifestBuilder(config);
    await writer.writeJson(GEMINI_MANIFEST_PATH, manifest.manifest());
    await writer.writeFile(GEMINI_CONTEXT_PATH, new GeminiContextBuilder(config).context());
    await writer.writeFile(GEMINI_README_PATH, new GeminiReadmeBuilder(config).readme({ skills }));
    await writer.copyFile(this.#licenseFile, GEMINI_LICENSE_PATH);
  }

  /** @param {import("./Target.mjs").RuleOptions} options */
  rules({ mcpUrl, pluginName, includeTools, tools }) {
    return createGeminiRules({
      licenseFile: this.#licenseFile,
      expectedName: pluginName,
      mcpUrl,
      includeTools,
      tools: includeTools ?? tools ?? [],
    });
  }
}
