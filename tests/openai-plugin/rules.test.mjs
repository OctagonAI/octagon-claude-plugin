import assert from "node:assert/strict";
import test from "node:test";
import { PackageView } from "../../tools/openai-plugin/lib/validation/PackageView.mjs";
import { ArchiveShapeRule } from "../../tools/openai-plugin/lib/validation/rules/ArchiveShapeRule.mjs";
import { BrandColorRule } from "../../tools/openai-plugin/lib/validation/rules/BrandColorRule.mjs";
import { ForbiddenContentRule } from "../../tools/openai-plugin/lib/validation/rules/ForbiddenContentRule.mjs";
import { ForbiddenTextRule } from "../../tools/openai-plugin/lib/validation/rules/ForbiddenTextRule.mjs";
import { ImageRule } from "../../tools/openai-plugin/lib/validation/rules/ImageRule.mjs";
import { LinkIntegrityRule } from "../../tools/openai-plugin/lib/validation/rules/LinkIntegrityRule.mjs";
import { ListingTextRule } from "../../tools/openai-plugin/lib/validation/rules/ListingTextRule.mjs";
import { ManifestShapeRule } from "../../tools/openai-plugin/lib/validation/rules/ManifestShapeRule.mjs";
import { ReviewCasesRule } from "../../tools/openai-plugin/lib/validation/rules/ReviewCasesRule.mjs";
import { SecretScanRule } from "../../tools/openai-plugin/lib/validation/rules/SecretScanRule.mjs";
import { SkillRule } from "../../tools/openai-plugin/lib/validation/rules/SkillRule.mjs";
import { UrlRule } from "../../tools/openai-plugin/lib/validation/rules/UrlRule.mjs";
import { pngHeader, skillText, tempDir, writeTree } from "./helpers.mjs";

const positive = Array.from({ length: 5 }, (_, i) => ({
  description: `case ${i}`,
  prompt: `prompt ${i}`,
  tools_triggered: "search",
  expected_behavior: "works",
}));
const negative = Array.from({ length: 3 }, (_, i) => ({ description: `no ${i}`, prompt: `nope ${i}` }));

/** A package that passes every rule. Each test breaks one thing. */
function validManifest() {
  return {
    name: "acme",
    version: "1.0.0",
    description: "Acme research.",
    author: { name: "Acme", url: "https://acme.example/" },
    skills: "./skills/",
    mcpServers: "./.mcp.json",
    interface: {
      displayName: "Acme",
      shortDescription: "Research made easy",
      longDescription: "Long description.\nSecond line.",
      developerName: "Acme",
      category: "Finance",
      capabilities: ["Search"],
      websiteURL: "https://acme.example/",
      supportURL: "https://acme.example/support",
      privacyPolicyURL: "https://acme.example/privacy",
      termsOfServiceURL: "https://acme.example/terms",
      defaultPrompt: ["Find a thing", "Find another thing"],
      brandColor: "#2357C6",
      brandColorDark: "#8CB4FF",
      logo: "./assets/logo.png",
      composerIcon: "./assets/icon.png",
    },
    extensions: {
      "com.openai": {
        onboardingSkill: "./skills/start/SKILL.md",
        review: {
          test_cases: structuredClone({ positive, negative }),
          demo_recording_url: "https://acme.example/demo",
        },
      },
    },
  };
}

/**
 * @param {import("node:test").TestContext} t
 * @param {{ manifest?: object, files?: Record<string, string | Buffer> }} [overrides]
 */
async function makePackage(t, { manifest = validManifest(), files = {} } = {}) {
  const root = await tempDir(t);
  await writeTree(root, {
    ".codex-plugin/plugin.json": JSON.stringify(manifest),
    ".mcp.json": JSON.stringify({ mcpServers: { acme: { url: "https://mcp.acme.example/mcp" } } }),
    "assets/logo.png": pngHeader(512, 512),
    "assets/icon.png": pngHeader(128, 128),
    "skills/start/SKILL.md": skillText("start", "Start here.", "\n# Start\n\nSee [notes](references/notes.md).\n"),
    "skills/start/references/notes.md": "Notes.",
    ...files,
  });
  return PackageView.load(root);
}

const RULES = [
  new ManifestShapeRule(),
  new ListingTextRule(),
  new UrlRule(),
  new ImageRule(),
  new BrandColorRule(),
  new SkillRule(),
  new LinkIntegrityRule(),
  new ReviewCasesRule({ knownTools: ["search"] }),
  new ForbiddenContentRule(),
  new ForbiddenTextRule([{ regex: /claude/i, reason: "neutral wording" }]),
  new SecretScanRule(),
];

/**
 * @param {import("../../tools/openai-plugin/lib/validation/Rule.mjs").Rule} rule
 * @param {PackageView} pkg
 */
async function errors(rule, pkg) {
  return (await rule.check({ pkg })).filter(finding => finding.severity === "error");
}

test("a well-formed package passes every package rule", async t => {
  const pkg = await makePackage(t);
  for (const rule of RULES) {
    assert.deepEqual(await rule.check({ pkg }), [], rule.id);
  }
});

/** @param {(manifest: ReturnType<typeof validManifest>) => void} mutate */
function mutated(mutate) {
  const manifest = validManifest();
  mutate(manifest);
  return manifest;
}

const FAILURES = [
  ["ManifestShapeRule", { manifest: mutated(m => { m.name = "Acme Plugin"; }) }, "plugin_name_format"],
  ["ManifestShapeRule", { manifest: mutated(m => { m.version = "1.0"; }) }, "plugin_version_not_semver"],
  ["ManifestShapeRule", { manifest: mutated(m => { m.description = "x".repeat(1025); }) }, "plugin_description_too_long"],
  ["ManifestShapeRule", { manifest: mutated(m => { Object.assign(m, { hooks: {} }); }) }, undefined],
  ["ListingTextRule", { manifest: mutated(m => { m.interface.displayName = "x".repeat(31); }) }, "submission_display_name_too_long"],
  ["ListingTextRule", { manifest: mutated(m => { m.interface.shortDescription = "two\nlines"; }) }, "submission_subtitle_character_unsupported"],
  ["ListingTextRule", { manifest: mutated(m => { m.interface.defaultPrompt = ["Ask @acme", "b"]; }) }, "plugin_default_prompt_mention"],
  ["ListingTextRule", { manifest: mutated(m => { m.interface.defaultPrompt = ["Same  prompt", "same prompt"]; }) }, "plugin_default_prompt_duplicate"],
  ["UrlRule", { manifest: mutated(m => { m.interface.supportURL = "http://acme.example/support"; }) }, undefined],
  ["UrlRule", { manifest: mutated(m => { delete m.interface.privacyPolicyURL; }) }, undefined],
  ["ImageRule", { files: { "assets/logo.png": pngHeader(512, 256) } }, undefined],
  ["ImageRule", { files: { "assets/icon.png": pngHeader(32, 32) } }, undefined],
  ["BrandColorRule", { manifest: mutated(m => { m.interface.brandColor = "#EEEEEE"; }) }, undefined],
  ["SkillRule", { files: { "skills/start/SKILL.md": skillText("other", "Start here.") } }, undefined],
  ["SkillRule", { files: { "skills/empty/notes.md": "x" } }, "skill_manifest_missing"],
  ["SkillRule", { files: { "skills/start/nested/SKILL.md": skillText("nested", "x") } }, "skill_manifest_nested"],
  ["LinkIntegrityRule", { files: { "skills/start/references/notes.md": "[gone](mcp-setup.md)" } }, undefined],
  ["ReviewCasesRule", { manifest: mutated(m => { m.extensions["com.openai"].review.test_cases.positive.pop(); }) }, undefined],
  ["ReviewCasesRule", { manifest: mutated(m => { m.extensions["com.openai"].review.test_cases.positive[0].tools_triggered = "unknown"; }) }, undefined],
  ["ReviewCasesRule", { manifest: mutated(m => { Object.assign(m.extensions["com.openai"].review, { test_credentials: "x" }); }) }, undefined],
  ["ForbiddenContentRule", { files: { "hooks/hooks.json": "{}" } }, undefined],
  ["ForbiddenContentRule", { files: { "skills/start/.env": "X=1" } }, undefined],
  ["ForbiddenTextRule", { files: { "skills/start/references/notes.md": "Configure Claude Desktop" } }, undefined],
  ["SecretScanRule", { files: { "skills/start/references/notes.md": "key: sk-abcdefghijklmnopqrstuvwxyz123456" } }, undefined],
];

for (const [ruleId, overrides, code] of FAILURES) {
  test(`${ruleId} rejects ${JSON.stringify(Object.keys(overrides.files ?? {})[0] ?? code ?? "an invalid manifest")}`, async t => {
    const rule = RULES.find(candidate => candidate.id === ruleId);
    assert.ok(rule);
    const found = await errors(rule, await makePackage(t, overrides));
    assert.ok(found.length > 0, `${ruleId} should report an error`);
    if (code) assert.ok(found.some(finding => finding.code === code), `expected ${code}, got ${found.map(f => f.code)}`);
  });
}

test("SecretScanRule ignores placeholders", async t => {
  const pkg = await makePackage(t, { files: { "skills/start/references/notes.md": 'api_key: "<your-api-key>"' } });
  assert.deepEqual(await new SecretScanRule().check({ pkg }), []);
});

test("ReviewCasesRule warns, without failing, when the demo video is missing", async t => {
  const pkg = await makePackage(t, { manifest: mutated(m => { delete m.extensions["com.openai"].review.demo_recording_url; }) });
  const findings = await new ReviewCasesRule({ knownTools: ["search"] }).check({ pkg });
  assert.deepEqual(findings.map(finding => finding.severity), ["warning"]);
});

test("UrlRule online mode reports unreachable URLs", async t => {
  const pkg = await makePackage(t);
  const rule = new UrlRule({ online: true, fetcher: async url => ({ ok: !url.endsWith("/terms"), status: 404 }) });
  const found = await rule.check({ pkg });
  assert.equal(found.length, 1);
  assert.match(found[0].message, /termsOfServiceURL returned HTTP 404/);
});

test("ArchiveShapeRule checks parity with staging and path safety", async t => {
  const pkg = await makePackage(t);
  const rule = new ArchiveShapeRule();
  const archive = { path: "x.zip", bytes: 10, sha256: "", entries: [...pkg.files] };
  assert.deepEqual(rule.check({ pkg, archive }), []);
  assert.ok(rule.check({ pkg, archive: { ...archive, entries: [...pkg.files, "../evil"] } }).length >= 2);
  assert.ok(rule.check({ pkg, archive: { ...archive, entries: pkg.files.filter(f => !f.startsWith(".codex")) } }).length >= 2);
});
