#!/usr/bin/env node
// @ts-check
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { SOURCE_REPOSITORY, TARGET_IDS, createBuild } from "./lib/createBuild.mjs";
import { PackagingError } from "./lib/errors.mjs";
import { GeminiManifestBuilder } from "./lib/manifest/GeminiManifestBuilder.mjs";
import { GROK_PLUGINS_DIR, GrokManifestBuilder } from "./lib/manifest/GrokManifestBuilder.mjs";
import { KIMI_CATALOG_PATH, KIMI_CATALOG_VERSION, KimiManifestBuilder } from "./lib/manifest/KimiManifestBuilder.mjs";
import { CatalogSync } from "./lib/output/CatalogSync.mjs";
import { PluginConfig } from "./lib/config/PluginConfig.mjs";
import { Profile } from "./lib/config/Profile.mjs";
import { layout } from "./lib/createBuild.mjs";
import { Archiver } from "./lib/output/Archiver.mjs";
import { PackageView } from "./lib/validation/PackageView.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO_URL = `${SOURCE_REPOSITORY}.git`;
const COMMANDS = ["build", "validate", "sync", "entry", "about", "catalog"];

const USAGE = `Usage: node tools/openai-plugin/cli.mjs <command> [options]

Commands:
  build      Build and validate the plugin package into out/ (OpenAI, Kimi: also zip it)
  validate   Re-validate the existing build in out/ without rebuilding
  sync       Grok, Gemini, Kimi: build, then copy the validated package into its committed
             directory (grok/plugins/, gemini/extensions/, kimi/plugins/); --check reports drift instead
  entry      Grok: print the marketplace.json entry for the current HEAD commit
             Kimi: print the catalog entry (release asset URL, display text, availability)
  about      Gemini, Kimi: print the mirror repository's About settings (description, homepage, topics)
  catalog    Kimi only: write kimi/marketplace.json from every profile with a kimi block; --check reports drift

Options:
  --target NAME   Package format: openai (default), grok, gemini, or kimi
  --profile NAME  Build the plugin under openai/profiles/NAME (default: openai/ itself)
  --online        Also check that every public URL answers 2xx
  --out DIR       Output directory (default: out/)
  --check         With sync: exit non-zero if the committed directory differs from the build
  --help          Show this message`;

/** @param {import("./lib/validation/Validator.mjs").ValidationReport} validation */
function printFindings(validation) {
  for (const finding of validation.findings) {
    const stream = finding.severity === "error" ? process.stderr : process.stdout;
    stream.write(`${finding.toString()}\n`);
  }
  console.log(`${validation.errors.length} error(s), ${validation.warnings.length} warning(s)`);
}

/** @returns {string} The commit the working tree is at. */
function headSha() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      online: { type: "boolean", default: false },
      check: { type: "boolean", default: false },
      out: { type: "string" },
      profile: { type: "string" },
      target: { type: "string", default: "openai" },
      help: { type: "boolean", default: false },
    },
  });
  const [command] = positionals;
  if (values.help || !COMMANDS.includes(command ?? "")) {
    console.log(USAGE);
    return values.help ? 0 : 2;
  }
  if (!TARGET_IDS.includes(/** @type {any} */ (values.target))) {
    console.error(`Unknown target "${values.target}"; use ${TARGET_IDS.join(", ")}.`);
    return 2;
  }
  const target = /** @type {import("./lib/target/Target.mjs").TargetId} */ (values.target);

  const outRoot = values.out ? path.resolve(values.out) : undefined;
  const build = await createBuild({ repoRoot: REPO_ROOT, outRoot, online: values.online, profile: values.profile, target });

  if (command === "build") {
    const result = await build.pipeline.run();
    const { catalog } = result;
    console.log(
      `${result.plugin.name}@${result.plugin.version} [${result.target}]: ${catalog.count} skills ` +
        `(${catalog.transformed.length} converted, ${catalog.added.length} added, ` +
        `${catalog.overridden.length} overridden, ${catalog.excluded.length} excluded)`,
    );
    printFindings(result.validation);
    if (result.archive) console.log(`Archive: ${path.relative(process.cwd(), result.archive.path)} (sha256 ${result.archive.sha256})`);
    if (result.ok && !result.archive) console.log(`Package: ${path.relative(process.cwd(), result.stagingDir)}/`);
    return result.ok ? 0 : 1;
  }

  if (command === "catalog") {
    if (target !== "kimi") return onlyFor(command, "kimi");
    return kimiCatalog(values.check);
  }

  if (command === "entry") {
    if (target === "kimi") {
      console.log(JSON.stringify(new KimiManifestBuilder(build.config).catalogEntry(), null, 2));
      return 0;
    }
    if (target !== "grok") return onlyFor(command, "grok or kimi");
    const entry = new GrokManifestBuilder(build.config).catalogEntry({
      repoUrl: REPO_URL,
      sha: headSha(),
      path: `${GROK_PLUGINS_DIR}/${build.config.data.name}`,
    });
    console.log(JSON.stringify(entry, null, 2));
    return 0;
  }

  if (command === "about") {
    if (target === "kimi") {
      console.log(JSON.stringify(new KimiManifestBuilder(build.config).aboutSettings(), null, 2));
      return 0;
    }
    if (target !== "gemini") return onlyFor(command, "gemini or kimi");
    console.log(JSON.stringify(new GeminiManifestBuilder(build.config).aboutSettings(), null, 2));
    return 0;
  }

  if (command === "sync") {
    if (!build.sync) {
      console.error(`"sync" applies to targets with a committed directory (grok, gemini, kimi); --target ${target} produces an archive.`);
      return 2;
    }
    const result = await build.pipeline.run();
    printFindings(result.validation);
    if (!result.ok) return 1;
    const relative = path.relative(REPO_ROOT, build.sync.targetDir);
    if (values.check) {
      const drift = await build.sync.check(result.stagingDir);
      for (const { kind, path: file } of drift) console.error(`${kind.padEnd(7)} ${relative}/${file}`);
      if (drift.length > 0) {
        console.error(`${relative}/ is out of date (${drift.length} file(s)); run: npm run sync:${target}`);
        return 1;
      }
      console.log(`${relative}/ matches the build`);
      return 0;
    }
    const files = await build.sync.sync(result.stagingDir, result);
    console.log(`Synced ${files.length} files to ${relative}/`);
    return 0;
  }

  const { stagingDir } = build.writer;
  if (!existsSync(stagingDir)) {
    console.error(`Nothing to validate at ${stagingDir}; run the build command first.`);
    return 1;
  }
  const pkg = await PackageView.load(stagingDir, { manifestPath: build.target.manifestPath });
  let validation = await build.validator.run({ pkg }, "package");
  const zipName = build.target.archiveName(build.config);
  const zipPath = zipName ? build.writer.artifactPath(zipName) : null;
  if (zipPath && existsSync(zipPath)) {
    const archive = await new Archiver().inspect(zipPath);
    validation = validation.merge(await build.validator.run({ pkg, archive }, "archive"));
  }
  printFindings(validation);
  return validation.ok ? 0 : 1;
}

/**
 * Assembles the self-serve Kimi catalog from every profile that declares a
 * `kimi` block, in profile order, and writes or checks `kimi/marketplace.json`.
 *
 * @param {boolean} check
 * @returns {Promise<number>}
 */
async function kimiCatalog(check) {
  const paths = layout(REPO_ROOT);
  const entries = [];
  for (const profile of Profile.all(paths.openaiRoot)) {
    const config = await PluginConfig.load(profile.pluginConfig);
    if (!config.data.kimi) continue;
    entries.push(new KimiManifestBuilder(config).catalogEntry());
  }
  if (entries.length === 0) {
    console.error("No profile declares a kimi block; nothing to catalog.");
    return 1;
  }
  const catalog = { version: KIMI_CATALOG_VERSION, plugins: entries };
  const sync = new CatalogSync({ repoRoot: REPO_ROOT, relativePath: KIMI_CATALOG_PATH });
  if (check) {
    const drift = await sync.check(catalog);
    if (drift) {
      console.error(`${KIMI_CATALOG_PATH} is ${drift}; run: npm run catalog:kimi`);
      return 1;
    }
    console.log(`${KIMI_CATALOG_PATH} matches the profiles`);
    return 0;
  }
  await sync.write(catalog);
  console.log(`Wrote ${entries.length} entries to ${KIMI_CATALOG_PATH}`);
  return 0;
}

/**
 * @param {string} command
 * @param {string} target
 */
function onlyFor(command, target) {
  console.error(`"${command}" applies to the ${target} target only; pass --target ${target}.`);
  return 2;
}

main().then(
  code => {
    process.exitCode = code;
  },
  error => {
    if (error instanceof PackagingError) {
      console.error(`${error.name}: ${error.message}`);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  },
);
