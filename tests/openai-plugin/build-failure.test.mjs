import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import test from "node:test";
import { BuildPipeline } from "../../tools/openai-plugin/lib/BuildPipeline.mjs";
import { PluginConfig } from "../../tools/openai-plugin/lib/config/PluginConfig.mjs";
import { ManifestBuilder } from "../../tools/openai-plugin/lib/manifest/ManifestBuilder.mjs";
import { Archiver } from "../../tools/openai-plugin/lib/output/Archiver.mjs";
import { PackageWriter } from "../../tools/openai-plugin/lib/output/PackageWriter.mjs";
import { Rule } from "../../tools/openai-plugin/lib/validation/Rule.mjs";
import { Validator } from "../../tools/openai-plugin/lib/validation/Validator.mjs";
import { tempDir } from "./helpers.mjs";

/** Always reports one error, so package validation fails. */
class AlwaysFails extends Rule {
  check() {
    return [this.error("synthetic failure")];
  }
}

const emptyCatalog = {
  build: async () => ({ skills: [], transformed: [], added: [], overridden: [], excluded: [], incomplete: [] }),
};

/**
 * @param {string} outRoot
 * @param {Rule[]} rules
 */
function pipelineWith(outRoot, rules) {
  const config = new PluginConfig({
    name: "acme",
    version: "1.0.0",
    description: "Acme.",
    author: { name: "Acme" },
    mcp: { serverName: "acme", url: "https://mcp.example.com/mcp", tools: [] },
    interface: { displayName: "Acme" },
  });
  const writer = new PackageWriter({ outRoot, pluginName: "acme", protectedPaths: [] });
  const pipeline = new BuildPipeline({
    config,
    catalog: /** @type {any} */ (emptyCatalog),
    manifest: new ManifestBuilder(config),
    writer,
    validator: new Validator(rules),
    archiver: new Archiver(),
    assetsRoot: outRoot,
  });
  return { pipeline, zipPath: writer.artifactPath("acme-openai-1.0.0.zip") };
}

test("a failed build removes any archive left by an earlier successful build", async t => {
  const outRoot = await tempDir(t);
  const { pipeline, zipPath } = pipelineWith(outRoot, [new AlwaysFails()]);
  await writeFile(zipPath, "stale");
  assert.ok(existsSync(zipPath));

  const result = await pipeline.run();
  assert.equal(result.ok, false);
  assert.equal(result.archive, null);
  assert.equal(existsSync(zipPath), false, "the stale ZIP must not survive a failed build");
});

test("a passing build still produces the archive", async t => {
  const outRoot = await tempDir(t);
  const { pipeline, zipPath } = pipelineWith(outRoot, []);
  const result = await pipeline.run();
  assert.equal(result.ok, true);
  assert.equal(result.archive?.path, zipPath);
  assert.ok(existsSync(zipPath));
});
