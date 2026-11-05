import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { PluginConfig } from "../../tools/openai-plugin/lib/config/PluginConfig.mjs";
import { Profile } from "../../tools/openai-plugin/lib/config/Profile.mjs";
import { createBuild } from "../../tools/openai-plugin/lib/createBuild.mjs";
import { ConfigError } from "../../tools/openai-plugin/lib/errors.mjs";
import {
  KIMI_CATALOG_VERSION,
  KIMI_MANIFEST_FIELDS,
  KIMI_MANIFEST_PATH,
  KimiManifestBuilder,
} from "../../tools/openai-plugin/lib/manifest/KimiManifestBuilder.mjs";
import { KimiReadmeBuilder } from "../../tools/openai-plugin/lib/manifest/KimiReadmeBuilder.mjs";
import { KIMI_SYSTEM_PROMPT_MAX_BYTES } from "../../tools/openai-plugin/lib/manifest/KimiManifestBuilder.mjs";
import { KimiSystemPromptBuilder, utf8Bytes } from "../../tools/openai-plugin/lib/manifest/KimiSystemPromptBuilder.mjs";
import { KimiTranslations } from "../../tools/openai-plugin/lib/manifest/KimiTranslations.mjs";
import { CatalogSync } from "../../tools/openai-plugin/lib/output/CatalogSync.mjs";
import { SkillDocument } from "../../tools/openai-plugin/lib/skill/SkillDocument.mjs";
import { KimiTarget } from "../../tools/openai-plugin/lib/target/KimiTarget.mjs";
import { hashTree } from "../../tools/openai-plugin/lib/util/fs.mjs";
import { REPO_ROOT, skillText, tempDir, writeTree } from "./helpers.mjs";

/** A config with everything the Kimi target needs. */
function configData(overrides = {}) {
  return {
    name: "acme",
    version: "1.2.3",
    description: "Acme research.",
    author: { name: "Acme", email: "hi@acme.example", url: "https://acme.example/" },
    homepage: "https://www.octagonai.co/",
    license: "MIT",
    keywords: ["finance"],
    mcp: { serverName: "acme", url: "https://mcp.octagonai.co/mcp", tools: ["search", "report", "odds"] },
    interface: {
      displayName: "Acme Research",
      longDescription: "Long text.",
      developerName: "Acme Inc",
      composerIcon: "./assets/icon.png",
      supportURL: "https://acme.example/support",
      privacyPolicyURL: "https://acme.example/privacy",
      termsOfServiceURL: "https://acme.example/terms",
    },
    onboardingSkill: "start",
    listing: {
      oauthUrl: "https://login.acme.example",
      readmeIntro: "Intro paragraph.",
      scopeNote: "Research only.",
      smokeTests: [
        { prompt: "Find a thing", expect: "a thing with its source" },
        { prompt: "Find two", expect: "two" },
        { prompt: "Find three", expect: "three" },
        { prompt: "Find four", expect: "four" },
      ],
    },
    kimi: {
      serverName: "acme-server",
      mcpUrl: "https://mcp.octagonai.co/public-markets/mcp",
      enabledTools: ["search", "report"],
      shortDescription: "Cited research",
      cliDescription: "Terse text for the TUI.",
      repository: "https://github.com/OctagonAI/acme-kimi-plugin",
      repoDescription: "Acme research for Kimi.",
      iconUrl: "https://www.octagonai.co/plugins/acme/icon.png",
      translations: { "en-US": "./kimi/en-US.json", "zh-CN": "./kimi/zh-CN.json" },
      systemPromptNotes: ["For odds, suggest the `acme-odds` plugin."],
    },
    ...overrides,
  };
}

function defaultTranslations() {
  return new KimiTranslations({ locale: "en-US", isDefault: true, data: { skills: { start: { displayName: "Start" }, zeta: { displayName: "Zeta skill" } } } });
}

function chineseTranslations() {
  return new KimiTranslations({
    locale: "zh-CN",
    isDefault: false,
    data: {
      interface: { displayName: "Acme 研究", shortDescription: "有据可查的研究", longDescription: "长文本。", developerName: "Acme 公司", tryPrompts: ["一", "二", "三"] },
      mcpServers: { "acme-server": { displayName: "Acme 服务", description: "描述。" } },
      skills: { start: { displayName: "开始", description: "开始描述。" }, zeta: { displayName: "Zeta", description: "Zeta 描述。" } },
    },
  });
}

const SKILLS = [SkillDocument.fromText("zeta", skillText("zeta", "Zeta.")), SkillDocument.fromText("start", skillText("start", "Start here."))];

test("KimiManifestBuilder writes documented fields only, one OAuth server, and a complete interface", () => {
  const builder = new KimiManifestBuilder(new PluginConfig(configData()));
  const manifest = builder.manifest({ skills: SKILLS, translations: defaultTranslations() });

  for (const key of Object.keys(manifest)) assert.ok(KIMI_MANIFEST_FIELDS.includes(key), `${key} is documented`);
  assert.deepEqual(manifest.skills, ["./skills/"]);
  assert.deepEqual(manifest.sessionStart, { skill: "start" });
  assert.equal(manifest.systemPromptPath, "./SYSTEM.md");
  assert.deepEqual(manifest.mcpServers, {
    "acme-server": { url: "https://mcp.octagonai.co/public-markets/mcp", auth: "oauth", enabledTools: ["search", "report"], toolTimeoutMs: 600000 },
  });
  const ui = manifest.interface;
  assert.equal(ui.displayName, "Acme Research");
  assert.equal(ui.shortDescription, "Cited research");
  assert.equal(ui.longDescription, "Long text.");
  assert.equal(ui.developerName, "Acme Inc");
  assert.deepEqual(ui.tryPrompts, ["Find a thing", "Find two", "Find three"], "at most three prompts");
  assert.equal(ui.defaultLocale, "en-US");
  assert.equal(ui.locales, "./locales/");
  assert.deepEqual(Object.keys(ui.mcpOverrides), ["acme-server"]);
  assert.equal(ui.mcpOverrides["acme-server"].iconUrl, "https://www.octagonai.co/plugins/acme/icon.png");
  assert.deepEqual(Object.keys(ui.skillOverrides), ["start", "zeta"], "sorted by name");
  assert.deepEqual(ui.skillOverrides.zeta, { displayName: "Zeta skill", description: "Zeta." }, "description falls back to SKILL.md");
  assert.deepEqual(builder.exposedTools(), ["search", "report"]);
  assert.equal(builder.archiveName(), "acme-kimi-1.2.3.zip");
  assert.equal(builder.releaseAssetUrl(), "https://github.com/OctagonAI/acme-kimi-plugin/releases/download/v1.2.3/acme-kimi-1.2.3.zip");

  // Without an allow-list and a narrowed URL the server is the profile's.
  const { kimi } = configData();
  const { enabledTools, mcpUrl, serverName, ...rest } = kimi;
  const open = new KimiManifestBuilder(new PluginConfig(configData({ kimi: rest })));
  const server = open.manifest({ skills: SKILLS, translations: defaultTranslations() }).mcpServers.acme;
  assert.equal(server.url, "https://mcp.octagonai.co/mcp");
  assert.ok(!("enabledTools" in server));
  assert.deepEqual(open.exposedTools(), ["search", "report", "odds"]);
});

test("KimiManifestBuilder writes a complete locale file, the catalog entry, and the mirror About settings", () => {
  const builder = new KimiManifestBuilder(new PluginConfig(configData()));
  const locale = builder.localeText({ skills: SKILLS, translations: chineseTranslations() });
  assert.deepEqual(Object.keys(locale), ["displayName", "shortDescription", "longDescription", "developerName", "tryPrompts", "mcpOverrides", "skillOverrides"]);
  assert.equal(locale.shortDescription, "有据可查的研究");
  assert.deepEqual(locale.mcpOverrides, { "acme-server": { displayName: "Acme 服务", description: "描述。" } });
  assert.deepEqual(Object.keys(locale.skillOverrides), ["start", "zeta"]);
  assert.deepEqual(builder.translatedLocales(), ["zh-CN"]);

  assert.deepEqual(builder.catalogEntry(), {
    id: "acme",
    displayName: "Acme Research",
    version: "1.2.3",
    shortDescription: "Cited research",
    description: "Acme research.",
    cliDescription: "Terse text for the TUI.",
    homepage: "https://www.octagonai.co/",
    keywords: ["finance"],
    iconUrl: "https://www.octagonai.co/plugins/acme/icon.png",
    source: "https://github.com/OctagonAI/acme-kimi-plugin/releases/download/v1.2.3/acme-kimi-1.2.3.zip",
    clients: ["desktop", "cli"],
    platforms: ["macos", "windows", "linux"],
  });
  assert.deepEqual(builder.aboutSettings(), {
    repository: "https://github.com/OctagonAI/acme-kimi-plugin",
    description: "Acme research for Kimi.",
    homepage: "https://www.octagonai.co/",
    topics: ["kimi-plugin", "kimi-code", "mcp"],
  });
});

test("the kimi block is validated at load and optional for other targets", () => {
  const { kimi } = configData();
  for (const bad of [
    { ...kimi, repository: "https://gitlab.com/x/y" },
    { ...kimi, repoDescription: "x".repeat(351) },
    { ...kimi, iconUrl: "http://insecure.example/icon.png" },
    { ...kimi, mcpUrl: "not a url" },
    { ...kimi, enabledTools: [] },
    { ...kimi, enabledTools: ["search", "missing"] },
    { ...kimi, translations: {} },
    { ...kimi, translations: { "en-US": "kimi/en-US.json" } },
    { ...kimi, translations: { english: "./kimi/en.json" } },
    { ...kimi, systemPromptNotes: "one" },
    { ...kimi, shortDescription: "" },
  ]) {
    assert.throws(() => PluginConfig.check(configData({ kimi: bad }), "test"), ConfigError, JSON.stringify(bad));
  }
  const { kimi: _drop, ...withoutKimi } = configData();
  assert.doesNotThrow(() => PluginConfig.check(withoutKimi, "test"), "OpenAI builds need no kimi block");
  assert.throws(() => new PluginConfig(withoutKimi).kimi(), ConfigError);
});

test("KimiTarget.checkConfig enforces the short-description limit, owned hosts, the mirror owner, and the locales", () => {
  const target = new KimiTarget({ licenseFile: path.join(REPO_ROOT, "LICENSE") });
  assert.doesNotThrow(() => target.checkConfig(new PluginConfig(configData())));
  assert.equal(target.repoDir, "kimi/plugins");
  assert.equal(target.manifestPath, KIMI_MANIFEST_PATH);
  assert.equal(target.archiveName(new PluginConfig(configData())), "acme-kimi-1.2.3.zip");
  assert.deepEqual(target.allowList(new PluginConfig(configData())), ["search", "report"]);

  const { kimi } = configData();
  for (const [bad, pattern] of [
    [{ ...kimi, shortDescription: "Twenty-one characters" }, /at most 20 characters/],
    [{ ...kimi, shortDescription: "Cited research." }, /punctuation/],
    [{ ...kimi, mcpUrl: "https://mcp.example.com/mcp" }, /Octagon-owned host/],
    [{ ...kimi, iconUrl: "https://cdn.example.com/icon.png" }, /Octagon-owned host/],
    [{ ...kimi, repository: "https://github.com/someone/acme" }, /OctagonAI/],
    [{ ...kimi, translations: { "zh-CN": "./kimi/zh-CN.json" } }, /default locale en-US/],
    [{ ...kimi, translations: { "en-US": "./kimi/en-US.json" } }, /at least one locale besides/],
    [{ ...kimi, translations: { "en-US": "./kimi/en-US.json", "fr-FR": "./kimi/fr-FR.json" } }, /not a locale Kimi accepts/],
  ]) {
    assert.throws(() => target.checkConfig(new PluginConfig(configData({ kimi: bad }))), pattern, JSON.stringify(bad));
  }
  const { interface: ui, ...rest } = configData();
  const { composerIcon, ...noIcon } = ui;
  assert.throws(() => target.checkConfig(new PluginConfig({ ...rest, interface: noIcon })), /composerIcon/);
});

test("KimiTranslations enforces the role of each locale and complete coverage of the shipped skills", () => {
  const defaults = { skills: { start: { displayName: "Start" } } };
  assert.doesNotThrow(() => KimiTranslations.check(defaults, { locale: "en-US", isDefault: true }, "test"));
  assert.throws(() => KimiTranslations.check({ ...defaults, interface: {} }, { locale: "en-US", isDefault: true }, "test"), /must not be set in the default locale/);
  assert.throws(() => KimiTranslations.check(defaults, { locale: "zh-CN", isDefault: false }, "test"), /interface must be an object/);
  assert.throws(() => KimiTranslations.check({ skills: { Bad_Name: { displayName: "x" } } }, { locale: "en-US", isDefault: true }, "test"), /not a skill directory name/);

  const chinese = chineseTranslations().data;
  assert.doesNotThrow(() => KimiTranslations.check(structuredClone(chinese), { locale: "zh-CN", isDefault: false }, "test"));
  const longShort = structuredClone(chinese);
  longShort.interface.shortDescription = "二十一个字二十一个字二十一个字二十一个字二";
  assert.throws(() => KimiTranslations.check(longShort, { locale: "zh-CN", isDefault: false }, "test"), /at most 20 characters/);
  const trailing = structuredClone(chinese);
  trailing.interface.shortDescription = "研究。";
  assert.throws(() => KimiTranslations.check(trailing, { locale: "zh-CN", isDefault: false }, "test"), /punctuation/);
  const noDescription = structuredClone(chinese);
  delete noDescription.skills.start.description;
  assert.throws(() => KimiTranslations.check(noDescription, { locale: "zh-CN", isDefault: false }, "test"), /skills\.start\.description/);

  const shipped = { skillDirs: ["start", "zeta"], serverKey: "acme-server" };
  assert.doesNotThrow(() => chineseTranslations().assertCovers(shipped));
  assert.throws(() => chineseTranslations().assertCovers({ ...shipped, skillDirs: ["start", "zeta", "new-skill"] }), /skills\.new-skill is missing/);
  assert.throws(() => chineseTranslations().assertCovers({ ...shipped, skillDirs: ["start"] }), /skills\.zeta names a skill the package does not ship/);
  assert.throws(() => chineseTranslations().assertCovers({ ...shipped, serverKey: "other" }), /mcpServers\.other is missing/);
  assert.throws(() => defaultTranslations().interface(), ConfigError);
  assert.throws(() => defaultTranslations().skill("missing"), /skills\.missing is missing/);
});

test("KimiSystemPromptBuilder stays small and carries the tools and standing rules", () => {
  const prompt = new KimiSystemPromptBuilder(new PluginConfig(configData())).systemPrompt();
  assert.ok(utf8Bytes(prompt) < KIMI_SYSTEM_PROMPT_MAX_BYTES / 8);
  for (const needle of ["# Acme Research", "`acme-server`", "`search`", "`report`", "cites the sources", "Sign-in", "read-only", "Research only.", "`acme-odds`"]) {
    assert.ok(prompt.includes(needle), `prompt should contain ${needle}`);
  }
  assert.ok(!prompt.includes("`odds`"), "tools outside the allow-list are not advertised");
});

test("KimiReadmeBuilder declares both install paths, endpoints, credentials, every skill, and the license", () => {
  const readme = new KimiReadmeBuilder(new PluginConfig(configData())).readme({ skills: SKILLS });
  for (const needle of [
    "# Acme Research for Kimi",
    "/plugins install https://github.com/OctagonAI/acme-kimi-plugin",
    "/reload",
    "Plugin Builder",
    "https://mcp.octagonai.co/public-markets/mcp",
    "`login.acme.example`",
    "## Network endpoints",
    "## Credentials",
    "## Components",
    "`search`, `report`",
    "en-US and zh-CN",
    "| `start` | Start here. |",
    "| `zeta` | Zeta. |",
    "License: MIT",
    "kimi/plugins/acme/",
  ]) {
    assert.ok(readme.includes(needle), `README should contain ${needle}`);
  }
  assert.ok(!/chatgpt|openai|claude|codex|grok|gemini/i.test(readme), "README is platform-neutral");
});

test("CatalogSync writes under the repository only and reports drift", async t => {
  const root = await tempDir(t);
  const sync = new CatalogSync({ repoRoot: root, relativePath: "kimi/marketplace.json" });
  const catalog = { version: KIMI_CATALOG_VERSION, plugins: [{ id: "acme", source: "https://x" }] };
  assert.equal(await sync.check(catalog), "missing");
  await sync.write(catalog);
  assert.equal(await sync.check(catalog), null);
  assert.equal(await sync.check({ ...catalog, plugins: [] }), "changed");
  assert.equal(await readFile(path.join(root, "kimi", "marketplace.json"), "utf8"), CatalogSync.render(catalog));
  for (const bad of ["../x.json", "kimi/../x.json", "/etc/x.json", "kimi/marketplace.txt", "Kimi/x.json"]) {
    assert.throws(() => new CatalogSync({ repoRoot: root, relativePath: bad }), /Unsafe catalog path|outside/, bad);
  }
});

test("Profile.all lists the default profile first, then named profiles", async t => {
  const root = await tempDir(t);
  await writeTree(root, { "profiles/beta/plugin.config.json": "{}", "profiles/alpha/plugin.config.json": "{}", "profiles/.hidden/x": "" });
  assert.deepEqual(Profile.all(root).map(profile => profile.name), ["default", "alpha", "beta"]);
  assert.deepEqual(Profile.all(path.join(root, "nowhere")).map(profile => profile.name), ["default"]);
});

test("the Kimi build of both profiles is clean, reproducible, archived with a checksum, and leaves the source tree alone", async t => {
  const protectedDirs = ["skills", "agents", "hooks", ".claude-plugin", "openai", "grok", "gemini", "kimi"];
  const before = Object.fromEntries(await Promise.all(protectedDirs.map(async dir => [dir, await hashTree(path.join(REPO_ROOT, dir))])));

  for (const [profile, expected] of [
    [undefined, { name: "octagon-ai", version: "1.1.2", count: 68, server: "octagon", url: "https://mcp.octagonai.co/public-markets/mcp", enabledTools: ["octagon-agent", "octagon-deep-research-agent"], sessionStart: "get-started" }],
    ["prediction-markets", { name: "octagon-prediction-markets", version: "1.0.2", count: 7, server: "octagon-predictions", url: "https://mcp.octagonai.co/prediction-markets/mcp", enabledTools: undefined, sessionStart: "prediction-markets-get-started" }],
  ]) {
    const outA = await tempDir(t);
    const first = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: outA, target: "kimi", profile })).pipeline.run();
    const second = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), target: "kimi", profile })).pipeline.run();

    assert.equal(first.ok, true, first.validation.errors.map(String).join("\n"));
    assert.equal(first.target, "kimi");
    assert.equal(first.catalog.count, expected.count);
    assert.equal(await hashTree(first.stagingDir), await hashTree(second.stagingDir), "builds are reproducible");
    assert.equal(first.archive?.sha256, second.archive?.sha256, "archives are reproducible");
    assert.ok(first.stagingDir.endsWith(path.join("kimi", expected.name)));
    assert.equal(path.basename(first.archive.path), `${expected.name}-kimi-${expected.version}.zip`);
    assert.ok(first.archive.entries.length < 450, `${first.archive.entries.length} entries stay under the warning threshold`);
    const sidecar = await readFile(`${first.archive.path}.sha256`, "utf8");
    assert.equal(sidecar, `${first.archive.sha256}  ${expected.name}-kimi-${expected.version}.zip\n`);

    const manifest = JSON.parse(await readFile(path.join(first.stagingDir, KIMI_MANIFEST_PATH), "utf8"));
    assert.equal(manifest.name, expected.name);
    const server = manifest.mcpServers[expected.server];
    assert.equal(server.url, expected.url);
    assert.equal(server.auth, "oauth");
    assert.deepEqual(server.enabledTools, expected.enabledTools);
    assert.deepEqual(manifest.sessionStart, { skill: expected.sessionStart });
    assert.equal(Object.keys(manifest.interface.skillOverrides).length, expected.count);
    const locale = JSON.parse(await readFile(path.join(first.stagingDir, "locales", "zh-CN.json"), "utf8"));
    assert.deepEqual(Object.keys(locale.skillOverrides).sort(), Object.keys(manifest.interface.skillOverrides).sort(), "every skill is translated");
    assert.ok([...locale.shortDescription].length <= 20);
    for (const file of ["SYSTEM.md", "README.md", "LICENSE", "assets/icon.png"]) {
      await assert.doesNotReject(readFile(path.join(first.stagingDir, file)), `${file} is shipped`);
    }
  }

  const after = Object.fromEntries(await Promise.all(protectedDirs.map(async dir => [dir, await hashTree(path.join(REPO_ROOT, dir))])));
  assert.deepEqual(after, before, "source trees are unchanged");
});

test("the committed Kimi packages and catalog match the build", async t => {
  for (const profile of [undefined, "prediction-markets"]) {
    const build = await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), target: "kimi", profile });
    const result = await build.pipeline.run();
    assert.equal(result.ok, true);
    assert.deepEqual(await build.sync?.check(result.stagingDir), [], `kimi/plugins/${result.plugin.name} is in sync`);
  }
  const catalog = JSON.parse(await readFile(path.join(REPO_ROOT, "kimi", "marketplace.json"), "utf8"));
  assert.equal(catalog.version, KIMI_CATALOG_VERSION);
  assert.deepEqual(catalog.plugins.map(entry => entry.id), ["octagon-ai", "octagon-prediction-markets"]);
  for (const entry of catalog.plugins) {
    assert.ok(entry.source.startsWith(`https://github.com/OctagonAI/${entry.id}-kimi-plugin/releases/download/v${entry.version}/`), entry.source);
    assert.ok([...entry.shortDescription].length <= 20);
  }
});

test("the OpenAI, Grok, and Gemini builds are unchanged by the Kimi target", async t => {
  const openai = await (await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t) })).pipeline.run();
  assert.equal(openai.ok, true);
  for (const target of ["grok", "gemini"]) {
    for (const profile of [undefined, "prediction-markets"]) {
      const build = await createBuild({ repoRoot: REPO_ROOT, outRoot: await tempDir(t), target, profile });
      const result = await build.pipeline.run();
      assert.equal(result.ok, true);
      assert.deepEqual(await build.sync?.check(result.stagingDir), [], `${target}/${result.plugin.name} is unchanged`);
    }
  }
});
