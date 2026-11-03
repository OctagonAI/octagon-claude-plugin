import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { PackageView } from "../../tools/openai-plugin/lib/validation/PackageView.mjs";
import { GeminiContextRule } from "../../tools/openai-plugin/lib/validation/rules/gemini/GeminiContextRule.mjs";
import { GeminiManifestRule } from "../../tools/openai-plugin/lib/validation/rules/gemini/GeminiManifestRule.mjs";
import { GeminiMcpRule } from "../../tools/openai-plugin/lib/validation/rules/gemini/GeminiMcpRule.mjs";
import { createGeminiRules } from "../../tools/openai-plugin/lib/validation/rules/gemini/index.mjs";
import { Validator } from "../../tools/openai-plugin/lib/validation/Validator.mjs";
import { skillText, tempDir, writeTree } from "./helpers.mjs";

const LICENSE = "MIT License\n\nCopyright (c) Acme\n";
const MCP_URL = "https://mcp.acme.example/mcp";
const TOOLS = ["search", "report"];

function validServer() {
  return { url: MCP_URL, type: "http", oauth: { enabled: true }, includeTools: [...TOOLS], timeout: 600000 };
}

function validManifest(server = validServer()) {
  return { name: "acme", version: "1.0.0", description: "Acme research.", contextFileName: "GEMINI.md", mcpServers: { acme: server } };
}

function validContext() {
  return "# Acme\n\nUses `acme`, which exposes `search`, `report`.\n\n- Every answer cites its sources.\n- Run `/mcp auth acme` to sign in.\n- Tools are read-only.\n";
}

function validReadme() {
  return [
    "# Acme for Gemini CLI",
    "## Install",
    "gemini extensions install https://github.com/OctagonAI/acme",
    "agy plugin install https://github.com/OctagonAI/acme",
    "Run `/mcp auth acme`.",
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
 * @param {{ manifest?: object, files?: Record<string, string | null> }} [overrides]
 */
async function makePackage(t, { manifest = validManifest(), files = {} } = {}) {
  const root = await tempDir(t);
  const tree = {
    "gemini-extension.json": JSON.stringify(manifest),
    "GEMINI.md": validContext(),
    "README.md": validReadme(),
    LICENSE,
    "skills/start/SKILL.md": skillText("start", "Start here."),
  };
  for (const [file, content] of Object.entries(files)) {
    if (content === null) delete tree[file];
    else tree[file] = content;
  }
  await writeTree(root, tree);
  return PackageView.load(root, { manifestPath: "gemini-extension.json" });
}

/** @param {import("node:test").TestContext} t */
async function licenseFile(t) {
  const file = path.join(await tempDir(t), "LICENSE");
  await writeFile(file, LICENSE);
  return file;
}

test("a valid Gemini extension passes every Gemini rule", async t => {
  const pkg = await makePackage(t);
  const rules = createGeminiRules({ licenseFile: await licenseFile(t), expectedName: "acme", mcpUrl: MCP_URL, includeTools: TOOLS, tools: TOOLS });
  const report = await new Validator(rules).run({ pkg }, "package");
  assert.deepEqual(report.findings.map(String), []);
});

test("GeminiManifestRule: name, version, description, context file, documented fields", async t => {
  const rule = new GeminiManifestRule({ expectedName: "acme" });
  const cases = [
    [{ name: "Acme" }, /name must be lowercase/],
    [{ name: "-acme" }, /name must be lowercase/],
    [{ name: "other" }, /must equal the plugin name "acme"/],
    [{ version: "1.0" }, /semantic version/],
    [{ description: "" }, /description is required/],
    [{ description: "two\nlines" }, /single line/],
    [{ description: "x".repeat(301) }, /at most 300/],
    [{ contextFileName: "MISSING.md" }, /is not in the package/],
    [{ contextFileName: undefined }, /contextFileName is required/],
    [{ mcpServers: undefined }, /mcpServers object is required/],
    [{ settings: [] }, /"settings" must not be set/],
    [{ excludeTools: ["x"] }, /"excludeTools" must not be set/],
    [{ themes: [] }, /"themes" must not be set/],
    [{ hooks: "x" }, /"hooks" is not a documented/],
  ];
  for (const [override, expected] of cases) {
    const manifest = { ...validManifest(), ...override };
    for (const key of Object.keys(override)) if (override[key] === undefined) delete manifest[key];
    const findings = await rule.check({ pkg: await makePackage(t, { manifest }) });
    assert.ok(findings.some(finding => expected.test(finding.message)), `${JSON.stringify(override)} → ${findings.map(String)}`);
  }
  const missing = await makePackage(t, { files: { "gemini-extension.json": null } });
  assert.match((await rule.check({ pkg: missing }))[0].message, /missing/);
});

test("GeminiMcpRule: one remote server, url + type http, OAuth, no deprecated or local fields, allow-list parity", async t => {
  const rule = new GeminiMcpRule({ expectedUrl: MCP_URL, includeTools: TOOLS });
  assert.deepEqual(await rule.check({ pkg: await makePackage(t) }), []);

  const cases = [
    [{ ...validServer(), httpUrl: MCP_URL }, /"httpUrl" is deprecated/],
    [{ ...validServer(), command: "node" }, /"command" must not be set/],
    [{ ...validServer(), headers: { Authorization: "Bearer x" } }, /"headers" must not be set/],
    [{ ...validServer(), trust: true }, /"trust" must not be set/],
    [{ ...validServer(), env: { KEY: "x" } }, /"env" must not be set/],
    [{ ...validServer(), url: "http://mcp.acme.example/mcp" }, /https:\/\/ url/],
    [{ ...validServer(), url: "https://mcp.acme.example/other" }, /differs from the configured/],
    [{ ...validServer(), type: "sse" }, /must declare type "http"/],
    [{ ...validServer(), oauth: { enabled: false } }, /oauth\.enabled: true/],
    [{ ...validServer(), timeout: -1 }, /positive integer/],
    [{ ...validServer(), includeTools: ["search"] }, /includeTools must equal the configured allow-list/],
    [{ ...validServer(), extra: 1 }, /"extra" is not a field/],
  ];
  for (const [server, expected] of cases) {
    const findings = await rule.check({ pkg: await makePackage(t, { manifest: validManifest(server) }) });
    assert.ok(findings.some(finding => expected.test(finding.message)), `${JSON.stringify(server)} → ${findings.map(String)}`);
  }
  const two = await makePackage(t, { manifest: { ...validManifest(), mcpServers: { a: validServer(), b: validServer() } } });
  assert.match((await rule.check({ pkg: two }))[0].message, /exactly one MCP server/);

  // Without a configured allow-list, declaring one is an error.
  const open = new GeminiMcpRule({ expectedUrl: MCP_URL });
  assert.match((await open.check({ pkg: await makePackage(t) }))[0].message, /declares includeTools but the config has none/);
  const { includeTools, ...bare } = validServer();
  assert.deepEqual(await open.check({ pkg: await makePackage(t, { manifest: validManifest(bare) }) }), []);
});

test("GeminiContextRule: present, short, names the tools, carries the rules", async t => {
  const rule = new GeminiContextRule({ tools: TOOLS });
  assert.deepEqual(await rule.check({ pkg: await makePackage(t) }), []);

  const missing = await makePackage(t, { files: { "GEMINI.md": null } });
  assert.match((await rule.check({ pkg: missing }))[0].message, /GEMINI\.md is required/);

  const thin = await makePackage(t, { files: { "GEMINI.md": "# Acme\n\nSome words.\n" } });
  const messages = (await rule.check({ pkg: thin })).map(finding => finding.message);
  for (const expected of [/name the tool "search"/, /name the tool "report"/, /the citation rule/, /how to sign in/, /read-only/]) {
    assert.ok(messages.some(message => expected.test(message)), `${expected} in ${messages}`);
  }

  const long = await makePackage(t, { files: { "GEMINI.md": `${validContext()}\n${"word ".repeat(260)}` } });
  assert.ok((await rule.check({ pkg: long })).some(finding => /keep it at most 250/.test(finding.message)));
});

test("the Gemini scope and README rules reject other components and missing declarations", async t => {
  const rules = createGeminiRules({ licenseFile: await licenseFile(t), expectedName: "acme", mcpUrl: MCP_URL, includeTools: TOOLS, tools: TOOLS });
  const validator = new Validator(rules);

  const extras = await makePackage(t, { files: { "commands/go.toml": "x", "hooks/hooks.json": "{}", "skills/start/run.sh": "x", ".mcp.json": "{}" } });
  const messages = (await validator.run({ pkg: extras }, "package")).findings.map(String);
  for (const expected of [/commands\/go\.toml/, /hooks\/hooks\.json/, /run\.sh.*no executable code/, /\.mcp\.json.*unexpected file/]) {
    assert.ok(messages.some(message => expected.test(message)), `${expected} in ${messages}`);
  }

  const thinReadme = await makePackage(t, { files: { "README.md": "# Acme\n" } });
  const readmeMessages = (await validator.run({ pkg: thinReadme }, "package")).findings.map(finding => finding.message);
  for (const expected of [/declare the MCP endpoint/, /Gemini CLI install command/, /Antigravity CLI install command/, /how to sign in/, /list the skill "start"/]) {
    assert.ok(readmeMessages.some(message => expected.test(message)), `${expected} in ${readmeMessages}`);
  }
});
