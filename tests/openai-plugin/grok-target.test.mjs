import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { PluginConfig } from "../../tools/openai-plugin/lib/config/PluginConfig.mjs";
import { createBuild } from "../../tools/openai-plugin/lib/createBuild.mjs";
import { ConfigError } from "../../tools/openai-plugin/lib/errors.mjs";
import { GROK_MANIFEST_PATH, GrokManifestBuilder } from "../../tools/openai-plugin/lib/manifest/GrokManifestBuilder.mjs";
import { GrokReadmeBuilder } from "../../tools/openai-plugin/lib/manifest/GrokReadmeBuilder.mjs";
import { SkillDocument } from "../../tools/openai-plugin/lib/skill/SkillDocument.mjs";
import { GrokTarget, OWNED_DOMAINS } from "../../tools/openai-plugin/lib/target/GrokTarget.mjs";
import { hashTree } from "../../tools/openai-plugin/lib/util/fs.mjs";
import { REPO_ROOT, skillText, tempDir } from "./helpers.mjs";

/** A config with everything the Grok target needs. */
function grokConfigData(overrides = {}) {
  return {
    name: "acme",
    version: "1.2.3",
    description: "Acme research.",
    author: { name: "Acme", email: "hi@acme.example", url: "https://acme.example/" },
    homepage: "https://acme.example/",
    repository: "https://github.com/acme/plugin",
    license: "MIT",
    keywords: ["finance", "research"],
    mcp: { serverName: "acme", url: "https://mcp.acme.example/mcp", tools: ["search"] },
    interface: {
      displayName: "Acme Research",
      supportURL: "https://acme.example/support",
      privacyPolicyURL: "https://acme.example/privacy",
      termsOfServiceURL: "https://acme.example/terms",
      composerIcon: "./assets/icon.png",
    },
    grok: {
      keywords: ["acme", "acme research"],
      domains: ["acme.example"],
      category: "finance",
      catalogDescription: "Acme research (MCP server + skills).",
      oauthUrl: "https://login.acme.example",
      readmeIntro: "Intro paragraph.",
      scopeNote: "Research only.",
      smokeTests: [{ prompt: "Find a thing", expect: "a thing with its source" }],
    },
    ...overrides,
  };
}

test("GrokManifestBuilder writes documented fields only, brand keywords, and an HTTP server", () => {
  const builder = new GrokManifestBuilder(new PluginConfig(grokConfigData()));
  const manifest = builder.manifest();
  assert.deepEqual(Object.keys(manifest), ["name", "version", "description", "author", "homepage", "repository", "license", "keywords", "skills", "mcpServers"]);
  assert.deepEqual(manifest.keywords, ["acme", "acme research"], "keywords come from the grok block, not the listing");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.mcpServers, "./.mcp.json");
  assert.ok(!("interface" in manifest) && !("extensions" in manifest));

  assert.deepEqual(builder.mcpConfig(), { mcpServers: { acme: { type: "http", url: "https://mcp.acme.example/mcp" } } });

  const entry = builder.catalogEntry({ repoUrl: "https://github.com/acme/plugin.git", sha: "a".repeat(40), path: "grok/plugins/acme" });
  assert.deepEqual(entry, {
    name: "acme",
    description: "Acme research (MCP server + skills).",
    category: "finance",
    source: { source: "url", url: "https://github.com/acme/plugin.git", sha: "a".repeat(40), path: "grok/plugins/acme" },
    homepage: "https://acme.example/",
    keywords: ["acme", "acme research"],
    domains: ["acme.example"],
  });
});

test("the grok block is optional for OpenAI builds and validated when present", () => {
  const { grok, ...withoutGrok } = grokConfigData();
  const config = new PluginConfig(withoutGrok);
  assert.throws(() => config.grok(), ConfigError);
  assert.doesNotThrow(() => PluginConfig.check(withoutGrok, "test"));

  for (const bad of [
    { ...grok, keywords: [] },
    { ...grok, domains: [] },
    { ...grok, oauthUrl: "http://insecure.example" },
    { ...grok, smokeTests: [] },
    { ...grok, smokeTests: [{ prompt: "p" }] },
    { ...grok, readmeIntro: "" },
  ]) {
    assert.throws(() => PluginConfig.check(grokConfigData({ grok: bad }), "test"), ConfigError);
  }
  // An empty keyword list is a config error too.
  assert.throws(() => PluginConfig.check(grokConfigData({ grok: { ...grok, keywords: "octagon" } }), "test"), ConfigError);
});

test("GrokReadmeBuilder declares endpoints, credentials, every skill, and the license", () => {
  const config = new PluginConfig(grokConfigData());
  const skills = [
    SkillDocument.fromText("zeta", skillText("zeta", "Zeta does | pipes.")),
    SkillDocument.fromText("alpha", skillText("alpha", "Alpha does things.")),
  ];
  const readme = new GrokReadmeBuilder(config).readme({ skills });
  assert.ok(readme.startsWith("# Acme Research for Grok Build\n"));
  for (const needle of [
    "https://mcp.acme.example/mcp",
    "`mcp.acme.example`",
    "`login.acme.example`",
    "## Network endpoints",
    "## Credentials",
    "OAuth",
    "## Components",
    "**2 skills**",
    "grok plugin install acme --trust",
    "grok --plugin-dir grok/plugins/acme",
    "- `Find a thing`",
    "Expected: a thing with its source",
    "| `alpha` | Alpha does things. |",
    "| `zeta` | Zeta does \\| pipes. |",
    "Research only.",
    "License: MIT",
    "https://acme.example/privacy",
  ]) {
    assert.ok(readme.includes(needle), `README should contain ${needle}`);
  }
  assert.ok(readme.indexOf("`alpha`") < readme.indexOf("`zeta`"), "skills are listed alphabetically");
  assert.ok(!/chatgpt|openai|claude|codex/i.test(readme), "README is platform-neutral");
});

test("the Grok build of both profiles is clean, reproducible, and leaves the source tree alone", async t => {
  const protectedDirs = ["skills", "agents", "hooks", ".claude-plugin", "openai", "grok"];
  const before = Object.fromEntries(await Promise.all(protectedDirs.map(async dir => [dir, await hashTree(path.join(REPO_ROOT, dir))])));

  for (const [profile, expected] of [
    [undefined, { name: "octagon-ai", count: 68, server: "octagon", url: "https://mcp.octagonai.co/mcp" }],
    ["prediction-markets", { name: "octagon-prediction-markets", count: 7, server: "octagon-predictions", url: "https://mcp.octagonai.co/prediction-markets/mcp" }],
  ]) {
    const first = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), target: "grok", profile })).pipeline.run();
    const second = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), target: "grok", profile })).pipeline.run();

    assert.equal(first.ok, true, first.validation.errors.map(String).join("\n"));
    assert.equal(first.target, "grok");
    assert.equal(first.archive, null, "a Grok build produces a directory, not a ZIP");
    assert.equal(first.catalog.count, expected.count);
    assert.equal(await hashTree(first.stagingDir), await hashTree(second.stagingDir), "builds are reproducible");
    assert.ok(first.stagingDir.endsWith(path.join("grok", expected.name)));

    const manifest = JSON.parse(await readFile(path.join(first.stagingDir, GROK_MANIFEST_PATH), "utf8"));
    assert.equal(manifest.name, expected.name);
    assert.ok(manifest.keywords.every(keyword => keyword.includes("octagon")));
    const mcp = JSON.parse(await readFile(path.join(first.stagingDir, ".mcp.json"), "utf8"));
    assert.deepEqual(mcp, { mcpServers: { [expected.server]: { type: "http", url: expected.url } } });
    for (const file of ["README.md", "LICENSE", "assets/icon.png"]) {
      await assert.doesNotReject(readFile(path.join(first.stagingDir, file)), `${file} is shipped`);
    }
  }

  const after = Object.fromEntries(await Promise.all(protectedDirs.map(async dir => [dir, await hashTree(path.join(REPO_ROOT, dir))])));
  assert.deepEqual(after, before, "source trees are unchanged");
});

test("the OpenAI build is unchanged by the target abstraction", async t => {
  const implicit = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t) })).pipeline.run();
  const explicit = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), target: "openai" })).pipeline.run();
  assert.equal(implicit.target, "openai");
  assert.ok(implicit.archive && explicit.archive);
  assert.equal(implicit.archive.sha256, explicit.archive.sha256);
  assert.ok(implicit.stagingDir.endsWith(path.join("openai", "octagon-ai")), "OpenAI staging stays under out/openai/");
});

test("createBuild rejects unknown targets", async t => {
  await assert.rejects(createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), target: /** @type {any} */ ("cursor") }), ConfigError);
});

test("GrokTarget.checkConfig requires the grok block, brand keywords, and owned domains", () => {
  const target = new GrokTarget({ licenseFile: path.join(REPO_ROOT, "LICENSE") });
  const base = grokConfigData();
  const octagon = { ...base.grok, keywords: ["octagon", "octagon research"], domains: ["octagonai.co", "docs.octagonagents.com"] };

  assert.doesNotThrow(() => target.checkConfig(new PluginConfig({ ...base, grok: octagon })));
  const { grok, ...withoutGrok } = base;
  assert.throws(() => target.checkConfig(new PluginConfig(withoutGrok)), ConfigError);
  assert.throws(() => target.checkConfig(new PluginConfig({ ...base, grok: { ...octagon, keywords: ["octagon", "finance"] } })), /must contain "octagon"/);
  assert.throws(() => target.checkConfig(new PluginConfig({ ...base, grok: { ...octagon, domains: ["octagonai.co", "kalshi.com"] } })), /not an Octagon-owned host/);
  assert.ok(OWNED_DOMAINS.includes("octagonai.co"));
});
