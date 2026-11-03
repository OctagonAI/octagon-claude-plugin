// @ts-check
import { GEMINI_EXTENSIONS_DIR, GeminiManifestBuilder } from "./GeminiManifestBuilder.mjs";
import { licenseAndSupportLines, skillsTable, smokeTestLines, sortedSkills } from "./readmeSections.mjs";

/** @typedef {import("../config/PluginConfig.mjs").PluginConfig} PluginConfig */
/** @typedef {import("../skill/SkillDocument.mjs").SkillDocument} SkillDocument */

/**
 * Writes the README that ships in a Gemini CLI extension repository.
 *
 * The repository is a generated mirror, so the README is the whole story for
 * anyone who lands on it: what the extension does, what it ships, the one
 * server it talks to, how sign-in works, how to install it in Gemini CLI and
 * Antigravity CLI, what to try, and where the source lives.
 */
export class GeminiReadmeBuilder {
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
    const listing = this.#config.listing();
    const gemini = this.#config.gemini();
    const manifest = new GeminiManifestBuilder(this.#config);
    const serverName = manifest.serverName();
    const tools = manifest.exposedTools();
    const ui = /** @type {Record<string, unknown>} */ (config.interface);
    const title = typeof ui.displayName === "string" ? ui.displayName : config.name;
    const sorted = sortedSkills(skills);
    const oauthHost = new URL(listing.oauthUrl).host;
    const mcpHost = new URL(config.mcp.url).host;

    const lines = [
      `# ${title} for Gemini CLI`,
      "",
      config.description,
      "",
      listing.readmeIntro,
      "",
      "Everything the extension does goes through one hosted MCP server. It ships no scripts, hooks, commands, agents, or local executables, and it reads no keys or environment variables.",
      "",
      "## Install",
      "",
      "Gemini CLI:",
      "",
      "```bash",
      `gemini extensions install ${gemini.repository}`,
      "```",
      "",
      "Antigravity CLI (installs Gemini CLI extensions that use a remote MCP server, as this one does):",
      "",
      "```bash",
      `agy plugin install ${gemini.repository}`,
      "```",
      "",
      `The first tool call returns 401 until you sign in once: run \`/mcp auth ${serverName}\` and complete the Octagon sign-in in the browser. Gemini CLI asks you to confirm each tool call; every tool here is read-only, so "always allow" is safe. OAuth needs a local browser, so headless and SSH sessions without one cannot authorize.`,
      "",
      "## Components",
      "",
      `- **${sorted.length} skills** (\`skills/<name>/SKILL.md\`), listed below.`,
      `- **1 MCP server** (\`gemini-extension.json\`): \`${serverName}\`, Streamable HTTP, \`${config.mcp.url}\`, exposing ${tools.map(tool => `\`${tool}\``).join(", ")}.`,
      "- **1 context file** (`GEMINI.md`): standing rules on citations, sign-in, and scope.",
      "- No hooks, no commands, no sub-agents, no policies, no themes.",
      "",
      "## Network endpoints",
      "",
      "The extension contacts only these hosts:",
      "",
      "| Host | Purpose |",
      "|---|---|",
      `| \`${mcpHost}\` | MCP server (\`${config.mcp.url}\`); receives prompts and tool arguments, returns cited results |`,
      `| \`${oauthHost}\` | OAuth authorization server (\`${listing.oauthUrl}\`); sign-in on first tool use, discovered by Gemini CLI from the server's metadata |`,
      "",
      "No other endpoint is called. The extension sends no telemetry of its own.",
      "",
      "## Credentials",
      "",
      "- Authentication is browser OAuth with an Octagon account (free tier available), using Gemini CLI's automatic OAuth discovery and dynamic client registration.",
      "- The extension declares no settings and reads no keys, tokens, environment variables, or local files.",
      "- Tokens live in Gemini CLI's own token store; revoke the grant on the Octagon side or uninstall the extension to disconnect.",
      "",
      "## Try it",
      "",
      ...smokeTestLines(listing.smokeTests),
      "",
      "## Skills",
      "",
      ...skillsTable(sorted),
      "",
      "## Scope",
      "",
      listing.scopeNote,
      "",
      "## License and support",
      "",
      ...licenseAndSupportLines(config, ui),
      "",
      "## About this repository",
      "",
      // The source repository is named without its URL: its name carries a
      // provider word the neutral-wording guard rejects, and the organization
      // page lists it in any case.
      `This repository is a generated mirror of \`${GEMINI_EXTENSIONS_DIR}/${config.name}/\` in Octagon's plugin source repository (github.com/OctagonAI); releases are tagged \`v<version>\` from there. Report issues and propose changes in that repository, not here.`,
      "",
    ];
    return lines.join("\n");
  }
}
