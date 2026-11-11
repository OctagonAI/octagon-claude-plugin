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
import { GeminiTarget } from "./target/GeminiTarget.mjs";
import { GrokTarget } from "./target/GrokTarget.mjs";
import { KimiTarget } from "./target/KimiTarget.mjs";
import { OpenAITarget } from "./target/OpenAITarget.mjs";
import { createRules, createSharedRules } from "./validation/rules/index.mjs";
import { SkillToolRule } from "./validation/rules/SkillToolRule.mjs";
import { Validator } from "./validation/Validator.mjs";

/** @typedef {import("./target/Target.mjs").Target} Target */
/** @typedef {import("./target/Target.mjs").TargetId} TargetId */

/** The repository every generated package is produced from. */
export const SOURCE_REPOSITORY = "https://github.com/OctagonAI/octagon-claude-plugin";
export const TARGET_IDS = Object.freeze(/** @type {const} */ (["openai", "grok", "gemini", "kimi"]));

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
 * @param {string} sourceSkills
 * @returns {string[]} Names of every skill directory in the source catalog.
 */
function catalogSkillNames(sourceSkills) {
  return readdirSync(sourceSkills, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith("."))
    .map(entry => entry.name);
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
    case "gemini":
      return new GeminiTarget({ licenseFile: paths.licenseFile });
    case "kimi":
      return new KimiTarget({ licenseFile: paths.licenseFile });
    default:
      throw new ConfigError(`target "${id}"`, [`targets are ${TARGET_IDS.map(name => `"${name}"`).join(", ")}`]);
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
  target.checkConfig(config);

  /** @type {import("./target/Target.mjs").RuleOptions} */
  const ruleOptions = {
    knownTools: config.data.mcp.tools,
    forbiddenText: transforms.forbiddenRegexes(),
    online,
    mcpUrl: config.data.mcp.url,
    pluginName: config.data.name,
    tools: config.data.mcp.tools,
    includeTools: target.allowList(config),
    config,
  };
  // The OpenAI target keeps the original rule order; other targets get the
  // shared rules followed by their own. A plugin built on one specialist tool
  // also gets the allocation fence, whatever the target.
  const fence = config.data.mcp.tools.length === 1 ? [new SkillToolRule({ tool: config.data.mcp.tools[0], catalogSkills: catalogSkillNames(paths.sourceSkills) })] : [];
  const rules = [...(target.id === "openai" ? createRules(ruleOptions) : [...createSharedRules(ruleOptions), ...target.rules(ruleOptions)]), ...fence];
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

  const sync = target.repoDir ? new RepoSync({ repoRoot: paths.repoRoot, pluginName: config.data.name, repoDir: target.repoDir }) : null;

  return { pipeline, validator, writer, config, transforms, paths, profile, target, sync };
}
