// @ts-check
import { GROK_PLUGINS_DIR } from "./GrokManifestBuilder.mjs";

/** @typedef {import("../config/PluginConfig.mjs").PluginConfig} PluginConfig */
/** @typedef {import("../skill/SkillDocument.mjs").SkillDocument} SkillDocument */

/**
 * Writes the README that ships inside a Grok plugin directory.
 *
 * Marketplace reviewers read the README first and audit against it, so it is
 * generated from the same config the manifest comes from: what the plugin
 * does, exactly which components it ships, every network endpoint it talks to,
 * what credentials it needs, and how to try it. Nothing here is hand-edited.
 */
export class GrokReadmeBuilder {
  /** @type {PluginConfig} */ #config;

  /** @param {PluginConfig} config */
  constructor(config) {
    this.#config = config;
  }

  /**
   * @param {{ skills: readonly SkillDocument[] }} context
   * @returns {string}
   */
  readme({ skills }) {
    const config = this.#config.data;
    const grok = this.#config.grok();
    const listing = /** @type {Record<string, unknown>} */ (config.interface);
    const title = typeof listing.displayName === "string" ? listing.displayName : config.name;
    const sorted = [...skills].sort((a, b) => a.name.localeCompare(b.name));
    const oauthHost = new URL(grok.oauthUrl).host;
    const mcpHost = new URL(config.mcp.url).host;

    const lines = [
      `# ${title} for Grok Build`,
      "",
      config.description,
      "",
      grok.readmeIntro,
      "",
      `Everything the plugin does goes through one hosted MCP server. It ships no scripts, hooks, agents, commands, or local executables.`,
      "",
      "## Components",
      "",
      `- **${sorted.length} skills** (\`skills/<name>/SKILL.md\`), listed below.`,
      `- **1 MCP server** (\`.mcp.json\`): \`${config.mcp.serverName}\`, HTTP transport, \`${config.mcp.url}\`.`,
      "- No hooks, no subagents, no slash commands, no LSP servers.",
      "",
      "## Network endpoints",
      "",
      "The plugin contacts only these hosts:",
      "",
      `| Host | Purpose |`,
      `|---|---|`,
      `| \`${mcpHost}\` | MCP server (\`${config.mcp.url}\`); receives prompts and tool arguments, returns cited results |`,
      `| \`${oauthHost}\` | OAuth authorization server (\`${grok.oauthUrl}\`); sign-in on first tool use |`,
      "",
      "No other endpoint is called. The plugin sends no telemetry of its own.",
      "",
      "## Credentials",
      "",
      "- Authentication is browser OAuth with an Octagon account; Grok Build opens the sign-in page the first time a tool is called.",
      "- The plugin reads no keys, tokens, environment variables, or local files.",
      "- Disconnect at any time from Grok Build's MCP settings (`/mcps`); revoking the OAuth grant on the Octagon side has the same effect.",
      "",
      "## Data flow",
      "",
      "Your prompt and the tool arguments the model derives from it are sent to the Octagon MCP server; the server returns research results with their sources. Results are shown in the session and are not stored by the plugin.",
      "",
      "## Install",
      "",
      "From the xAI marketplace inside Grok Build:",
      "",
      "```bash",
      `grok plugin install ${config.name} --trust`,
      "```",
      "",
      "From a checkout of this repository, for testing before the marketplace entry exists:",
      "",
      "```bash",
      `grok --plugin-dir ${GROK_PLUGINS_DIR}/${config.name}`,
      "```",
      "",
      "`--trust` is Grok Build's confirmation that the plugin's MCP server may run; it is required for every plugin that ships one.",
      "",
      "## Try it",
      "",
      ...grok.smokeTests.flatMap(({ prompt, expect }) => [`- \`${prompt}\``, `  Expected: ${expect}`]),
      "",
      "## Skills",
      "",
      "| Skill | What it does |",
      "|---|---|",
      ...sorted.map(skill => `| \`${skill.name}\` | ${oneLine(skill.description)} |`),
      "",
      "## Scope",
      "",
      grok.scopeNote,
      "",
      "## License and support",
      "",
      `- License: ${config.license ?? "see LICENSE"} (see \`LICENSE\`).`,
      `- Homepage: ${config.homepage ?? ""}`,
      `- Support: ${stringField(listing, "supportURL")}`,
      `- Privacy policy: ${stringField(listing, "privacyPolicyURL")}`,
      `- Terms of service: ${stringField(listing, "termsOfServiceURL")}`,
      "",
      "This directory is generated from the plugin's config and skill catalog by the packaging tool in this repository; edit the sources, not these files.",
      "",
    ];
    return lines.join("\n");
  }
}

/**
 * @param {string} text
 * @returns {string}
 */
function oneLine(text) {
  return text.replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
}

/**
 * @param {Record<string, unknown>} object
 * @param {string} key
 * @returns {string}
 */
function stringField(object, key) {
  const value = object[key];
  return typeof value === "string" ? value : "";
}
