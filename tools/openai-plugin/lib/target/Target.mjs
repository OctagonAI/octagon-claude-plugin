// @ts-check

/** @typedef {import("../config/PluginConfig.mjs").PluginConfig} PluginConfig */
/** @typedef {import("../output/PackageWriter.mjs").PackageWriter} PackageWriter */
/** @typedef {import("../output/Archiver.mjs").ArchiveInfo} ArchiveInfo */
/** @typedef {import("../skill/SkillDocument.mjs").SkillDocument} SkillDocument */
/** @typedef {import("../validation/Rule.mjs").Rule} Rule */
/** @typedef {import("../validation/Validator.mjs").Validator} Validator */
/** @typedef {import("../validation/Validator.mjs").ValidationReport} ValidationReport */
/** @typedef {import("../validation/PackageView.mjs").PackageView} PackageView */
/** @typedef {"openai" | "grok"} TargetId */

/**
 * @typedef {{ writer: PackageWriter, config: PluginConfig, skills: readonly SkillDocument[], assetsRoot: string }} EmitContext
 * @typedef {{ writer: PackageWriter, files: readonly string[], pkg: PackageView, validator: Validator, validation: ValidationReport }} FinalizeContext
 * @typedef {{ archive: ArchiveInfo | null, validation: ValidationReport }} FinalizeResult
 * @typedef {{ knownTools: readonly string[], forbiddenText: readonly import("../validation/rules/ForbiddenTextRule.mjs").ForbiddenText[], online?: boolean, mcpUrl?: string }} RuleOptions
 */

/**
 * One distribution format for a built skill catalog.
 *
 * The pipeline stages the same skills and assets for every target; a target
 * contributes the files that differ (manifest, server config, README), the
 * validation rules that only make sense for its directory, and the final
 * artifact step (a ZIP for OpenAI, nothing for Grok, where the directory is
 * the artifact).
 *
 * @abstract
 */
export class Target {
  /** @returns {TargetId} */
  get id() {
    throw new Error("Target.id is not implemented");
  }

  /** @returns {string} Package-relative path of the manifest this target writes. */
  get manifestPath() {
    throw new Error("Target.manifestPath is not implemented");
  }

  /**
   * Checks the parts of the config only this target reads, before anything
   * is built. The default accepts every config.
   *
   * @param {PluginConfig} _config
   * @throws {import("../errors.mjs").ConfigError}
   */
  checkConfig(_config) {}

  /**
   * Writes the target-specific files into the staging directory.
   *
   * @param {EmitContext} _context
   * @returns {Promise<void>}
   */
  async emit(_context) {
    throw new Error(`${this.id}.emit() is not implemented`);
  }

  /**
   * Listing assets to copy into the package verbatim, as paths relative to the
   * profile's assets root. Targets that embed assets themselves return nothing.
   *
   * @param {PluginConfig} _config
   * @returns {string[]}
   */
  assetPaths(_config) {
    return [];
  }

  /**
   * Validation rules that only apply to this target's package format. Shared
   * rules (skills, links, secrets, forbidden text) are added by the composition root.
   *
   * @param {RuleOptions} _options
   * @returns {Rule[]}
   */
  rules(_options) {
    return [];
  }

  /**
   * Produces the artifact once package validation passed, or cleans up a stale
   * one when it did not. The default is a directory-only target: nothing to do.
   *
   * @param {FinalizeContext} context
   * @returns {Promise<FinalizeResult>}
   */
  async finalize({ validation }) {
    return { archive: null, validation };
  }
}
