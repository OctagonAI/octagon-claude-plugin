import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { PluginConfig } from "../../tools/openai-plugin/lib/config/PluginConfig.mjs";
import { createBuild } from "../../tools/openai-plugin/lib/createBuild.mjs";
import { ConfigError } from "../../tools/openai-plugin/lib/errors.mjs";
import { GEMINI_CONTEXT_MAX_WORDS, GeminiContextBuilder, wordCount } from "../../tools/openai-plugin/lib/manifest/GeminiContextBuilder.mjs";
import { GEMINI_MANIFEST_PATH, GeminiManifestBuilder } from "../../tools/openai-plugin/lib/manifest/GeminiManifestBuilder.mjs";
import { GeminiReadmeBuilder } from "../../tools/openai-plugin/lib/manifest/GeminiReadmeBuilder.mjs";
import { SkillDocument } from "../../tools/openai-plugin/lib/skill/SkillDocument.mjs";
import { GeminiTarget } from "../../tools/openai-plugin/lib/target/GeminiTarget.mjs";
import { hashTree } from "../../tools/openai-plugin/lib/util/fs.mjs";
import { REPO_ROOT, skillText, tempDir } from "./helpers.mjs";

/** A config with everything the Gemini target needs; the grok block carries legacy listing fields. */
function configData(overrides = {}) {
  return {
    name: "acme",
    version: "1.2.3",
    description: "Acme research.",
    author: { name: "Acme", url: "https://acme.example/" },
    homepage: "https://acme.example/",
    license: "MIT",
    mcp: { serverName: "acme", url: "https://mcp.acme.example/mcp", tools: ["search", "report", "odds"] },
    interface: { displayName: "Acme Research", supportURL: "https://acme.example/support", privacyPolicyURL: "https://acme.example/privacy", termsOfServiceURL: "https://acme.example/terms" },
    listing: {
      oauthUrl: "https://login.acme.example",
      readmeIntro: "Intro paragraph.",
      scopeNote: "Research only.",
      smokeTests: [{ prompt: "Find a thing", expect: "a thing with its source" }],
    },
    gemini: {
      serverName: "acme-server",
      includeTools: ["search", "report"],
      repository: "https://github.com/OctagonAI/acme-gemini-extension",
      repoDescription: "Acme research for Gemini CLI.",
      contextNotes: ["For odds, suggest the `acme-odds` extension."],
    },
    ...overrides,
  };
}

test("GeminiManifestBuilder writes url + type http, OAuth, the allow-list, and documented fields only", () => {
  const builder = new GeminiManifestBuilder(new PluginConfig(configData()));
  const manifest = builder.manifest();
  assert.deepEqual(Object.keys(manifest), ["name", "version", "description", "contextFileName", "mcpServers"]);
  assert.equal(manifest.contextFileName, "GEMINI.md");
  assert.deepEqual(manifest.mcpServers, {
    "acme-server": { url: "https://mcp.acme.example/mcp", type: "http", oauth: { enabled: true }, includeTools: ["search", "report"], timeout: 600000 },
  });
  assert.ok(!JSON.stringify(manifest).includes("httpUrl"));
  assert.deepEqual(builder.exposedTools(), ["search", "report"]);
  assert.deepEqual(builder.aboutSettings(), {
    repository: "https://github.com/OctagonAI/acme-gemini-extension",
    description: "Acme research for Gemini CLI.",
    homepage: "https://acme.example/",
    topics: ["gemini-cli-extension"],
  });

  // Without an allow-list the server exposes everything and declares none.
  const { gemini } = configData();
  const { includeTools, ...rest } = gemini;
  const open = new GeminiManifestBuilder(new PluginConfig(configData({ gemini: rest })));
  assert.ok(!("includeTools" in open.manifest().mcpServers["acme-server"]));
  assert.deepEqual(open.exposedTools(), ["search", "report", "odds"]);
  assert.equal(new GeminiManifestBuilder(new PluginConfig(configData({ gemini: { ...rest, serverName: undefined } }))).serverName(), "acme");
});

test("the listing block is read from `listing`, or from legacy `grok` fields, and validated", () => {
  const data = configData();
  assert.deepEqual(new PluginConfig(data).listing(), data.listing);

  // Legacy: listing copy under grok only.
  const { listing, ...withoutListing } = data;
  const legacy = { ...withoutListing, grok: { keywords: ["acme"], domains: ["acme.example"], ...listing } };
  assert.doesNotThrow(() => PluginConfig.check(legacy, "test"));
  assert.deepEqual(new PluginConfig(legacy).listing(), listing);
  assert.equal(new PluginConfig(legacy).grok().scopeNote, "Research only.");

  // Neither: the accessor explains what is missing.
  assert.throws(() => new PluginConfig(withoutListing).listing(), /listing/);
  // A grok block beside a listing block needs no listing fields of its own.
  assert.doesNotThrow(() => PluginConfig.check({ ...data, grok: { keywords: ["acme"], domains: ["acme.example"] } }, "test"));
  // A grok block alone must carry them.
  assert.throws(() => PluginConfig.check({ ...withoutListing, grok: { keywords: ["acme"], domains: ["acme.example"] } }, "test"), ConfigError);

  assert.throws(() => PluginConfig.check(configData({ mcp: { serverName: "acme", url: "https://bad url", tools: ["search"] } }), "test"), /mcp\.url must be a valid URL/);
  for (const bad of [
    { ...listing, oauthUrl: "http://insecure" },
    { ...listing, oauthUrl: "https://bad host name" },
    { ...listing, smokeTests: [] },
    { ...listing, readmeIntro: "" },
  ]) {
    assert.throws(() => PluginConfig.check(configData({ listing: bad }), "test"), ConfigError);
  }
});

test("the gemini block is validated at load", () => {
  const { gemini } = configData();
  for (const bad of [
    { ...gemini, repository: "https://gitlab.com/x/y" },
    { ...gemini, repository: "not a url" },
    { ...gemini, repoDescription: "x".repeat(351) },
    { ...gemini, includeTools: [] },
    { ...gemini, includeTools: ["search", "missing"] },
    { ...gemini, contextNotes: "one" },
  ]) {
    assert.throws(() => PluginConfig.check(configData({ gemini: bad }), "test"), ConfigError, JSON.stringify(bad));
  }
  const { gemini: _drop, ...withoutGemini } = configData();
  assert.doesNotThrow(() => PluginConfig.check(withoutGemini, "test"), "OpenAI builds need no gemini block");
  assert.throws(() => new PluginConfig(withoutGemini).gemini(), ConfigError);
});

test("GeminiTarget.checkConfig requires the mirror to live under the Octagon organization", () => {
  const target = new GeminiTarget({ licenseFile: path.join(REPO_ROOT, "LICENSE") });
  assert.doesNotThrow(() => target.checkConfig(new PluginConfig(configData())));
  const { gemini } = configData();
  assert.throws(() => target.checkConfig(new PluginConfig(configData({ gemini: { ...gemini, repository: "https://github.com/someone/acme" } }))), /OctagonAI/);
  assert.equal(target.repoDir, "gemini/extensions");
  assert.equal(target.manifestPath, GEMINI_MANIFEST_PATH);
});

test("GeminiContextBuilder stays short and carries the tools and standing rules", () => {
  const context = new GeminiContextBuilder(new PluginConfig(configData())).context();
  assert.ok(wordCount(context) <= GEMINI_CONTEXT_MAX_WORDS);
  for (const needle of ["# Acme Research", "`acme-server`", "`search`", "`report`", "cites the sources", "/mcp auth acme-server", "read-only", "Research only.", "`acme-odds`"]) {
    assert.ok(context.includes(needle), `context should contain ${needle}`);
  }
  assert.ok(!context.includes("`odds`"), "tools outside the allow-list are not advertised");
});

test("GeminiReadmeBuilder declares install commands, endpoints, credentials, every skill, and the license", () => {
  const skills = [SkillDocument.fromText("zeta", skillText("zeta", "Zeta.")), SkillDocument.fromText("alpha", skillText("alpha", "Alpha."))];
  const readme = new GeminiReadmeBuilder(new PluginConfig(configData())).readme({ skills });
  for (const needle of [
    "# Acme Research for Gemini CLI",
    "gemini extensions install https://github.com/OctagonAI/acme-gemini-extension",
    "agy plugin install https://github.com/OctagonAI/acme-gemini-extension",
    "/mcp auth acme-server",
    "https://mcp.acme.example/mcp",
    "`login.acme.example`",
    "## Network endpoints",
    "## Credentials",
    "## Components",
    "`search`, `report`",
    "| `alpha` | Alpha. |",
    "| `zeta` | Zeta. |",
    "License: MIT",
    "gemini/extensions/acme/",
  ]) {
    assert.ok(readme.includes(needle), `README should contain ${needle}`);
  }
  assert.ok(!/chatgpt|openai|claude|codex|grok/i.test(readme), "README is platform-neutral");
});

test("the Gemini build of both profiles is clean, reproducible, scoped, and leaves the source tree alone", async t => {
  const protectedDirs = ["skills", "agents", "hooks", ".claude-plugin", "openai", "grok", "gemini"];
  const before = Object.fromEntries(await Promise.all(protectedDirs.map(async dir => [dir, await hashTree(path.join(REPO_ROOT, dir))])));

  for (const [profile, expected] of [
    [undefined, { name: "octagon-ai", count: 68, server: "octagon", url: "https://mcp.octagonai.co/mcp", includeTools: ["octagon-agent", "octagon-deep-research-agent"] }],
    ["prediction-markets", { name: "octagon-prediction-markets", count: 7, server: "octagon-predictions", url: "https://mcp.octagonai.co/prediction-markets/mcp", includeTools: undefined }],
  ]) {
    const first = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), target: "gemini", profile })).pipeline.run();
    const second = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), target: "gemini", profile })).pipeline.run();

    assert.equal(first.ok, true, first.validation.errors.map(String).join("\n"));
    assert.equal(first.target, "gemini");
    assert.equal(first.archive, null);
    assert.equal(first.catalog.count, expected.count);
    assert.equal(await hashTree(first.stagingDir), await hashTree(second.stagingDir), "builds are reproducible");
    assert.ok(first.stagingDir.endsWith(path.join("gemini", expected.name)));

    const manifest = JSON.parse(await readFile(path.join(first.stagingDir, GEMINI_MANIFEST_PATH), "utf8"));
    assert.equal(manifest.name, expected.name);
    const server = manifest.mcpServers[expected.server];
    assert.equal(server.url, expected.url);
    assert.equal(server.type, "http");
    assert.deepEqual(server.oauth, { enabled: true });
    assert.deepEqual(server.includeTools, expected.includeTools);
    for (const file of ["GEMINI.md", "README.md", "LICENSE"]) {
      await assert.doesNotReject(readFile(path.join(first.stagingDir, file)), `${file} is shipped`);
    }
  }

  const after = Object.fromEntries(await Promise.all(protectedDirs.map(async dir => [dir, await hashTree(path.join(REPO_ROOT, dir))])));
  assert.deepEqual(after, before, "source trees are unchanged");
});

test("the OpenAI and Grok builds are unchanged by the Gemini target", async t => {
  const openai = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t) })).pipeline.run();
  const explicit = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), target: "openai" })).pipeline.run();
  assert.equal(openai.archive?.sha256, explicit.archive?.sha256);

  // The committed Grok directories are the pre-refactor output; the build must still match them.
  for (const profile of [undefined, "prediction-markets"]) {
    const build = await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), target: "grok", profile });
    const result = await build.pipeline.run();
    assert.equal(result.ok, true);
    assert.deepEqual(await build.sync?.check(result.stagingDir), [], `grok/plugins/${result.plugin.name} is unchanged`);
  }
});
