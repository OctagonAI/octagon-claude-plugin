import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Archiver } from "../../tools/openai-plugin/lib/output/Archiver.mjs";
import { PackageView } from "../../tools/openai-plugin/lib/validation/PackageView.mjs";
import { KimiArchiveRule } from "../../tools/openai-plugin/lib/validation/rules/kimi/KimiArchiveRule.mjs";
import { KimiInterfaceRule } from "../../tools/openai-plugin/lib/validation/rules/kimi/KimiInterfaceRule.mjs";
import { KimiLocaleRule } from "../../tools/openai-plugin/lib/validation/rules/kimi/KimiLocaleRule.mjs";
import { KimiManifestRule } from "../../tools/openai-plugin/lib/validation/rules/kimi/KimiManifestRule.mjs";
import { KimiMcpRule } from "../../tools/openai-plugin/lib/validation/rules/kimi/KimiMcpRule.mjs";
import { KimiSystemPromptRule } from "../../tools/openai-plugin/lib/validation/rules/kimi/KimiSystemPromptRule.mjs";
import { createKimiRules } from "../../tools/openai-plugin/lib/validation/rules/kimi/index.mjs";
import { Validator } from "../../tools/openai-plugin/lib/validation/Validator.mjs";
import { listFiles } from "../../tools/openai-plugin/lib/util/fs.mjs";
import { pngHeader, skillText, tempDir, writeTree } from "./helpers.mjs";

const LICENSE = "MIT License\n\nCopyright (c) Acme\n";
const MCP_URL = "https://mcp.acme.example/mcp";
const TOOLS = ["search", "report"];
const ICON = "https://www.acme.example/icon.png";

function validServer() {
  return { url: MCP_URL, auth: "oauth", enabledTools: [...TOOLS], toolTimeoutMs: 600000 };
}

function validInterface() {
  return {
    displayName: "Acme",
    shortDescription: "Cited research",
    longDescription: "Long text.",
    developerName: "Acme Inc",
    websiteURL: "https://acme.example/",
    tryPrompts: ["Find a thing"],
    defaultLocale: "en-US",
    locales: "./locales/",
    mcpOverrides: { acme: { displayName: "Acme server", description: "The server.", iconUrl: ICON } },
    skillOverrides: { start: { displayName: "Start", description: "Start here." } },
  };
}

function validManifest({ server = validServer(), ui = validInterface() } = {}) {
  return {
    name: "acme",
    version: "1.0.0",
    description: "Acme research.",
    skills: ["./skills/"],
    sessionStart: { skill: "start" },
    skillInstructions: "Cite sources.",
    systemPromptPath: "./SYSTEM.md",
    mcpServers: { acme: server },
    interface: ui,
  };
}

function validLocale() {
  return {
    displayName: "Acme 研究",
    shortDescription: "有据可查的研究",
    longDescription: "长文本。",
    developerName: "Acme 公司",
    tryPrompts: ["找一个东西"],
    mcpOverrides: { acme: { displayName: "Acme 服务", description: "服务。" } },
    skillOverrides: { start: { displayName: "开始", description: "从这里开始。" } },
  };
}

function validSystemPrompt() {
  return "# Acme\n\nUses `acme`, which exposes `search`, `report`.\n\n- Every answer cites its sources.\n- Sign-in: the first tool call opens the browser.\n- Tools are read-only.\n";
}

function validReadme() {
  return [
    "# Acme for Kimi",
    "## Install",
    "/plugins install https://github.com/OctagonAI/acme",
    "/reload",
    "Paste the link into Plugin Builder.",
    "OAuth sign-in.",
    "## Components",
    "- 1 skill: `start`",
    "## Network endpoints",
    `| mcp.acme.example | ${MCP_URL} |`,
    "## Credentials",
    "Browser OAuth.",
    "## License and support",
    "- License: MIT",
  ].join("\n");
}

/**
 * @param {import("node:test").TestContext} t
 * @param {{ manifest?: object, files?: Record<string, string | Buffer | null> }} [overrides]
 */
async function makePackage(t, { manifest = validManifest(), files = {} } = {}) {
  const root = await tempDir(t);
  const tree = {
    "kimi.plugin.json": JSON.stringify(manifest),
    "SYSTEM.md": validSystemPrompt(),
    "README.md": validReadme(),
    LICENSE,
    "assets/icon.png": pngHeader(512, 512),
    "locales/zh-CN.json": JSON.stringify(validLocale()),
    "skills/start/SKILL.md": skillText("start", "Start here."),
  };
  for (const [file, content] of Object.entries(files)) {
    if (content === null) delete tree[file];
    else tree[file] = content;
  }
  await writeTree(root, tree);
  return PackageView.load(root, { manifestPath: "kimi.plugin.json" });
}

/** @param {import("node:test").TestContext} t */
async function licenseFile(t) {
  const file = path.join(await tempDir(t), "LICENSE");
  await writeFile(file, LICENSE);
  return file;
}

/** @param {import("../../tools/openai-plugin/lib/validation/Rule.mjs").Rule} rule */
async function messages(rule, pkg, archive) {
  return (await rule.check({ pkg, archive })).map(finding => finding.message);
}

test("a valid Kimi plugin passes every Kimi rule", async t => {
  const pkg = await makePackage(t);
  const rules = createKimiRules({ licenseFile: await licenseFile(t), expectedName: "acme", mcpUrl: MCP_URL, enabledTools: TOOLS, knownTools: [...TOOLS, "odds"], tools: TOOLS, locales: ["zh-CN"] });
  const report = await new Validator(rules).run({ pkg }, "package");
  assert.deepEqual(report.findings.map(String), []);
});

test("KimiManifestRule: root manifest, kebab name, semver, skills path, session skill, system prompt, no stray fields", async t => {
  const rule = new KimiManifestRule({ expectedName: "acme" });
  assert.deepEqual(await messages(rule, await makePackage(t)), []);

  const cases = [
    [{ ...validManifest(), name: "Acme_Plugin" }, /kebab-case/],
    [{ ...validManifest(), name: "other" }, /must equal the plugin name "acme"/],
    [{ ...validManifest(), version: "1.0" }, /semantic version/],
    [{ ...validManifest(), description: "two\nlines" }, /single line/],
    [{ ...validManifest(), skills: "./skills/" }, /skills must be \["\.\/skills\/"\]/],
    [{ ...validManifest(), sessionStart: { skill: "missing" } }, /sessionStart\.skill must name a shipped skill/],
    [{ ...validManifest(), systemPromptPath: "./PROMPT.md" }, /systemPromptPath must be/],
    [{ ...validManifest(), skillInstructions: "" }, /skillInstructions/],
    [{ ...validManifest(), hooks: [] }, /"hooks" must not be set/],
    [{ ...validManifest(), tools: [] }, /"tools" must not be set/],
    [{ ...validManifest(), unknownField: 1 }, /not a documented Kimi plugin manifest field/],
  ];
  for (const [manifest, pattern] of cases) {
    const found = await messages(rule, await makePackage(t, { manifest }));
    assert.ok(found.some(message => pattern.test(message)), `${pattern} in ${found.join(" | ")}`);
  }
  const noPrompt = await messages(rule, await makePackage(t, { files: { "SYSTEM.md": null } }));
  assert.ok(noPrompt.some(message => /SYSTEM\.md is not in the package/.test(message)));
  const missing = await messages(rule, await makePackage(t, { files: { "kimi.plugin.json": null } }));
  assert.deepEqual(missing, ["kimi.plugin.json is missing"]);
});

test("KimiInterfaceRule: required text, the 20-character rule, prompts, locales, overrides for every server and skill", async t => {
  const rule = new KimiInterfaceRule();
  assert.deepEqual(await messages(rule, await makePackage(t)), []);

  const ui = validInterface();
  const cases = [
    [{ ...ui, developerName: undefined }, /interface\.developerName is required/],
    [{ ...ui, shortDescription: "Twenty-one characters" }, /at most 20 characters/],
    [{ ...ui, shortDescription: "Cited research." }, /must not end with punctuation/],
    [{ ...ui, shortDescription: "二十一个字二十一个字二十一个字二十一个字二" }, /at most 20 characters \(got 21\)/],
    [{ ...ui, tryPrompts: [] }, /at least one example instruction/],
    [{ ...ui, tryPrompts: ["a", "b", "c", "d"] }, /at most 3 prompts/],
    [{ ...ui, defaultLocale: "zh-CN" }, /defaultLocale must be "en-US"/],
    [{ ...ui, locales: "./i18n/" }, /locales must be "\.\/locales\/"/],
    [{ ...ui, websiteURL: "http://acme.example/" }, /websiteURL must be an https/],
    [{ ...ui, mcpOverrides: {} }, /mcpOverrides\.acme is missing/],
    [{ ...ui, mcpOverrides: { acme: { displayName: "x", description: "y" } } }, /iconUrl must be an https/],
    [{ ...ui, skillOverrides: {} }, /skillOverrides\.start is missing/],
    [{ ...ui, skillOverrides: { ...ui.skillOverrides, ghost: { displayName: "x", description: "y" } } }, /skillOverrides\.ghost describes something the package does not ship/],
    [{ ...ui, skillOverrides: { start: { displayName: "x" } } }, /skillOverrides\.start\.description is required/],
    [{ ...ui, extra: true }, /interface\.extra is not a field/],
  ];
  for (const [bad, pattern] of cases) {
    const found = await messages(rule, await makePackage(t, { manifest: validManifest({ ui: bad }) }));
    assert.ok(found.some(message => pattern.test(message)), `${pattern} in ${found.join(" | ")}`);
  }
});

test("KimiLocaleRule: every declared locale ships a complete translation and no undeclared file ships", async t => {
  const rule = new KimiLocaleRule({ locales: ["zh-CN"] });
  assert.deepEqual(await messages(rule, await makePackage(t)), []);

  const locale = validLocale();
  const cases = [
    [{ ...locale, longDescription: undefined }, /longDescription is missing/],
    [{ ...locale, shortDescription: "二十一个字二十一个字二十一个字二十一个字二" }, /at most 20 characters/],
    [{ ...locale, shortDescription: "研究。" }, /punctuation/],
    [{ ...locale, tryPrompts: [] }, /tryPrompts has 0 prompts; the manifest has 1/],
    [{ ...locale, mcpOverrides: {} }, /mcpOverrides\.acme is missing/],
    [{ ...locale, skillOverrides: { start: { displayName: "开始" } } }, /skillOverrides\.start\.description is missing/],
    [{ ...locale, skillOverrides: { ...locale.skillOverrides, ghost: { displayName: "x", description: "y" } } }, /skillOverrides\.ghost is not in the manifest/],
  ];
  for (const [bad, pattern] of cases) {
    const found = await messages(rule, await makePackage(t, { files: { "locales/zh-CN.json": JSON.stringify(bad) } }));
    assert.ok(found.some(message => pattern.test(message)), `${pattern} in ${found.join(" | ")}`);
  }
  assert.ok((await messages(rule, await makePackage(t, { files: { "locales/zh-CN.json": null } }))).some(message => /translation file for zh-CN is missing/.test(message)));
  assert.ok((await messages(rule, await makePackage(t, { files: { "locales/zh-CN.json": "{" } }))).some(message => /not valid JSON/.test(message)));
  assert.ok((await messages(rule, await makePackage(t, { files: { "locales/fr-FR.json": "{}" } }))).some(message => /not declared in the config/.test(message)));
  assert.ok((await messages(new KimiLocaleRule({ locales: [] }), await makePackage(t))).some(message => /at least one translated locale/.test(message)));
  assert.ok((await messages(new KimiLocaleRule({ locales: ["fr-FR"] }), await makePackage(t))).some(message => /not one Kimi accepts/.test(message)));
});

test("KimiMcpRule: one remote OAuth server at the configured URL with the configured allow-list", async t => {
  const rule = new KimiMcpRule({ expectedUrl: MCP_URL, enabledTools: TOOLS, knownTools: [...TOOLS, "odds"] });
  assert.deepEqual(await messages(rule, await makePackage(t)), []);

  const cases = [
    [{ ...validServer(), url: "http://mcp.acme.example/mcp" }, /https:\/\/ url/],
    [{ ...validServer(), url: "https://elsewhere.example/mcp" }, /differs from the configured/],
    [{ ...validServer(), auth: undefined }, /auth: "oauth"/],
    [{ ...validServer(), headers: { Authorization: "Bearer x" } }, /"headers" must not be set/],
    [{ ...validServer(), bearerTokenEnvVar: "TOKEN" }, /"bearerTokenEnvVar" must not be set/],
    [{ ...validServer(), command: "npx", args: [] }, /"command" must not be set/],
    [{ ...validServer(), transport: "sse" }, /"transport" must be omitted/],
    [{ ...validServer(), toolTimeoutMs: -1 }, /toolTimeoutMs must be a positive integer/],
    [{ ...validServer(), enabledTools: ["search"] }, /enabledTools must equal the configured allow-list/],
    [{ ...validServer(), extra: 1 }, /"extra" is not a field/],
  ];
  for (const [server, pattern] of cases) {
    const found = await messages(rule, await makePackage(t, { manifest: validManifest({ server }) }));
    assert.ok(found.some(message => pattern.test(message)), `${pattern} in ${found.join(" | ")}`);
  }
  const two = await messages(rule, await makePackage(t, { manifest: { ...validManifest(), mcpServers: { a: validServer(), b: validServer() } } }));
  assert.deepEqual(two, ["exactly one MCP server is expected, found 2"]);
  const unknownTool = new KimiMcpRule({ expectedUrl: MCP_URL, enabledTools: ["search", "ghost"], knownTools: TOOLS });
  const found = await messages(unknownTool, await makePackage(t, { manifest: validManifest({ server: { ...validServer(), enabledTools: ["search", "ghost"] } }) }));
  assert.ok(found.some(message => /names "ghost", which the endpoint does not serve/.test(message)));
  const none = new KimiMcpRule({ expectedUrl: MCP_URL, knownTools: TOOLS });
  assert.ok((await messages(none, await makePackage(t))).some(message => /declares enabledTools but the config has none/.test(message)));
});

test("KimiSystemPromptRule: present, UTF-8, under the cap, names every tool, states the rules", async t => {
  const rule = new KimiSystemPromptRule({ tools: TOOLS });
  assert.deepEqual(await messages(rule, await makePackage(t)), []);
  assert.ok((await messages(rule, await makePackage(t, { files: { "SYSTEM.md": null } }))).some(message => /is required/.test(message)));
  assert.ok((await messages(rule, await makePackage(t, { files: { "SYSTEM.md": Buffer.from([0xff, 0xfe, 0x41]) } }))).some(message => /valid UTF-8/.test(message)));
  assert.ok((await messages(rule, await makePackage(t, { files: { "SYSTEM.md": validSystemPrompt().replace("`report`", "") } }))).some(message => /must name the tool "report"/.test(message)));
  assert.ok((await messages(rule, await makePackage(t, { files: { "SYSTEM.md": validSystemPrompt().replace("read-only", "safe") } }))).some(message => /read-only/.test(message)));
  const huge = await messages(rule, await makePackage(t, { files: { "SYSTEM.md": `${validSystemPrompt()}${"x".repeat(33 * 1024)}` } }));
  assert.ok(huge.some(message => /ignores a system-prompt file over 32768 bytes/.test(message)));
  const warn = await new KimiSystemPromptRule({ tools: TOOLS }).check({ pkg: await makePackage(t, { files: { "SYSTEM.md": `${validSystemPrompt()}${"x".repeat(9 * 1024)}` } }) });
  assert.ok(warn.some(finding => finding.severity === "warning" && /64 KB budget/.test(finding.message)));
});

test("KimiArchiveRule: root manifest with skills/ and locales/ beside it, limits, and parity with staging", async t => {
  const pkg = await makePackage(t);
  const zipPath = path.join(await tempDir(t), "acme-kimi-1.0.0.zip");
  const archive = await new Archiver().create(pkg.root, await listFiles(pkg.root), zipPath);
  const rule = new KimiArchiveRule();
  assert.equal(rule.scope, "archive");
  assert.deepEqual(await messages(rule, pkg, archive), []);
  assert.deepEqual(await messages(rule, pkg, undefined), ["no archive to inspect"]);

  const noLocales = { ...archive, entries: archive.entries.filter(entry => !entry.startsWith("locales/")) };
  const found = await messages(rule, pkg, noLocales);
  assert.ok(found.some(message => /locales\/ must sit beside the manifest/.test(message)));
  assert.ok(found.some(message => /differ from the staged package/.test(message)));
  assert.ok((await messages(rule, pkg, { ...archive, entries: archive.entries.map(entry => (entry === "kimi.plugin.json" ? "plugin/kimi.plugin.json" : entry)) })).some(message => /must be at the archive root/.test(message)));
  assert.ok((await messages(rule, pkg, { ...archive, bytes: 65 * 1024 * 1024 })).some(message => /limit is 64 MiB/.test(message)));
  const many = { ...archive, entries: [...archive.entries, ...Array.from({ length: 500 }, (_, i) => `skills/s/${i}.md`)] };
  assert.ok((await messages(rule, pkg, many)).some(message => /the limit is 500/.test(message)));
  const near = await rule.check({ pkg, archive: { ...archive, entries: [...archive.entries, ...Array.from({ length: 445 }, (_, i) => `skills/s/${i}.md`)] } });
  assert.ok(near.some(finding => finding.severity === "warning" && /consolidate skill references/.test(finding.message)));
});
