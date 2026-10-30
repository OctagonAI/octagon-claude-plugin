// @ts-check
import path from "node:path";
import { OpenAITarget } from "./target/OpenAITarget.mjs";
import { PackageView } from "./validation/PackageView.mjs";

/** @typedef {import("./catalog/SkillCatalog.mjs").SkillCatalog} SkillCatalog */
/** @typedef {import("./catalog/SkillCatalog.mjs").CatalogResult} CatalogResult */
/** @typedef {import("./config/PluginConfig.mjs").PluginConfig} PluginConfig */
/** @typedef {import("./manifest/ManifestBuilder.mjs").ManifestBuilder} ManifestBuilder */
/** @typedef {import("./output/Archiver.mjs").Archiver} Archiver */
/** @typedef {import("./output/Archiver.mjs").ArchiveInfo} ArchiveInfo */
/** @typedef {import("./output/PackageWriter.mjs").PackageWriter} PackageWriter */
/** @typedef {import("./target/Target.mjs").Target} Target */
/** @typedef {import("./target/Target.mjs").TargetId} TargetId */
/** @typedef {import("./validation/Validator.mjs").Validator} Validator */
/** @typedef {import("./validation/Validator.mjs").ValidationReport} ValidationReport */

/**
 * @param {string} pluginName
 * @param {TargetId} [target]
 * @returns {string} Report file name, distinct per plugin and target so builds don't overwrite each other.
 *   The OpenAI name is unchanged from before targets existed.
 */
export function reportFileName(pluginName, target = "openai") {
  return target === "openai" ? `${pluginName}.build-report.json` : `${pluginName}.${target}.build-report.json`;
}

/**
 * @typedef {{
 *   ok: boolean,
 *   target: TargetId,
 *   plugin: { name: string, version: string },
 *   stagingDir: string,
 *   catalog: Omit<CatalogResult, "skills"> & { count: number },
 *   archive: ArchiveInfo | null,
 *   validation: ValidationReport,
 * }} BuildResult
 */

/**
 * Orchestrates one build:
 *   catalog → target files → skills → assets → validate package → target artifact → report.
 *
 * Collaborators are injected, so each step can be replaced in tests. The
 * target decides what the package looks like beyond its skills: the OpenAI
 * target writes the Codex manifest and zips; the Grok target writes the Grok
 * manifest and README and leaves a directory. If package validation reports an
 * error, no artifact is produced.
 */
export class BuildPipeline {
  /** @type {PluginConfig} */ #config;
  /** @type {SkillCatalog} */ #catalog;
  /** @type {Target} */ #target;
  /** @type {PackageWriter} */ #writer;
  /** @type {Validator} */ #validator;
  /** @type {string} */ #assetsRoot;

  /**
   * @param {{
   *   config: PluginConfig,
   *   catalog: SkillCatalog,
   *   writer: PackageWriter,
   *   validator: Validator,
   *   assetsRoot: string,
   *   target?: Target,
   *   manifest?: ManifestBuilder,
   *   archiver?: Archiver,
   * }} deps `assetsRoot` is the directory that listing asset paths are relative to.
   *   `target` defaults to the OpenAI target; `manifest` and `archiver` are the
   *   pre-target way of configuring it and are honored when `target` is omitted.
   */
  constructor({ config, catalog, writer, validator, assetsRoot, target, manifest, archiver }) {
    this.#config = config;
    this.#catalog = catalog;
    this.#target = target ?? new OpenAITarget({ manifest, archiver });
    this.#writer = writer;
    this.#validator = validator;
    this.#assetsRoot = assetsRoot;
  }

  /** @returns {Promise<BuildResult>} */
  async run() {
    const { skills, ...catalog } = await this.#catalog.build();

    await this.#writer.reset();
    await this.#target.emit({ writer: this.#writer, config: this.#config, skills, assetsRoot: this.#assetsRoot });
    for (const skill of skills) await this.#writer.writeSkill(skill);
    for (const asset of this.#target.assetPaths(this.#config)) {
      await this.#writer.copyFile(path.join(this.#assetsRoot, asset), asset);
    }
    const files = await this.#writer.seal();

    const pkg = await PackageView.load(this.#writer.stagingDir, { manifestPath: this.#target.manifestPath });
    const packageValidation = await this.#validator.run({ pkg }, "package");
    const { archive, validation } = await this.#target.finalize({
      writer: this.#writer,
      files,
      pkg,
      validator: this.#validator,
      validation: packageValidation,
    });

    /** @type {BuildResult} */
    const result = {
      ok: validation.ok,
      target: this.#target.id,
      plugin: { name: this.#config.data.name, version: this.#config.data.version },
      stagingDir: this.#writer.stagingDir,
      catalog: { ...catalog, count: skills.length },
      archive,
      validation,
    };
    await this.#writer.writeArtifactJson(reportFileName(this.#config.data.name, this.#target.id), result);
    return result;
  }
}
