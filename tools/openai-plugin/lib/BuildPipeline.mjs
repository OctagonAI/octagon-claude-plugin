// @ts-check
import path from "node:path";
import { MANIFEST_PATH, MCP_CONFIG_PATH } from "./manifest/ManifestBuilder.mjs";
import { PackageView } from "./validation/PackageView.mjs";

/** @typedef {import("./catalog/SkillCatalog.mjs").SkillCatalog} SkillCatalog */
/** @typedef {import("./catalog/SkillCatalog.mjs").CatalogResult} CatalogResult */
/** @typedef {import("./config/PluginConfig.mjs").PluginConfig} PluginConfig */
/** @typedef {import("./manifest/ManifestBuilder.mjs").ManifestBuilder} ManifestBuilder */
/** @typedef {import("./output/Archiver.mjs").Archiver} Archiver */
/** @typedef {import("./output/Archiver.mjs").ArchiveInfo} ArchiveInfo */
/** @typedef {import("./output/PackageWriter.mjs").PackageWriter} PackageWriter */
/** @typedef {import("./validation/Validator.mjs").Validator} Validator */
/** @typedef {import("./validation/Validator.mjs").ValidationReport} ValidationReport */

export const REPORT_FILE = "build-report.json";

/**
 * @typedef {{
 *   ok: boolean,
 *   plugin: { name: string, version: string },
 *   stagingDir: string,
 *   catalog: Omit<CatalogResult, "skills"> & { count: number },
 *   archive: ArchiveInfo | null,
 *   validation: ValidationReport,
 * }} BuildResult
 */

/**
 * Orchestrates one build:
 *   catalog → manifest → stage → validate package → zip → validate archive → report.
 *
 * Collaborators are injected, so each step can be replaced in tests. If package
 * validation reports an error, no archive is produced.
 */
export class BuildPipeline {
  /** @type {PluginConfig} */ #config;
  /** @type {SkillCatalog} */ #catalog;
  /** @type {ManifestBuilder} */ #manifest;
  /** @type {PackageWriter} */ #writer;
  /** @type {Validator} */ #validator;
  /** @type {Archiver} */ #archiver;
  /** @type {string} */ #assetsRoot;

  /**
   * @param {{
   *   config: PluginConfig,
   *   catalog: SkillCatalog,
   *   manifest: ManifestBuilder,
   *   writer: PackageWriter,
   *   validator: Validator,
   *   archiver: Archiver,
   *   assetsRoot: string,
   * }} deps `assetsRoot` is the directory that listing asset paths are relative to.
   */
  constructor({ config, catalog, manifest, writer, validator, archiver, assetsRoot }) {
    this.#config = config;
    this.#catalog = catalog;
    this.#manifest = manifest;
    this.#writer = writer;
    this.#validator = validator;
    this.#archiver = archiver;
    this.#assetsRoot = assetsRoot;
  }

  /** @returns {Promise<BuildResult>} */
  async run() {
    const { skills, ...catalog } = await this.#catalog.build();

    await this.#writer.reset();
    await this.#writer.writeJson(MANIFEST_PATH, this.#manifest.manifest());
    await this.#writer.writeJson(MCP_CONFIG_PATH, this.#manifest.mcpConfig());
    for (const skill of skills) await this.#writer.writeSkill(skill);
    for (const asset of this.#config.assetPaths()) {
      await this.#writer.copyFile(path.join(this.#assetsRoot, asset), asset);
    }
    const files = await this.#writer.seal();

    const pkg = await PackageView.load(this.#writer.stagingDir);
    let validation = await this.#validator.run({ pkg }, "package");

    /** @type {ArchiveInfo | null} */
    let archive = null;
    if (validation.ok) {
      const { name, version } = this.#config.data;
      archive = await this.#archiver.create(
        this.#writer.stagingDir,
        files,
        this.#writer.artifactPath(`${name}-openai-${version}.zip`),
      );
      validation = validation.merge(await this.#validator.run({ pkg, archive }, "archive"));
    }

    /** @type {BuildResult} */
    const result = {
      ok: validation.ok,
      plugin: { name: this.#config.data.name, version: this.#config.data.version },
      stagingDir: this.#writer.stagingDir,
      catalog: { ...catalog, count: skills.length },
      archive,
      validation,
    };
    await this.#writer.writeArtifactJson(REPORT_FILE, result);
    return result;
  }
}
