// @ts-check
import { rm } from "node:fs/promises";
import { MANIFEST_PATH, MCP_CONFIG_PATH, ManifestBuilder } from "../manifest/ManifestBuilder.mjs";
import { Archiver } from "../output/Archiver.mjs";
import { createOpenAIRules } from "../validation/rules/index.mjs";
import { Target } from "./Target.mjs";

/**
 * The OpenAI directory package: Codex manifest, `.mcp.json`, listing assets,
 * and a reproducible ZIP. This is the behavior the pipeline had before targets
 * existed, moved behind the interface unchanged.
 */
export class OpenAITarget extends Target {
  /** @type {ManifestBuilder | undefined} */ #manifest;
  /** @type {Archiver} */ #archiver;

  /**
   * @param {{ manifest?: ManifestBuilder, archiver?: Archiver }} [options]
   *   `manifest` defaults to a builder over the config the pipeline passes to `emit`.
   */
  constructor({ manifest, archiver = new Archiver() } = {}) {
    super();
    this.#manifest = manifest;
    this.#archiver = archiver;
  }

  get id() {
    return /** @type {const} */ ("openai");
  }

  get manifestPath() {
    return MANIFEST_PATH;
  }

  /** @param {import("./Target.mjs").EmitContext} context */
  async emit({ writer, config }) {
    const manifest = this.#manifest ?? new ManifestBuilder(config);
    await writer.writeJson(MANIFEST_PATH, manifest.manifest());
    await writer.writeJson(MCP_CONFIG_PATH, manifest.mcpConfig());
  }

  /** @param {import("../config/PluginConfig.mjs").PluginConfig} config */
  assetPaths(config) {
    return config.assetPaths();
  }

  /** @param {import("./Target.mjs").RuleOptions} options */
  rules({ knownTools, online = false }) {
    return createOpenAIRules({ knownTools, online });
  }

  /**
   * Zips the staged package when validation passed; otherwise removes any ZIP
   * left by an earlier successful build so `validate` and a careless upload
   * cannot pick up stale output.
   *
   * @param {import("./Target.mjs").FinalizeContext} context
   */
  async finalize({ writer, files, pkg, validator, validation }) {
    const { name, version } = /** @type {{ name: string, version: string }} */ (pkg.manifestObject() ?? {});
    const zipPath = writer.artifactPath(`${name}-openai-${version}.zip`);
    if (!validation.ok) {
      await rm(zipPath, { force: true });
      return { archive: null, validation };
    }
    const archive = await this.#archiver.create(writer.stagingDir, files, zipPath);
    return { archive, validation: validation.merge(await validator.run({ pkg, archive }, "archive")) };
  }
}
