// @ts-check
import { KimiManifestBuilder } from "./KimiManifestBuilder.mjs";

/** @typedef {import("../config/PluginConfig.mjs").PluginConfig} PluginConfig */

/**
 * Writes `SYSTEM.md`, the instructions Kimi Code appends to the agent's
 * system prompt while the plugin is enabled (the Kimi web app runs skills and
 * MCP only and ignores it, harmlessly). Short by design: which tools exist,
 * that answers cite sources, how sign-in works on this host, what the plugin
 * will not do, and where to send questions the other Octagon plugin owns.
 */
export class KimiSystemPromptBuilder {
  /** @type {PluginConfig} */ #config;

  /** @param {PluginConfig} config */
  constructor(config) {
    this.#config = config;
  }

  /** @returns {string} */
  systemPrompt() {
    const config = this.#config.data;
    const listing = this.#config.listing();
    const kimi = this.#config.kimi();
    const manifest = new KimiManifestBuilder(this.#config);
    const serverName = manifest.serverName();
    const tools = manifest.exposedTools();

    const lines = [
      `# ${manifest.displayName()}`,
      "",
      config.description,
      "",
      "## Tools",
      "",
      `This plugin connects one remote MCP server, \`${serverName}\`, which exposes: ${tools.map(tool => `\`${tool}\``).join(", ")}. Use them for any question in this plugin's scope instead of answering from memory.`,
      "",
      "## Rules",
      "",
      "- Every answer cites the sources the tool returned. Keep each citation; never invent one.",
      `- Sign-in: the first tool call asks the user to authorize Octagon in the browser (OAuth). If a tool reports 401 or "unauthorized", ask the user to complete the Octagon sign-in from the \`${serverName}\` server's prompt in \`/plugins\` and retry. Never ask for passwords or tokens in the conversation.`,
      "- All tools are read-only research tools; none of them changes anything on the user's behalf.",
      `- ${listing.scopeNote}`,
      ...(kimi.systemPromptNotes ?? []).map(note => `- ${note}`),
      "",
    ];
    return lines.join("\n");
  }
}

/**
 * @param {string} text
 * @returns {number} UTF-8 size, which is what Kimi's 32 KB cap measures.
 */
export function utf8Bytes(text) {
  return Buffer.byteLength(text, "utf8");
}
