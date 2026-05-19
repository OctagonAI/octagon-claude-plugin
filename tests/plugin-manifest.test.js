import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function readText(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("plugin manifest exposes the bundled MCP runtime and required config", () => {
  const pluginManifest = readJson(".claude-plugin/plugin.json");
  const mcpConfig = readJson(".claude-plugin/mcp.json");
  const marketplaceManifest = readJson(".claude-plugin/marketplace.json");

  assert.equal(pluginManifest.name, "octagon-claude-plugin");
  assert.equal(pluginManifest.mcpServers, "./.claude-plugin/mcp.json");
  assert.ok(!("hooks" in pluginManifest));
  assert.equal(pluginManifest.userConfig.api_key.required, true);
  assert.equal(pluginManifest.userConfig.api_key.sensitive, true);
  assert.equal(
    pluginManifest.userConfig.api_base_url.default,
    "https://api.octagonagents.com/v1",
  );
  assert.equal(marketplaceManifest.name, "octagon-claude-plugins");
  assert.equal(marketplaceManifest.version, "0.1.0");
  assert.ok(!("version" in marketplaceManifest.plugins[0]));

  assert.deepEqual(mcpConfig.mcpServers["octagon-claude-plugin"], {
    command: "node",
    args: ["${CLAUDE_PLUGIN_ROOT}/dist/plugin-runtime.cjs"],
    env: {
      OCTAGON_API_KEY: "${user_config.api_key}",
      OCTAGON_API_BASE_URL: "${user_config.api_base_url}",
    },
  });
});

test("plugin package publishes Claude plugin assets alongside dist output", () => {
  const packageJson = readJson("package.json");

  for (const requiredEntry of [
    ".claude-plugin",
    "agents",
    "dist",
    "hooks",
    "scripts",
    "skills",
  ]) {
    assert.ok(packageJson.files.includes(requiredEntry));
  }

  assert.equal(packageJson.scripts["validate:plugin"], "claude plugin validate .");
  assert.equal(packageJson.scripts["validate:all"], "npm test && npm run validate:plugin");
});

test("skills catalog includes the full upstream Octagon skill set", () => {
  const expectedSkillNames = [
    "octagon-analyst-master",
    "financial-analyst-master",
    "earnings-analyst-master",
    "market-analyst-master",
    "sec-analyst-master",
    "analyst-estimates",
    "balance-sheet",
    "balance-sheet-growth",
    "batch-market-cap",
    "cash-flow-growth",
    "cash-flow-statement",
    "commodities-list",
    "commodities-quote",
    "company-market-cap",
    "earnings-analyst-questions",
    "prediction-markets-analysis",
    "earnings-call-analysis",
    "earnings-call-insights",
    "earnings-capital-allocation",
    "earnings-competitive-review",
    "earnings-conf-call-sentiment",
    "earnings-cost-mgmt",
    "earnings-financial-guidance",
    "earnings-market-expansion",
    "earnings-mgmt-comments",
    "earnings-product-pipeline",
    "earnings-qa-analysis",
    "earnings-revenue-guidance",
    "esg-benchmark-comparison",
    "esg-ratings",
    "financial-growth",
    "financial-health-scores",
    "financial-metrics-analysis",
    "forex-list",
    "historical-financial-ratings",
    "historical-market-cap",
    "income-statement",
    "income-statement-growth",
    "industry-pe-ratios",
    "industry-performance-snapshot",
    "octagon-api-smoke-test",
    "price-target-consensus",
    "price-target-summary",
    "ratings-snapshot",
    "revenue-geographic-segmentation",
    "revenue-product-segmentation",
    "sec-10k-analysis",
    "sec-10q-analysis",
    "sec-8k-analysis",
    "sec-amendments-review",
    "sec-annual-comparison",
    "sec-business-desc-analysis",
    "sec-cash-flow-review",
    "sec-corp-governance",
    "sec-debt-covenant",
    "sec-footnotes-analysis",
    "sec-mda-analysis",
    "sec-proxy-analysis",
    "sec-risk-factors",
    "sec-s1-analysis",
    "sec-segment-reporting",
    "sector-pe-ratios",
    "sector-performance-snapshot",
    "stock-grades",
    "stock-historical-index",
    "stock-performance",
    "stock-price-change",
    "stock-quote",
  ];

  const skillNames = readdirSync(path.join(repoRoot, "skills"), {
    withFileTypes: true,
  })
    .filter(entry => entry.isDirectory())
    .filter(entry => existsSync(path.join(repoRoot, "skills", entry.name, "SKILL.md")))
    .map(entry => entry.name)
    .sort();

  assert.deepEqual(skillNames, [...expectedSkillNames].sort());

  for (const skillName of expectedSkillNames) {
    const skillPath = path.join(repoRoot, "skills", skillName, "SKILL.md");
    assert.ok(existsSync(skillPath), `${skillName} skill should exist`);
    const skillText = readText(path.join("skills", skillName, "SKILL.md"));
    assert.match(skillText, new RegExp(`name: ${skillName}`));
    assert.doesNotMatch(skillText, /server": "octagon-mcp"/);
  }

  for (const skillName of [
    "analyst-estimates",
    "price-target-consensus",
    "sec-10q-analysis",
    "stock-quote",
  ]) {
    const skillText = readText(path.join("skills", skillName, "SKILL.md"));
    assert.match(skillText, /server": "octagon-claude-plugin"/);
  }
});

test("routing agent and session-start hook are wired into the plugin", () => {
  const hooksConfig = readJson("hooks/hooks.json");
  const agentPath = path.join(
    repoRoot,
    "agents",
    "claude-octagon-coordinator.md",
  );
  const hookScriptPath = path.join(repoRoot, "scripts", "plugin-session-start.sh");
  const agentText = readText(path.join("agents", "claude-octagon-coordinator.md"));

  assert.ok(existsSync(agentPath));
  assert.ok(existsSync(hookScriptPath));
  assert.equal(
    hooksConfig.hooks.SessionStart[0].hooks[0].command,
    "\"${CLAUDE_PLUGIN_ROOT}\"/scripts/plugin-session-start.sh",
  );
  assert.match(agentText, /name: claude-octagon-coordinator/);
  assert.match(agentText, /octagon-analyst-master/);
});
