// @ts-check
import { KIMI_MANIFEST_PATH, KIMI_PLUGINS_DIR, KIMI_SYSTEM_PROMPT_PATH, KimiManifestBuilder } from "./KimiManifestBuilder.mjs";
import { licenseAndSupportLines, skillsTable, smokeTestLines, sortedSkills } from "./readmeSections.mjs";

/** @typedef {import("../config/PluginConfig.mjs").PluginConfig} PluginConfig */
/** @typedef {import("../skill/SkillDocument.mjs").SkillDocument} SkillDocument */

/**
 * Writes the README that ships in a Kimi plugin repository.
 *
 * The repository is a generated mirror, so the README is the whole story for
 * Moonshot's reviewers and for anyone who lands on it: what the plugin does,
 * what it ships, the one server it talks to, how sign-in works, how to install
 * it in Kimi Code and import it into the Kimi app, what to try, and where the
 * source lives.
 */
export class KimiReadmeBuilder {
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
    const kimi = this.#config.kimi();
    const manifest = new KimiManifestBuilder(this.#config);
    const serverName = manifest.serverName();
    const mcpUrl = manifest.mcpUrl();
    const tools = manifest.exposedTools();
    const locales = manifest.translatedLocales();
    const ui = /** @type {Record<string, unknown>} */ (config.interface);
    const title = manifest.displayName();
    const sorted = sortedSkills(skills);
    const oauthHost = new URL(listing.oauthUrl).host;
    const mcpHost = new URL(mcpUrl).host;

    const lines = [
      `# ${title} for Kimi`,
      "",
      config.description,
      "",
      listing.readmeIntro,
      "",
      "Everything the plugin does goes through one hosted MCP server. It ships no scripts, hooks, commands, agents, or local executables, and it reads no keys or environment variables.",
      "",
      "## Install",
      "",
      "Kimi Code (CLI or Desktop):",
      "",
      "```",
      `/plugins install ${kimi.repository}`,
      "/reload",
      "```",
      "",
      `Kimi app (Kimi Work desktop): type \`/\`, open **Plugin Builder**, paste \`${kimi.repository}\`, then install the plugin from **Plugins → Personal**.`,
      "",
      `The first tool call asks you to sign in to Octagon in the browser (OAuth); the plugin manager shows the \`${serverName}\` server's authorization state under \`/plugins\`. Every tool is read-only. OAuth needs a browser, so headless sessions without one cannot authorize.`,
      "",
      "## Components",
      "",
      `- **${sorted.length} skills** (\`skills/<name>/SKILL.md\`), listed below.`,
      `- **1 MCP server** (\`${KIMI_MANIFEST_PATH}\`): \`${serverName}\`, Streamable HTTP, \`${mcpUrl}\`, exposing ${tools.map(tool => `\`${tool}\``).join(", ")}.`,
      `- **1 system-prompt file** (\`${KIMI_SYSTEM_PROMPT_PATH}\`): standing rules on citations, sign-in, and scope, loaded while the plugin is enabled.`,
      `- **Display text in ${["en-US", ...locales].join(" and ")}** (\`interface\` in the manifest, \`locales/<locale>.json\`).`,
      "- No hooks, no commands, no sub-agents.",
      "",
      "## Network endpoints",
      "",
      "The plugin contacts only these hosts:",
      "",
      "| Host | Purpose |",
      "|---|---|",
      `| \`${mcpHost}\` | MCP server (\`${mcpUrl}\`); receives prompts and tool arguments, returns cited results |`,
      `| \`${oauthHost}\` | OAuth authorization server (\`${listing.oauthUrl}\`); sign-in on first tool use, discovered by Kimi from the server's metadata |`,
      "",
      "No other endpoint is called. The plugin sends no telemetry of its own.",
      "",
      "## Credentials",
      "",
      "- Authentication is browser OAuth with an Octagon account (free tier available), using Kimi's native MCP OAuth with dynamic client registration.",
      "- The plugin declares no headers, tokens, environment variables, or local files.",
      `- Tokens live in Kimi's own credential store (Kimi Code keeps MCP OAuth credentials under \`~/.kimi-code/credentials/mcp/\`, separate from the plugin files). To disconnect, revoke the \`${serverName}\` server's authorization from the plugin manager (\`/plugins\`, then M on the installed plugin) or revoke the grant on the Octagon side; removing the plugin alone does not delete a stored token.`,
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
      `This repository is a generated mirror of \`${KIMI_PLUGINS_DIR}/${config.name}/\` in Octagon's plugin source repository (github.com/OctagonAI); releases are tagged \`v<version>\` from there and carry the plugin as a ZIP asset. Report issues and propose changes in that repository, not here.`,
      "",
    ];
    return lines.join("\n");
  }
}
