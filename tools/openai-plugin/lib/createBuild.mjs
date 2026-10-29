// @ts-check
import { readdirSync } from "node:fs";
import path from "node:path";
import { BuildPipeline } from "./BuildPipeline.mjs";
import { SkillCatalog } from "./catalog/SkillCatalog.mjs";
import { PluginConfig } from "./config/PluginConfig.mjs";
import { Profile } from "./config/Profile.mjs";
import { TransformConfig } from "./config/TransformConfig.mjs";
import { ManifestBuilder } from "./manifest/ManifestBuilder.mjs";
import { Archiver } from "./output/Archiver.mjs";
import { PackageWriter } from "./output/PackageWriter.mjs";
import { SkillRepository } from "./source/SkillRepository.mjs";
import { createRules } from "./validation/rules/index.mjs";
import { Validator } from "./validation/Validator.mjs";

/** Repository layout the tool reads from. Everything here is read-only. */
export function layout(/** @type {string} */ repoRoot) {
  return Object.freeze({
    repoRoot,
    sourceSkills: path.join(repoRoot, "skills"),
    openaiRoot: path.join(repoRoot, "openai"),
    defaultOut: path.join(repoRoot, "out"),
  });
}

/**
 * Every top-level entry of the repository except the default output directory.
 * Inside the repository, build output may therefore only go under `out/`.
 *
 * @param {ReturnType<typeof layout>} paths
 * @returns {string[]}
 */
function protectedRepoPaths(paths) {
  const outName = path.basename(paths.defaultOut);
  return readdirSync(paths.repoRoot)
    .filter(name => name !== outName)
    .map(name => path.join(paths.repoRoot, name));
}

/**
 * Composition root: wires every collaborator from the repository layout and
 * the selected profile.
 *
 * @param {{ repoRoot: string, outRoot?: string, online?: boolean, profile?: string }} options
 *   `profile` names a directory under `openai/profiles/`; omitted means `openai/` itself.
 */
export async function createBuild({ repoRoot, outRoot, online = false, profile: profileName }) {
  const paths = layout(path.resolve(repoRoot));
  const profile = Profile.resolve(paths.openaiRoot, profileName);
  const [config, transforms] = await Promise.all([
    PluginConfig.load(profile.pluginConfig),
    TransformConfig.load(profile.transformConfig),
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
    protectedPaths: protectedRepoPaths(paths),
    enclosingRoots: [paths.repoRoot],
  });

  const pipeline = new BuildPipeline({
    config,
    catalog: new SkillCatalog({
      source: new SkillRepository(paths.sourceSkills),
      overlay: new SkillRepository(profile.skills),
      exclude: transforms.data.excludeSkills,
      include: transforms.data.includeSkills,
      transform: transforms.toPipeline(),
      requiredSources: transforms.editedSkills(),
    }),
    manifest: new ManifestBuilder(config),
    writer,
    validator,
    archiver: new Archiver(),
    assetsRoot: profile.assets,
  });

  return { pipeline, validator, writer, config, transforms, paths, profile };
}
