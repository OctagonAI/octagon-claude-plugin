#!/usr/bin/env node
// @ts-check
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createBuild } from "./lib/createBuild.mjs";
import { PackagingError } from "./lib/errors.mjs";
import { GROK_PLUGINS_DIR, GrokManifestBuilder } from "./lib/manifest/GrokManifestBuilder.mjs";
import { Archiver } from "./lib/output/Archiver.mjs";
import { PackageView } from "./lib/validation/PackageView.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPO_URL = "https://github.com/OctagonAI/octagon-claude-plugin.git";
const COMMANDS = ["build", "validate", "sync", "entry"];

const USAGE = `Usage: node tools/openai-plugin/cli.mjs <command> [options]

Commands:
  build      Build and validate the plugin package into out/ (OpenAI: also zip it)
  validate   Re-validate the existing build in out/ without rebuilding
  sync       Grok only: copy the validated build into grok/plugins/<name>/ (--check: report drift instead)
  entry      Grok only: print the marketplace.json entry for the current HEAD commit

Options:
  --target NAME   Package format: openai (default) or grok
  --profile NAME  Build the plugin under openai/profiles/NAME (default: openai/ itself)
  --online        Also check that every public URL answers 2xx
  --out DIR       Output directory (default: out/)
  --check         With sync: exit non-zero if grok/plugins/<name>/ differs from the build
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
  if (values.target !== "openai" && values.target !== "grok") {
    console.error(`Unknown target "${values.target}"; use openai or grok.`);
    return 2;
  }
  const target = /** @type {"openai" | "grok"} */ (values.target);

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

  if (command === "entry") {
    if (!build.sync) return grokOnly(command);
    const entry = new GrokManifestBuilder(build.config).catalogEntry({
      repoUrl: REPO_URL,
      sha: headSha(),
      path: `${GROK_PLUGINS_DIR}/${build.config.data.name}`,
    });
    console.log(JSON.stringify(entry, null, 2));
    return 0;
  }

  if (command === "sync") {
    if (!build.sync) return grokOnly(command);
    const result = await build.pipeline.run();
    printFindings(result.validation);
    if (!result.ok) return 1;
    const relative = path.relative(REPO_ROOT, build.sync.targetDir);
    if (values.check) {
      const drift = await build.sync.check(result.stagingDir);
      for (const { kind, path: file } of drift) console.error(`${kind.padEnd(7)} ${relative}/${file}`);
      if (drift.length > 0) {
        console.error(`${relative}/ is out of date (${drift.length} file(s)); run: npm run sync:grok`);
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
  const zipPath = build.writer.artifactPath(`${build.config.data.name}-openai-${build.config.data.version}.zip`);
  if (target === "openai" && existsSync(zipPath)) {
    const archive = await new Archiver().inspect(zipPath);
    validation = validation.merge(await build.validator.run({ pkg, archive }, "archive"));
  }
  printFindings(validation);
  return validation.ok ? 0 : 1;
}

/** @param {string} command */
function grokOnly(command) {
  console.error(`"${command}" applies to the grok target only; pass --target grok.`);
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
