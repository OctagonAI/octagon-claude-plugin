import assert from "node:assert/strict";
import test from "node:test";
import { PluginConfig } from "../../tools/openai-plugin/lib/config/PluginConfig.mjs";
import { ConfigError } from "../../tools/openai-plugin/lib/errors.mjs";
import { ManifestBuilder } from "../../tools/openai-plugin/lib/manifest/ManifestBuilder.mjs";

const BASE = {
  name: "acme",
  version: "1.2.3",
  description: "Acme research.",
  author: { name: "Acme" },
  mcp: { serverName: "acme", url: "https://mcp.example.com/mcp", tools: ["search"] },
  interface: { displayName: "Acme", logo: "./assets/logo.png", composerIcon: "./assets/icon.png" },
};

test("builds the Codex-format manifest with OpenAI extensions", () => {
  const config = new PluginConfig({
    ...BASE,
    onboardingSkill: "get-started",
    review: { commerce: false },
    publication: { countries: ["US"] },
  });
  const builder = new ManifestBuilder(config);

  assert.deepEqual(builder.manifest(), {
    name: "acme",
    version: "1.2.3",
    description: "Acme research.",
    author: { name: "Acme" },
    skills: "./skills/",
    mcpServers: "./.mcp.json",
    interface: BASE.interface,
    extensions: {
      "com.openai": {
        onboardingSkill: "./skills/get-started/SKILL.md",
        review: { commerce: false },
        publication: { countries: ["US"] },
      },
    },
  });
  assert.deepEqual(builder.mcpConfig(), { mcpServers: { acme: { url: "https://mcp.example.com/mcp" } } });
  assert.deepEqual(config.assetPaths(), ["assets/logo.png", "assets/icon.png"]);
});

test("omits the extension block when there is nothing to put in it", () => {
  assert.equal("extensions" in new ManifestBuilder(new PluginConfig(BASE)).manifest(), false);
});

test("config is deeply frozen", () => {
  const config = new PluginConfig(BASE);
  assert.throws(() => {
    // @ts-expect-error verifying runtime immutability
    config.data.mcp.url = "x";
  }, TypeError);
});

test("rejects structurally invalid config", () => {
  const invalid = [
    { ...BASE, name: "" },
    { ...BASE, mcp: { serverName: "acme", url: "https://x" } },
    { ...BASE, interface: { ...BASE.interface, logo: "logo.png" } },
    { ...BASE, interface: { ...BASE.interface, screenshots: ["./assets/s.png"] } },
  ];
  for (const raw of invalid) {
    assert.throws(() => PluginConfig.check(raw, "test"), ConfigError);
  }
});
