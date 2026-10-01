import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { REPO_ROOT } from "./helpers.mjs";

test("OpenAI packaging files never ship in the npm package", () => {
  const result = spawnSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);

  const [pack] = JSON.parse(result.stdout);
  const leaked = pack.files
    .map((/** @type {{ path: string }} */ file) => file.path)
    .filter((/** @type {string} */ file) => /^(?:openai|tools|out|tests)\//.test(file));
  assert.deepEqual(leaked, []);
});
