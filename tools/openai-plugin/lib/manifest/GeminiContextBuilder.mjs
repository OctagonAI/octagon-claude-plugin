// @ts-check
import { GeminiManifestBuilder } from "./GeminiManifestBuilder.mjs";

/** @typedef {import("../config/PluginConfig.mjs").PluginConfig} PluginConfig */

/** Hard ceiling for the context file; Gemini CLI loads it into every session. */
export const GEMINI_CONTEXT_MAX_WORDS = 250;

/**
 * Writes `GEMINI.md`, the standing instructions Gemini CLI loads whenever the
 * extension is enabled. It is short by design: which tools exist and what
 * they return, that answers cite sources, how sign-in works, what the plugin
 * will not do, and where to send questions the other Octagon extension owns.
 * Antigravity CLI imports the same file as a rule.
 */
export class GeminiContextBuilder {
  /** @type {PluginConfig} */ #config;

  /** @param {PluginConfig} config */
  constructor(config) {
    this.#config = config;
  }

  /** @returns {string} */
  context() {
    const config = this.#config.data;
    const listing = this.#config.listing();
    const gemini = this.#config.gemini();
    const manifest = new GeminiManifestBuilder(this.#config);
    const serverName = manifest.serverName();
    const tools = manifest.exposedTools();
    const ui = /** @type {Record<string, unknown>} */ (config.interface);
    const title = typeof ui.displayName === "string" ? ui.displayName : config.name;

    const lines = [
      `# ${title}`,
      "",
      config.description,
      "",
      "## Tools",
      "",
      `This extension connects one remote MCP server, \`${serverName}\`, which exposes: ${tools.map(tool => `\`${tool}\``).join(", ")}. Use them for any question in this extension's scope instead of answering from memory.`,
      "",
      "## Rules",
      "",
      "- Every answer cites the sources the tool returned. Keep each citation; never invent one.",
      `- Sign-in: tools return 401 until the user has authorized once. Tell them to run \`/mcp auth ${serverName}\`; the browser opens the Octagon sign-in page.`,
      "- All tools are read-only research tools, so it is safe to choose \"always allow\" at the tool-call confirmation.",
      `- ${listing.scopeNote}`,
      ...(gemini.contextNotes ?? []).map(note => `- ${note}`),
      "",
    ];
    return lines.join("\n");
  }
}

/**
 * @param {string} text
 * @returns {number}
 */
export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}
