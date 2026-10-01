import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { OutputError } from "../../tools/openai-plugin/lib/errors.mjs";
import { FIXED_MTIME, PackageWriter } from "../../tools/openai-plugin/lib/output/PackageWriter.mjs";
import { tempDir } from "./helpers.mjs";

test("refuses output roots that would contain protected paths", async t => {
  const root = await tempDir(t);
  const repo = path.join(root, "repo");
  for (const outRoot of [repo, root, path.parse(root).root]) {
    assert.throws(
      () => new PackageWriter({ outRoot, pluginName: "acme", protectedPaths: [repo] }),
      OutputError,
      outRoot,
    );
  }
  assert.doesNotThrow(() => new PackageWriter({ outRoot: path.join(repo, "out"), pluginName: "acme", protectedPaths: [repo, path.join(repo, "skills")] }));
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
