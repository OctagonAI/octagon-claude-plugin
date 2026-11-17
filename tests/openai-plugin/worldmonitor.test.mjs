import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { PluginConfig } from "../../tools/openai-plugin/lib/config/PluginConfig.mjs";
import { Profile } from "../../tools/openai-plugin/lib/config/Profile.mjs";
import { layout } from "../../tools/openai-plugin/lib/createBuild.mjs";
import { ConfigError } from "../../tools/openai-plugin/lib/errors.mjs";
import {
  OCTAGON_MCP_HOST,
  WORLDMONITOR_API_KEY_HEADER,
  WORLDMONITOR_MANIFEST_ROW_PATH,
  WORLDMONITOR_PRESETS_PATH,
  WorldMonitorCatalogBuilder,
} from "../../tools/openai-plugin/lib/manifest/WorldMonitorCatalogBuilder.mjs";
import { REPO_ROOT, tempDir, writeTree } from "./helpers.mjs";

/** A minimal valid plugin config with a worldmonitor block, for unit tests. */
function configData(overrides = {}) {
  return {
    name: "octagon-example",
    version: "1.0.0",
    description: "Example.",
    author: { name: "Octagon AI" },
    homepage: "https://www.octagonai.co/",
    mcp: { serverName: "octagon-example", url: "https://mcp.octagonai.co/example/mcp", tools: ["octagon-example-agent"] },
    interface: { termsOfServiceURL: "https://www.octagonai.co/terms-of-service/", websiteURL: "https://www.octagonai.co/" },
    worldmonitor: {
      name: "Octagon Example",
      icon: "🧪",
      description: "Example data with sources",
      authHint: "secret key from octagonai.co",
      defaultTool: "octagon-example-agent",
      defaultArgs: { prompt: "Hello" },
      defaultTitle: "Example",
    },
    ...overrides,
  };
}

async function loadConfig(t, data) {
  const root = await tempDir(t);
  await writeTree(root, { "plugin.config.json": JSON.stringify(data) });
  return PluginConfig.load(path.join(root, "plugin.config.json"));
}

test("preset: fills every McpPreset field from the block and the plugin's own endpoint", async t => {
  const config = await loadConfig(t, configData());
  const preset = new WorldMonitorCatalogBuilder(config).preset();
  assert.deepEqual(preset, {
    name: "Octagon Example",
    icon: "🧪",
    description: "Example data with sources",
    serverUrl: "https://mcp.octagonai.co/example/mcp",
    authNote: "Requires Authorization: Bearer <OCTAGON_API_KEY> (secret key from octagonai.co)",
    apiKeyHeader: WORLDMONITOR_API_KEY_HEADER,
    defaultTool: "octagon-example-agent",
    defaultArgs: { prompt: "Hello" },
    defaultTitle: "Example",
  });
  assert.equal(WORLDMONITOR_API_KEY_HEADER, "Authorization: Bearer {key}", "the template World Monitor's modal turns into one API-key field");
});

test("preset: a serverUrl override must declare its tools, and the default tool must be among them", async t => {
  const data = configData();
  data.worldmonitor = { ...data.worldmonitor, serverUrl: "https://mcp.octagonai.co/public-markets/mcp" };
  await assert.rejects(loadConfig(t, data), /worldmonitor\.tools must list the tools/);

  data.worldmonitor.tools = ["octagon-agent"];
  await assert.rejects(loadConfig(t, data), /defaultTool "octagon-example-agent" is not among the tools/);

  data.worldmonitor.defaultTool = "octagon-agent";
  const config = await loadConfig(t, data);
  assert.equal(new WorldMonitorCatalogBuilder(config).preset().serverUrl, "https://mcp.octagonai.co/public-markets/mcp");
});

test("preset: config validation catches the fields World Monitor's catalog relies on", async t => {
  for (const [patch, message] of [
    [{ icon: "🧪🧪" }, /icon must be a single emoji/],
    [{ defaultArgs: {} }, /defaultArgs must name at least one argument/],
    [{ tools: ["x"] }, /tools is only meaningful with worldmonitor\.serverUrl/],
    [{ serverUrl: "http://mcp.octagonai.co/mcp", tools: ["octagon-example-agent"] }, /serverUrl must be an https:\/\/ URL/],
    [{ defaultTool: "octagon-other-agent" }, /is not among the tools/],
  ]) {
    const data = configData();
    data.worldmonitor = { ...data.worldmonitor, ...patch };
    await assert.rejects(loadConfig(t, data), message, JSON.stringify(patch));
  }
});

test("preset: a description longer than the catalog card is refused at build time", async t => {
  const data = configData();
  data.worldmonitor.description = "x".repeat(111);
  const config = await loadConfig(t, data);
  assert.throws(() => new WorldMonitorCatalogBuilder(config).preset(), ConfigError);
});

test("renderTypeScript: the object literal matches World Monitor's file style", async t => {
  const config = await loadConfig(t, configData());
  const preset = new WorldMonitorCatalogBuilder(config).preset();
  preset.defaultArgs = { prompt: "Fed's decision", cache: true };
  const ts = WorldMonitorCatalogBuilder.renderTypeScript(preset);
  assert.equal(ts, [
    "  {",
    "    name: 'Octagon Example',",
    "    icon: '🧪',",
    "    description: 'Example data with sources',",
    "    serverUrl: 'https://mcp.octagonai.co/example/mcp',",
    "    authNote: 'Requires Authorization: Bearer <OCTAGON_API_KEY> (secret key from octagonai.co)',",
    "    apiKeyHeader: 'Authorization: Bearer {key}',",
    "    defaultTool: 'octagon-example-agent',",
    "    defaultArgs: { prompt: 'Fed\\'s decision', cache: true },",
    "    defaultTitle: 'Example',",
    "  },",
  ].join("\n"));
});

test("attributionRow: one structured, terms-review row for the shared MCP host", () => {
  const row = WorldMonitorCatalogBuilder.attributionRow({ termsUrl: "https://www.octagonai.co/terms-of-service/", homepage: "https://www.octagonai.co/" });
  assert.equal(row.host, OCTAGON_MCP_HOST);
  assert.equal(row.provider, "Octagon AI");
  assert.equal(row.kind, "structured");
  assert.equal(row.status, "terms-review");
  assert.deepEqual(row.references, [{ path: "src/services/mcp-store.ts" }]);
  assert.match(row.license, /terms-of-service/);
});

test("repository: every profile declares a preset, URLs are unique, hosts are ours, and the committed files match", async () => {
  const paths = layout(REPO_ROOT);
  const presets = [];
  for (const profile of Profile.all(paths.openaiRoot)) {
    const config = await PluginConfig.load(profile.pluginConfig);
    assert.ok(config.data.worldmonitor, `${profile.name} has no worldmonitor block`);
    presets.push(new WorldMonitorCatalogBuilder(config).preset());
  }
  assert.equal(presets.length, 10);
  assert.equal(new Set(presets.map(p => p.serverUrl)).size, presets.length, "World Monitor rejects duplicate serverUrls");
  assert.equal(new Set(presets.map(p => p.name)).size, presets.length);
  for (const preset of presets) {
    assert.equal(new URL(preset.serverUrl).host, OCTAGON_MCP_HOST);
    assert.ok(typeof preset.defaultArgs.prompt === "string" && preset.defaultArgs.prompt.length > 0, `${preset.name} default prompt`);
    assert.doesNotMatch(preset.defaultArgs.prompt, /\b(should I|buy|sell)\b/i, `${preset.name} default prompt asks for advice`);
  }
  const umbrella = presets.find(p => p.name === "Octagon AI");
  assert.equal(umbrella.serverUrl, "https://mcp.octagonai.co/public-markets/mcp", "a polling panel must not reach the full endpoint");
  const pm = presets.find(p => p.name === "Octagon Prediction Markets");
  assert.equal(pm.defaultArgs.cache, true, "a polling panel must read cached reports, never generate");

  const committed = JSON.parse(await readFile(path.join(REPO_ROOT, WORLDMONITOR_PRESETS_PATH), "utf8"));
  assert.deepEqual(committed, { presets }, `run: npm run catalog:worldmonitor`);
  const row = JSON.parse(await readFile(path.join(REPO_ROOT, WORLDMONITOR_MANIFEST_ROW_PATH), "utf8"));
  assert.equal(row.host, OCTAGON_MCP_HOST);
});
