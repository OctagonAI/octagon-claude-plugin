import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createBuild } from "../../tools/openai-plugin/lib/createBuild.mjs";
import { OutputError } from "../../tools/openai-plugin/lib/errors.mjs";
import { FIXED_MTIME, PackageWriter } from "../../tools/openai-plugin/lib/output/PackageWriter.mjs";
import { REPO_ROOT, tempDir } from "./helpers.mjs";

test("refuses output roots that overlap protected paths or contain the repository", async t => {
  const root = await tempDir(t);
  const repo = path.join(root, "repo");
  const skills = path.join(repo, "skills");
  const options = { pluginName: "acme", protectedPaths: [skills], enclosingRoots: [repo] };

  for (const outRoot of [repo, root, skills, path.join(skills, "nested"), path.parse(root).root]) {
    assert.throws(() => new PackageWriter({ ...options, outRoot }), OutputError, outRoot);
  }
  for (const outRoot of [path.join(repo, "out"), path.join(root, "elsewhere")]) {
    assert.doesNotThrow(() => new PackageWriter({ ...options, outRoot }), outRoot);
  }
});

test("the real build only accepts output under out/ inside the repository", async () => {
  for (const dir of ["skills/demo", "openai", "tools/x", "."]) {
    await assert.rejects(createBuild({ repoRoot: REPO_ROOT, outRoot: path.join(REPO_ROOT, dir) }), OutputError, dir);
  }
  await assert.doesNotReject(createBuild({ repoRoot: REPO_ROOT, outRoot: path.join(REPO_ROOT, "out", "custom") }));
});

test("refuses unsafe plugin names and writes outside the staging directory", async t => {
  const outRoot = await tempDir(t);
  assert.throws(() => new PackageWriter({ outRoot, pluginName: "../acme", protectedPaths: [] }), OutputError);

  const writer = new PackageWriter({ outRoot, pluginName: "acme", protectedPaths: [] });
  await writer.reset();
  for (const relative of ["../escape.txt", "/etc/passwd", "a/../../escape.txt"]) {
    await assert.rejects(writer.writeFile(relative, "x"), OutputError, relative);
  }
  assert.throws(() => writer.artifactPath("../report.json"), OutputError);
});

test("seal() normalizes timestamps and permissions", async t => {
  const outRoot = await tempDir(t);
  const writer = new PackageWriter({ outRoot, pluginName: "acme", protectedPaths: [] });
  await writer.reset();
  await writer.writeFile("b/two.txt", "2");
  await writer.writeFile("a.txt", "1");

  assert.deepEqual(await writer.seal(), ["a.txt", "b/two.txt"]);
  const info = await stat(path.join(writer.stagingDir, "a.txt"));
  assert.equal(info.mtime.getTime(), FIXED_MTIME.getTime());
  assert.equal(info.mode & 0o777, 0o644);
});
