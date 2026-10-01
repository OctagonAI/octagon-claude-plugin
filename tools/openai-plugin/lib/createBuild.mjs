// @ts-check
import path from "node:path";
import { BuildPipeline } from "./BuildPipeline.mjs";
import { SkillCatalog } from "./catalog/SkillCatalog.mjs";
import { PluginConfig } from "./config/PluginConfig.mjs";
import { TransformConfig } from "./config/TransformConfig.mjs";
import { ManifestBuilder } from "./manifest/ManifestBuilder.mjs";
import { Archiver } from "./output/Archiver.mjs";
import { PackageWriter } from "./output/PackageWriter.mjs";
import { SkillRepository } from "./source/SkillRepository.mjs";
import { createRules } from "./validation/rules/index.mjs";
import { Validator } from "./validation/Validator.mjs";

/** Repository layout the tool reads from. Everything here is read-only. */
export function layout(/** @type {string} */ repoRoot) {
  const openaiRoot = path.join(repoRoot, "openai");
  return Object.freeze({
    repoRoot,
    sourceSkills: path.join(repoRoot, "skills"),
    openaiRoot,
    overlaySkills: path.join(openaiRoot, "skills"),
    pluginConfig: path.join(openaiRoot, "plugin.config.json"),
    transformConfig: path.join(openaiRoot, "transform.config.json"),
    defaultOut: path.join(repoRoot, "out"),
  });
}

/**
 * Composition root: wires every collaborator from the repository layout.
 *
 * @param {{ repoRoot: string, outRoot?: string, online?: boolean }} options
 */
export async function createBuild({ repoRoot, outRoot, online = false }) {
  const paths = layout(path.resolve(repoRoot));
  const [config, transforms] = await Promise.all([
    PluginConfig.load(paths.pluginConfig),
    TransformConfig.load(paths.transformConfig),
  ]);

  const validator = new Validator(
    createRules({
      knownTools: config.data.mcp.tools,
      forbiddenText: transforms.forbiddenRegexes(),
      online,
    }),
  );

  const writer = new PackageWriter({
    outRoot: outRoot ?? paths.defaultOut,
    pluginName: config.data.name,
    protectedPaths: [paths.repoRoot, paths.sourceSkills, paths.openaiRoot],
  });

  const pipeline = new BuildPipeline({
    config,
    catalog: new SkillCatalog({
      source: new SkillRepository(paths.sourceSkills),
      overlay: new SkillRepository(paths.overlaySkills),
      exclude: transforms.data.excludeSkills,
      transform: transforms.toPipeline(),
      requiredSources: transforms.editedSkills(),
    }),
    manifest: new ManifestBuilder(config),
    writer,
    validator,
    archiver: new Archiver(),
    assetsRoot: paths.openaiRoot,
  });

  return { pipeline, validator, writer, config, transforms, paths };
}
