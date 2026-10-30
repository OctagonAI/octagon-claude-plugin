import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { PackageView } from "../../tools/openai-plugin/lib/validation/PackageView.mjs";
import { BrandKeywordRule } from "../../tools/openai-plugin/lib/validation/rules/grok/BrandKeywordRule.mjs";
import { GrokComponentScopeRule } from "../../tools/openai-plugin/lib/validation/rules/grok/GrokComponentScopeRule.mjs";
import { GrokManifestRule } from "../../tools/openai-plugin/lib/validation/rules/grok/GrokManifestRule.mjs";
import { GrokMcpConfigRule } from "../../tools/openai-plugin/lib/validation/rules/grok/GrokMcpConfigRule.mjs";
import { LicenseRule } from "../../tools/openai-plugin/lib/validation/rules/grok/LicenseRule.mjs";
import { ReadmeDeclarationRule } from "../../tools/openai-plugin/lib/validation/rules/grok/ReadmeDeclarationRule.mjs";
import { createGrokRules } from "../../tools/openai-plugin/lib/validation/rules/grok/index.mjs";
import { Validator } from "../../tools/openai-plugin/lib/validation/Validator.mjs";
import { pngHeader, skillText, tempDir, writeTree } from "./helpers.mjs";

const LICENSE = "MIT License\n\nCopyright (c) Acme\n";
const MCP_URL = "https://mcp.acme.example/mcp";

/** A package that passes every Grok rule. Each test breaks one thing. */
function validManifest() {
  return {
    name: "acme",
    version: "1.0.0",
    description: "Acme research.",
    author: { name: "Acme", url: "https://acme.example/" },
    homepage: "https://acme.example/",
    repository: "https://github.com/acme/plugin",
    license: "MIT",
    keywords: ["acme", "acme research"],
    skills: "./skills/",
    mcpServers: "./.mcp.json",
  };
}

function validReadme() {
  return [
    "# Acme for Grok Build",
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
 * @param {{ manifest?: object, mcp?: object, files?: Record<string, string | Buffer | null> }} [overrides]
 */
async function makePackage(t, { manifest = validManifest(), mcp, files = {} } = {}) {
  const root = await tempDir(t);
  const tree = {
    ".grok-plugin/plugin.json": JSON.stringify(manifest),
    ".mcp.json": JSON.stringify(mcp ?? { mcpServers: { acme: { type: "http", url: MCP_URL } } }),
    "README.md": validReadme(),
    LICENSE,
    "assets/icon.png": pngHeader(128, 128),
    "skills/start/SKILL.md": skillText("start", "Start here."),
  };
  for (const [file, content] of Object.entries(files)) {
    if (content === null) delete tree[file];
    else tree[file] = content;
  }
  await writeTree(root, tree);
  return { root, pkg: await PackageView.load(root, { manifestPath: ".grok-plugin/plugin.json" }) };
}

/** @param {import("node:test").TestContext} t */
async function licenseFile(t) {
  const file = path.join(await tempDir(t), "LICENSE");
  await writeFile(file, LICENSE);
  return file;
}

test("a valid Grok package passes every Grok rule", async t => {
  const { pkg } = await makePackage(t);
  const report = await new Validator(createGrokRules({ licenseFile: await licenseFile(t), brand: "acme" })).run({ pkg }, "package");
  assert.deepEqual(report.findings.map(String), []);
});

test("GrokManifestRule: identity, documented fields, paths, HTTPS links", async t => {
  const rule = new GrokManifestRule();
  const cases = [
    [{ name: "-acme" }, /name must be/],
    [{ name: "Acme" }, /name must be/],
    [{ name: "a".repeat(65) }, /name must be/],
    [{ version: "1.0" }, /semantic version/],
    [{ description: " " }, /description is required/],
    [{ author: { url: "https://acme.example/" } }, /author\.name is required/],
    [{ author: { name: "Acme", url: "http://acme.example/" } }, /author\.url must use HTTPS/],
    [{ license: undefined }, /license is required/],
    [{ keywords: [] }, /keywords must be/],
    [{ homepage: undefined }, /homepage is required/],
    [{ homepage: "ftp://acme.example/" }, /homepage must use HTTPS/],
    [{ repository: "not a url" }, /repository is not a valid URL/],
    [{ skills: "./skills" }, /skills must be/],
    [{ mcpServers: { acme: {} } }, /mcpServers must be/],
    [{ interface: { displayName: "Acme" } }, /"interface" is not a documented/],
    [{ hooks: "./hooks/hooks.json" }, /"hooks" is not a documented/],
  ];
  for (const [override, expected] of cases) {
    const manifest = { ...validManifest(), ...override };
    for (const key of Object.keys(override)) if (override[key] === undefined) delete manifest[key];
    const { pkg } = await makePackage(t, { manifest });
    const findings = await rule.check({ pkg });
    assert.ok(findings.some(finding => expected.test(finding.message)), `${JSON.stringify(override)} → ${findings.map(String)}`);
  }

  const { pkg: missing } = await makePackage(t, { files: { ".grok-plugin/plugin.json": null } });
  assert.match((await rule.check({ pkg: missing }))[0].message, /missing/);
  const { pkg: broken } = await makePackage(t, { files: { ".grok-plugin/plugin.json": "{" } });
  assert.match((await rule.check({ pkg: broken }))[0].message, /not valid JSON/);
});

test("GrokMcpConfigRule: one remote HTTPS server, nothing local", async t => {
  const rule = new GrokMcpConfigRule();
  const cases = [
    [{ mcpServers: {} }, /exactly one MCP server/],
    [{ mcpServers: { a: { type: "http", url: MCP_URL }, b: { type: "http", url: MCP_URL } } }, /exactly one MCP server/],
    [{ mcpServers: { acme: { url: MCP_URL } } }, /must declare type "http"/],
    [{ mcpServers: { acme: { type: "stdio", command: "node" } } }, /must declare type "http"/],
    [{ mcpServers: { acme: { type: "http", url: "http://mcp.acme.example/mcp" } } }, /https:\/\/ url/],
    [{ mcpServers: { acme: { type: "http", url: MCP_URL, command: "sh" } } }, /must not set "command"/],
    [{ mcpServers: { acme: { type: "http", url: MCP_URL, env: { KEY: "x" } } } }, /must not set "env"/],
    [{ servers: {} }, /mcpServers object is required/],
  ];
  for (const [mcp, expected] of cases) {
    const { pkg } = await makePackage(t, { mcp });
    const findings = await rule.check({ pkg });
    assert.ok(findings.some(finding => expected.test(finding.message)), `${JSON.stringify(mcp)} → ${findings.map(String)}`);
  }
});

test("GrokComponentScopeRule: skills and the server only, no executables", async t => {
  const rule = new GrokComponentScopeRule();
  const { pkg: clean } = await makePackage(t);
  assert.deepEqual(await rule.check({ pkg: clean }), []);

  const cases = [
    ["hooks/hooks.json", /no hooks, commands, or agents/],
    ["agents/helper.md", /no hooks, commands, or agents/],
    ["commands/go.md", /no hooks, commands, or agents/],
    [".lsp.json", /no LSP servers/],
    [".claude-plugin/plugin.json", /other platforms' manifests/],
    [".codex-plugin/plugin.json", /other platforms' manifests/],
    ["skills/start/scripts/run.sh", /no executable code/],
    ["skills/start/helper.py", /no executable code/],
    ["skills/start/tool.mjs", /no executable code/],
    ["notes.txt", /unexpected file outside skills\//],
  ];
  for (const [file, expected] of cases) {
    const { pkg } = await makePackage(t, { files: { [file]: "x" } });
    const findings = await rule.check({ pkg });
    assert.ok(findings.some(finding => finding.path === file && expected.test(finding.message)), `${file} → ${findings.map(String)}`);
  }
});

test("BrandKeywordRule: every keyword carries the brand and none is generic", async t => {
  const rule = new BrandKeywordRule({ brand: "acme" });
  const { pkg: clean } = await makePackage(t);
  assert.deepEqual(await rule.check({ pkg: clean }), []);

  const { pkg } = await makePackage(t, {
    manifest: { ...validManifest(), keywords: ["acme", "finance", "Acme", "kalshi", "widgets", "ACME "] },
  });
  const messages = (await rule.check({ pkg })).map(finding => finding.message);
  assert.ok(messages.some(message => /"finance" is a generic term/.test(message)));
  assert.ok(messages.some(message => /"kalshi" is a generic term/.test(message)));
  assert.ok(messages.some(message => /"widgets" must contain the brand "acme"/.test(message)));
  assert.ok(messages.some(message => /duplicate keyword "Acme"/.test(message)));
  assert.ok(messages.some(message => /duplicate keyword "ACME "/.test(message)));
  assert.equal(messages.length, 5, messages.join("\n"));
});

test("ReadmeDeclarationRule: endpoint, sections, skills, license", async t => {
  const rule = new ReadmeDeclarationRule();
  const { pkg: clean } = await makePackage(t);
  assert.deepEqual(await rule.check({ pkg: clean }), []);

  const { pkg: missing } = await makePackage(t, { files: { "README.md": null } });
  assert.match((await rule.check({ pkg: missing }))[0].message, /README\.md is required/);

  const { pkg: thin } = await makePackage(t, { files: { "README.md": "# Acme\n\nSome words.\n" } });
  const messages = (await rule.check({ pkg: thin })).map(finding => finding.message);
  for (const expected of [
    /declare the MCP endpoint https:\/\/mcp\.acme\.example\/mcp/,
    /the credential model/,
    /the network endpoints section/,
    /the credentials section/,
    /the components section/,
    /the license/,
    /list the skill "start"/,
  ]) {
    assert.ok(messages.some(message => expected.test(message)), `${expected} in ${messages}`);
  }
});

test("LicenseRule: present and byte-identical to the repository's", async t => {
  const rule = new LicenseRule({ licenseFile: await licenseFile(t) });
  const { pkg: clean } = await makePackage(t);
  assert.deepEqual(await rule.check({ pkg: clean }), []);

  const { pkg: missing } = await makePackage(t, { files: { LICENSE: null } });
  assert.match((await rule.check({ pkg: missing }))[0].message, /LICENSE is required/);
  const { pkg: changed } = await makePackage(t, { files: { LICENSE: `${LICENSE}\nextra` } });
  assert.match((await rule.check({ pkg: changed }))[0].message, /differs from the repository/);
});
