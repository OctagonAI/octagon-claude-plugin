import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { SkillCatalog } from "../../tools/openai-plugin/lib/catalog/SkillCatalog.mjs";
import { Profile } from "../../tools/openai-plugin/lib/config/Profile.mjs";
import { TransformConfig } from "../../tools/openai-plugin/lib/config/TransformConfig.mjs";
import { createBuild } from "../../tools/openai-plugin/lib/createBuild.mjs";
import { ConfigError } from "../../tools/openai-plugin/lib/errors.mjs";
import { SkillRepository } from "../../tools/openai-plugin/lib/source/SkillRepository.mjs";
import { TransformPipeline } from "../../tools/openai-plugin/lib/transform/TransformPipeline.mjs";
import { PackageView } from "../../tools/openai-plugin/lib/validation/PackageView.mjs";
import { ForbiddenTextRule } from "../../tools/openai-plugin/lib/validation/rules/ForbiddenTextRule.mjs";
import { REPO_ROOT, skillText, tempDir, writeTree } from "./helpers.mjs";

/** A complete root config with one strict edit per skill, for extends tests. */
const BASE = {
  excludeSkills: ["dropped"],
  removeFiles: ["README.md"],
  sections: [{ heading: "## Prerequisites", body: "Base." }],
  substitutions: [{ find: "Claude", replace: "the model" }],
  skillEdits: {
    alpha: { substitutions: [{ find: "a", replace: "A" }] },
    beta: { substitutions: [{ find: "b", replace: "B" }] },
  },
  forbiddenPatterns: [
    { pattern: "shared", reason: "shared guard" },
    { pattern: "private", reason: "root-only guard", inherit: false },
  ],
};

test("Profile resolves the default and named layouts", async t => {
  const root = await tempDir(t);
  await writeTree(root, { "profiles/second/plugin.config.json": "{}" });

  const fallback = Profile.resolve(root, undefined);
  assert.equal(fallback.name, "default");
  assert.equal(fallback.root, root);
  assert.equal(fallback.skills, path.join(root, "skills"));

  const named = Profile.resolve(root, "second");
  assert.equal(named.root, path.join(root, "profiles", "second"));
  assert.equal(named.transformConfig, path.join(root, "profiles", "second", "transform.config.json"));
  assert.equal(named.assets, named.root);

  assert.throws(() => Profile.named(root, "missing"), ConfigError);
  assert.throws(() => Profile.named(root, "../escape"), ConfigError);
  assert.throws(() => Profile.named(root, "Bad Name"), ConfigError);
});

test("extends merges lists, overrides, inherited edits, and root-only guards", async t => {
  const root = await tempDir(t);
  await writeTree(root, {
    "base.json": JSON.stringify(BASE),
    "child.json": JSON.stringify({
      extends: "./base.json",
      includeSkills: ["alpha", "gamma"],
      excludeSkills: [],
      substitutions: [{ find: "x", replace: "y" }],
      skillEdits: { gamma: { substitutions: [{ find: "g", replace: "G" }] } },
      forbiddenPatterns: [{ pattern: "child", reason: "child guard" }],
    }),
  });

  const { data } = await TransformConfig.load(path.join(root, "child.json"));
  assert.deepEqual(data.excludeSkills, [], "child excludeSkills replaces the parent's");
  assert.deepEqual(data.includeSkills, ["alpha", "gamma"]);
  assert.deepEqual(data.removeFiles, ["README.md"], "omitted lists are inherited");
  assert.deepEqual(data.substitutions.map(s => s.find), ["Claude", "x"], "parent first, then child");
  assert.deepEqual(Object.keys(data.skillEdits).sort(), ["alpha", "gamma"], "inherited edit for non-included beta is dropped");
  assert.deepEqual(data.forbiddenPatterns.map(p => p.reason), ["shared guard", "child guard"], "inherit:false stays with the root");
});

test("extends without an includeSkills keeps inherited edits unless excluded", async t => {
  const root = await tempDir(t);
  await writeTree(root, {
    "base.json": JSON.stringify(BASE),
    "child.json": JSON.stringify({ extends: "./base.json", excludeSkills: ["beta"] }),
  });
  const { data } = await TransformConfig.load(path.join(root, "child.json"));
  assert.deepEqual(Object.keys(data.skillEdits), ["alpha"]);
});

test("extends rejects cycles and missing parents", async t => {
  const root = await tempDir(t);
  await writeTree(root, {
    "a.json": JSON.stringify({ extends: "./b.json" }),
    "b.json": JSON.stringify({ extends: "./a.json" }),
    "orphan.json": JSON.stringify({ extends: "./nowhere.json" }),
  });
  await assert.rejects(TransformConfig.load(path.join(root, "a.json")), /cycle/);
  await assert.rejects(TransformConfig.load(path.join(root, "orphan.json")));
});

test("a root config still has to declare every list", () => {
  assert.throws(() => TransformConfig.check({ excludeSkills: [] }, "root"), ConfigError);
  assert.doesNotThrow(() => TransformConfig.check({ extends: "./base.json" }, "child"));
  assert.throws(() => TransformConfig.check({ extends: "./base.json", forbiddenPatterns: [{ pattern: "x", reason: "r", inherit: "no" }] }, "child"), ConfigError);
});

test("SkillCatalog include is an allowlist that exclude still narrows", async t => {
  const root = await tempDir(t);
  await writeTree(root, {
    "source/alpha/SKILL.md": skillText("alpha", "Alpha."),
    "source/beta/SKILL.md": skillText("beta", "Beta."),
    "source/gamma/SKILL.md": skillText("gamma", "Gamma."),
  });
  const deps = {
    source: new SkillRepository(path.join(root, "source")),
    overlay: new SkillRepository(path.join(root, "overlay")),
    transform: new TransformPipeline([]),
  };

  const result = await new SkillCatalog({ ...deps, include: ["alpha", "beta"], exclude: ["beta"] }).build();
  assert.deepEqual(result.skills.map(skill => skill.name), ["alpha"]);

  await assert.rejects(new SkillCatalog({ ...deps, include: ["missing"], exclude: [] }).build(), ConfigError);
  await assert.rejects(
    new SkillCatalog({ ...deps, include: ["alpha"], exclude: [], requiredSources: ["gamma"] }).build(),
    /not shipped/,
  );
});

test("ForbiddenTextRule honours path prefixes", async t => {
  const root = await tempDir(t);
  await writeTree(root, {
    "skills/a/SKILL.md": skillText("a", "x", "\nforbidden here\n"),
    "skills/b/SKILL.md": skillText("b", "x", "\nforbidden there\n"),
  });
  const pkg = await PackageView.load(root);
  const scoped = new ForbiddenTextRule([{ regex: /forbidden/, reason: "r", paths: ["skills/a/"] }]);
  // Line 6: four front-matter lines, a blank line, then the body line.
  assert.deepEqual((await scoped.check({ pkg })).map(f => f.path), ["skills/a/SKILL.md:6"]);
  const global = new ForbiddenTextRule([{ regex: /forbidden/, reason: "r" }]);
  assert.equal((await global.check({ pkg })).length, 2);
});

test("the prediction-markets profile builds a valid, reproducible, prediction-only package", async t => {
  const first = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), profile: "prediction-markets" })).pipeline.run();
  const second = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), profile: "prediction-markets" })).pipeline.run();

  assert.equal(first.ok, true, first.validation.errors.map(String).join("\n"));
  assert.equal(first.archive?.sha256, second.archive?.sha256);
  assert.equal(first.plugin.name, "octagon-prediction-markets");
  assert.equal(first.catalog.count, 6);
  assert.deepEqual(first.catalog.transformed, ["prediction-markets-analysis"]);
  assert.deepEqual(first.catalog.added, ["event-brief", "get-started", "mispricing-analysis", "probability-history"]);
  assert.deepEqual(first.catalog.overridden, ["octagon-status"]);

  const manifest = JSON.parse(await readFile(path.join(first.stagingDir, ".codex-plugin/plugin.json"), "utf8"));
  assert.equal(manifest.interface.displayName, "Octagon Prediction Markets");
  const mcp = JSON.parse(await readFile(path.join(first.stagingDir, ".mcp.json"), "utf8"));
  assert.deepEqual(Object.keys(mcp.mcpServers), ["octagon-predictions"]);
  assert.match(mcp.mcpServers["octagon-predictions"].url, /\/prediction-markets\/mcp$/);

  // The compliance edits moved out of the base config must still apply here.
  const skill = await readFile(path.join(first.stagingDir, "skills/prediction-markets-analysis/SKILL.md"), "utf8");
  assert.doesNotMatch(skill, /Pre-Trade|placing a trade/);
  assert.match(skill, /### Driver Research/);
});

test("the public-markets package carries no prediction-market content in its own skills", async t => {
  const result = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t) })).pipeline.run();
  assert.equal(result.ok, true, result.validation.errors.map(String).join("\n"));
  assert.ok(result.catalog.excluded.includes("prediction-markets-analysis"));

  const manifest = JSON.parse(await readFile(path.join(result.stagingDir, ".codex-plugin/plugin.json"), "utf8"));
  const listing = JSON.stringify([manifest.description, manifest.interface, manifest.extensions["com.openai"].review]);
  assert.doesNotMatch(listing, /prediction|kalshi|odds|\bbets?\b/i);

  for (const name of ["get-started", "octagon-status"]) {
    const text = await readFile(path.join(result.stagingDir, "skills", name, "SKILL.md"), "utf8");
    assert.doesNotMatch(text, /prediction|kalshi/i, name);
  }
});
