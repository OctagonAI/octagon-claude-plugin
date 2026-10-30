import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, symlink } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { OutputError } from "../../tools/openai-plugin/lib/errors.mjs";
import { RepoSync, SYNC_ROOT } from "../../tools/openai-plugin/lib/output/RepoSync.mjs";
import { canonicalize, listFiles } from "../../tools/openai-plugin/lib/util/fs.mjs";
import { tempDir, writeTree } from "./helpers.mjs";

/**
 * A fake repository with a staged build next to it.
 *
 * @param {import("node:test").TestContext} t
 */
async function fixture(t) {
  const root = await tempDir(t);
  const repo = path.join(root, "repo");
  const staging = path.join(root, "out", "grok", "acme");
  await mkdir(repo, { recursive: true });
  await writeTree(staging, {
    ".grok-plugin/plugin.json": '{"name":"acme"}',
    ".mcp.json": "{}",
    "skills/start/SKILL.md": "---\nname: start\ndescription: d\n---\nbody\n",
  });
  return { repo, staging, sync: new RepoSync({ repoRoot: repo, pluginName: "acme" }) };
}

test("sync copies the staged package under grok/plugins/<name>/ and removes stale files", async t => {
  const { repo, staging, sync } = await fixture(t);
  assert.equal(sync.targetDir, path.join(canonicalize(repo), SYNC_ROOT, "acme"));

  const target = sync.targetDir;
  await writeTree(target, { "skills/old/SKILL.md": "stale", "skills/old/references/notes.md": "stale" });

  const files = await sync.sync(staging, { ok: true });
  assert.deepEqual(files, [".grok-plugin/plugin.json", ".mcp.json", "skills/start/SKILL.md"]);
  assert.deepEqual(await listFiles(target), files);
  assert.equal(existsSync(path.join(target, "skills", "old")), false, "empty stale directories are pruned");
  assert.equal(await readFile(path.join(target, ".mcp.json"), "utf8"), "{}");
  assert.deepEqual(await sync.check(staging), []);
});

test("check reports added, changed, and removed files without writing", async t => {
  const { staging, sync } = await fixture(t);
  await sync.sync(staging, { ok: true });

  await writeTree(sync.targetDir, { ".mcp.json": "{ }", "extra.txt": "x" });
  await rm(path.join(sync.targetDir, "skills/start/SKILL.md"));
  const drift = await sync.check(staging);
  assert.deepEqual(
    drift.sort((a, b) => a.path.localeCompare(b.path)),
    [
      { path: ".mcp.json", kind: "changed" },
      { path: "extra.txt", kind: "removed" },
      { path: "skills/start/SKILL.md", kind: "added" },
    ],
  );
  assert.equal(await readFile(path.join(sync.targetDir, ".mcp.json"), "utf8"), "{ }", "check does not write");
});

test("refuses a failed build, unsafe names, overlapping paths, and symlinked targets", async t => {
  const { repo, staging, sync } = await fixture(t);
  await assert.rejects(sync.sync(staging, { ok: false }), OutputError);
  assert.throws(() => new RepoSync({ repoRoot: repo, pluginName: "../escape" }), OutputError);
  assert.throws(() => new RepoSync({ repoRoot: repo, pluginName: "Acme" }), OutputError);

  await assert.rejects(sync.sync(path.join(repo, "missing"), { ok: true }), OutputError);
  await assert.rejects(sync.sync(sync.targetDir, { ok: true }), OutputError, "staging inside the target");
  await assert.rejects(sync.sync(repo, { ok: true }), OutputError, "staging around the target");

  const elsewhere = path.join(repo, "elsewhere");
  await mkdir(elsewhere, { recursive: true });
  await mkdir(path.join(repo, SYNC_ROOT), { recursive: true });
  await symlink(elsewhere, sync.targetDir);
  await assert.rejects(sync.sync(staging, { ok: true }), OutputError);
  await assert.rejects(sync.check(staging), OutputError);
  assert.deepEqual(await listFiles(elsewhere), [], "nothing was written through the link");
});
