import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createBuild } from "../../tools/openai-plugin/lib/createBuild.mjs";
import { hashTree } from "../../tools/openai-plugin/lib/util/fs.mjs";
import { REPO_ROOT, tempDir } from "./helpers.mjs";

/** Source trees the build must never modify. */
const PROTECTED = ["skills", "agents", "hooks", ".claude-plugin", "openai"];

async function snapshot() {
  return Object.fromEntries(
    await Promise.all(PROTECTED.map(async dir => [dir, await hashTree(path.join(REPO_ROOT, dir))])),
  );
}

test("builds a valid, reproducible package without touching the source tree", async t => {
  const before = await snapshot();

  const first = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t) })).pipeline.run();
  const second = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t) })).pipeline.run();

  assert.deepEqual(await snapshot(), before, "source trees are unchanged");

  assert.equal(first.ok, true, first.validation.errors.map(String).join("\n"));
  assert.ok(first.archive);
  assert.equal(first.archive.sha256, second.archive?.sha256, "builds are byte-for-byte reproducible");

  assert.equal(first.catalog.count, 69);
  assert.deepEqual(first.catalog.added, ["get-started", "octagon-research-router"]);
  assert.deepEqual(first.catalog.overridden, ["octagon-status"]);
  assert.deepEqual(first.catalog.excluded, ["octagon-api-smoke-test", "octagon-setup"]);

  const manifest = JSON.parse(await readFile(path.join(first.stagingDir, ".codex-plugin/plugin.json"), "utf8"));
  assert.equal(manifest.name, "octagon-ai");
  const mcp = JSON.parse(await readFile(path.join(first.stagingDir, ".mcp.json"), "utf8"));
  assert.deepEqual(mcp, { mcpServers: { octagon: { url: "https://mcp.octagonai.co/mcp" } } });

  assert.ok(first.archive.entries.includes(".codex-plugin/plugin.json"));
  assert.ok(!first.archive.entries.some(entry => /^(?:hooks|agents|\.claude-plugin)\//.test(entry)));
});
