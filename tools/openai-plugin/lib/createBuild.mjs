// @ts-check
import { readdirSync } from "node:fs";
import path from "node:path";
import { BuildPipeline } from "./BuildPipeline.mjs";
import { SkillCatalog } from "./catalog/SkillCatalog.mjs";
import { PluginConfig } from "./config/PluginConfig.mjs";
import { Profile } from "./config/Profile.mjs";
import { TransformConfig } from "./config/TransformConfig.mjs";
import { ConfigError } from "./errors.mjs";
import { PackageWriter } from "./output/PackageWriter.mjs";
import { RepoSync } from "./output/RepoSync.mjs";
import { SkillRepository } from "./source/SkillRepository.mjs";
import { GrokTarget } from "./target/GrokTarget.mjs";
import { OpenAITarget } from "./target/OpenAITarget.mjs";
import { createRules, createSharedRules } from "./validation/rules/index.mjs";
import { Validator } from "./validation/Validator.mjs";

/** @typedef {import("./target/Target.mjs").Target} Target */
/** @typedef {import("./target/Target.mjs").TargetId} TargetId */

/** Repository layout the tool reads from. Everything here is read-only. */
export function layout(/** @type {string} */ repoRoot) {
  return Object.freeze({
    repoRoot,
    sourceSkills: path.join(repoRoot, "skills"),
    openaiRoot: path.join(repoRoot, "openai"),
    licenseFile: path.join(repoRoot, "LICENSE"),
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
 * @param {TargetId} id
 * @param {ReturnType<typeof layout>} paths
 * @returns {Target}
 */
function createTarget(id, paths) {
  switch (id) {
    case "openai":
      return new OpenAITarget();
    case "grok":
      return new GrokTarget({ licenseFile: paths.licenseFile });
    default:
      throw new ConfigError(`target "${id}"`, ['targets are "openai" and "grok"']);
  }
}

/**
 * Composition root: wires every collaborator from the repository layout, the
 * selected profile, and the selected target.
 *
 * @param {{ repoRoot: string, outRoot?: string, online?: boolean, profile?: string, target?: TargetId }} options
 *   `profile` names a directory under `openai/profiles/`; omitted means `openai/` itself.
 *   `target` selects the package format; omitted means the OpenAI directory.
 */
export async function createBuild({ repoRoot, outRoot, online = false, profile: profileName, target: targetId = "openai" }) {
  const paths = layout(path.resolve(repoRoot));
  const profile = Profile.resolve(paths.openaiRoot, profileName);
  const target = createTarget(targetId, paths);
  const [config, transforms] = await Promise.all([
    PluginConfig.load(profile.pluginConfig),
    TransformConfig.load(profile.transformConfig),
  ]);
  if (target.id === "grok") config.grok();

  const ruleOptions = { knownTools: config.data.mcp.tools, forbiddenText: transforms.forbiddenRegexes(), online };
  // The OpenAI target keeps the original rule order; other targets get the
  // shared rules followed by their own.
  const rules = target.id === "openai" ? createRules(ruleOptions) : [...createSharedRules(ruleOptions), ...target.rules(ruleOptions)];
  const validator = new Validator(rules);

  const writer = new PackageWriter({
    outRoot: outRoot ?? paths.defaultOut,
    stagingRoot: target.id,
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
    target,
    writer,
    validator,
    assetsRoot: profile.assets,
  });

  const sync = target.id === "grok" ? new RepoSync({ repoRoot: paths.repoRoot, pluginName: config.data.name }) : null;

  return { pipeline, validator, writer, config, transforms, paths, profile, target, sync };
}
