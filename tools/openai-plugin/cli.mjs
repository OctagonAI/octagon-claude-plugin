#!/usr/bin/env node
// @ts-check
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createBuild } from "./lib/createBuild.mjs";
import { PackagingError } from "./lib/errors.mjs";
import { Archiver } from "./lib/output/Archiver.mjs";
import { PackageView } from "./lib/validation/PackageView.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const USAGE = `Usage: node tools/openai-plugin/cli.mjs <command> [options]

Commands:
  build      Build, validate, and zip the OpenAI plugin package into out/
  validate   Re-validate the existing build in out/ without rebuilding

Options:
  --online   Also check that every public URL answers 2xx
  --out DIR  Output directory (default: out/)
  --help     Show this message`;

/** @param {import("./lib/validation/Validator.mjs").ValidationReport} validation */
function printFindings(validation) {
  for (const finding of validation.findings) {
    const stream = finding.severity === "error" ? process.stderr : process.stdout;
    stream.write(`${finding.toString()}\n`);
  }
  console.log(`${validation.errors.length} error(s), ${validation.warnings.length} warning(s)`);
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      online: { type: "boolean", default: false },
      out: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });
  const [command] = positionals;
  if (values.help || !["build", "validate"].includes(command ?? "")) {
    console.log(USAGE);
    return values.help ? 0 : 2;
  }

  const outRoot = values.out ? path.resolve(values.out) : undefined;
  const build = await createBuild({ repoRoot: REPO_ROOT, outRoot, online: values.online });

  if (command === "build") {
    const result = await build.pipeline.run();
    const { catalog } = result;
    console.log(
      `${result.plugin.name}@${result.plugin.version}: ${catalog.count} skills ` +
        `(${catalog.transformed.length} converted, ${catalog.added.length} added, ` +
        `${catalog.overridden.length} overridden, ${catalog.excluded.length} excluded)`,
    );
    printFindings(result.validation);
    if (result.archive) console.log(`Archive: ${path.relative(process.cwd(), result.archive.path)} (sha256 ${result.archive.sha256})`);
    return result.ok ? 0 : 1;
  }

  const { stagingDir } = build.writer;
  if (!existsSync(stagingDir)) {
    console.error(`Nothing to validate at ${stagingDir}; run the build command first.`);
    return 1;
  }
  const pkg = await PackageView.load(stagingDir);
  let validation = await build.validator.run({ pkg }, "package");
  const zipPath = build.writer.artifactPath(`${build.config.data.name}-openai-${build.config.data.version}.zip`);
  if (existsSync(zipPath)) {
    const archive = await new Archiver().inspect(zipPath);
    validation = validation.merge(await build.validator.run({ pkg, archive }, "archive"));
  }
  printFindings(validation);
  return validation.ok ? 0 : 1;
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
