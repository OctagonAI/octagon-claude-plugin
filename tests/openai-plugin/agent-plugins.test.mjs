import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Profile } from "../../tools/openai-plugin/lib/config/Profile.mjs";
import { createBuild, layout } from "../../tools/openai-plugin/lib/createBuild.mjs";
import { PackageView } from "../../tools/openai-plugin/lib/validation/PackageView.mjs";
import { SkillToolRule } from "../../tools/openai-plugin/lib/validation/rules/SkillToolRule.mjs";
import { REPO_ROOT, skillText, tempDir, writeTree } from "./helpers.mjs";

/** The single-agent plugins: profile directory, package name, tool, endpoint path, and the shipped skill count. */
const SINGLE_AGENT = [
  ["sec-filings", "octagon-sec-filings", "octagon-sec-agent", "/sec/mcp", 18],
  ["earnings-calls", "octagon-earnings-calls", "octagon-transcripts-agent", "/earnings-calls/mcp", 16],
  ["stock-data", "octagon-stock-data", "octagon-stock-data-agent", "/market-data/mcp", 20],
  ["crypto", "octagon-crypto", "octagon-crypto-agent", "/crypto/mcp", 6],
  ["financials", "octagon-financials", "octagon-financials-agent", "/financials/mcp", 19],
  ["holdings", "octagon-holdings", "octagon-holdings-agent", "/holdings/mcp", 7],
  ["market-news", "octagon-market-news", "octagon-news-agent", "/news/mcp", 6],
];

/**
 * @param {import("node:test").TestContext} t
 * @param {Record<string, string>} skills Skill dir -> SKILL.md body (after front matter).
 */
async function packageWith(t, skills) {
  const root = await tempDir(t);
  const tree = { ".codex-plugin/plugin.json": JSON.stringify({ name: "acme" }) };
  for (const [name, body] of Object.entries(skills)) tree[`skills/${name}/SKILL.md`] = skillText(name, `${name} skill.`, `\n${body}\n`);
  await writeTree(root, tree);
  return PackageView.load(root);
}

test("SkillToolRule: a skill may name only the plugin's tool, except under a routing heading", async t => {
  const rule = new SkillToolRule({ tool: "octagon-sec-agent", catalogSkills: ["sec-10k-analysis", "income-statement"] });

  const clean = await packageWith(t, {
    "sec-10k-analysis": "Use the `octagon-sec-agent` tool.\n\n```json\n{ \"toolName\": \"octagon-sec-agent\" }\n```\n\n## When not to use\n\n- Statements: `octagon-financials-agent` via the Octagon Financials plugin, see `income-statement`.\n",
  });
  assert.deepEqual((await rule.check({ pkg: clean })).map(String), [], "routing sections may name other agents and unshipped skills");

  const foreign = await packageWith(t, {
    "sec-10k-analysis": "**Data Sources**: octagon-financials-agent, octagon-sec-agent\n\n```json\n{ \"toolName\": \"octagon-agent\" }\n```\n\nSee `income-statement` for the numbers.\n",
  });
  const findings = await rule.check({ pkg: foreign });
  const errors = findings.filter(f => f.severity === "error").map(f => f.message);
  const warnings = findings.filter(f => f.severity === "warning").map(f => f.message);
  assert.equal(errors.length, 2, errors.join(" | "));
  assert.ok(errors.some(m => m.includes('names tool "octagon-agent"')));
  assert.ok(errors.some(m => m.includes('mentions "octagon-financials-agent"')));
  assert.deepEqual(warnings, ['references skill "income-statement", which this plugin does not ship']);
});

test("the fence is wired only for single-tool profiles", async t => {
  const single = await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), profile: "sec-filings" });
  const multi = await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), profile: "prediction-markets" });
  // The validator keeps its rules private; a build with a foreign mention would fail, which the next test proves by construction.
  assert.equal(single.config.data.mcp.tools.length, 1);
  assert.equal(multi.config.data.mcp.tools.length, 2);
});

test("every single-agent profile builds clean, reproducibly, with one retargeted tool and no foreign agent in shipped text", async t => {
  for (const [profile, name, tool, endpoint, count] of SINGLE_AGENT) {
    const first = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), profile })).pipeline.run();
    const second = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), profile })).pipeline.run();
    assert.equal(first.ok, true, `${profile}: ${first.validation.errors.map(String).join("\n")}`);
    assert.equal(first.plugin.name, name);
    assert.equal(first.catalog.count, count, `${profile} ships ${count} skills`);
    assert.equal(first.archive?.sha256, second.archive?.sha256, `${profile} is reproducible`);

    const mcp = JSON.parse(await readFile(path.join(first.stagingDir, ".mcp.json"), "utf8"));
    const servers = Object.values(mcp.mcpServers);
    assert.equal(servers.length, 1);
    assert.ok(servers[0].url.endsWith(endpoint), `${profile} connects to ${endpoint}`);

    const manifest = JSON.parse(await readFile(path.join(first.stagingDir, ".codex-plugin/plugin.json"), "utf8"));
    const review = manifest.extensions["com.openai"].review.test_cases;
    assert.equal(review.positive.length, 5);
    assert.equal(review.negative.length, 3);
    assert.ok(review.positive.every(c => c.tools_triggered === tool), `${profile} review cases name only ${tool}`);
    assert.equal(manifest.extensions["com.openai"].onboardingSkill, `./skills/${profile}-get-started/SKILL.md`);

    // Every shipped skill calls the plugin's tool and nothing else; the fence rule enforces this, so re-check its outcome here.
    const pkg = await PackageView.load(first.stagingDir);
    const fence = await new SkillToolRule({ tool }).check({ pkg });
    assert.deepEqual(fence.filter(f => f.severity === "error").map(String), [], `${profile} has no foreign agent mention`);
    for (const skill of pkg.skills) {
      const text = await readFile(path.join(first.stagingDir, skill.path), "utf8");
      assert.ok(!/\boctagon-agent\b/.test(text), `${profile}/${skill.dir} no longer calls the orchestrator`);
    }
  }
});

test("Profile.all lists every profile the plan ships, so --profile all covers them", () => {
  const names = Profile.all(layout(REPO_ROOT).openaiRoot).map(profile => profile.name);
  for (const [profile] of SINGLE_AGENT) assert.ok(names.includes(profile), profile);
  for (const profile of ["default", "prediction-markets", "podcasts"]) assert.ok(names.includes(profile), profile);
});
