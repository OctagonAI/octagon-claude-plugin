// @ts-check
import { GEMINI_CONTEXT_MAX_WORDS, wordCount } from "../../../manifest/GeminiContextBuilder.mjs";
import { GEMINI_CONTEXT_PATH } from "../../../manifest/GeminiManifestBuilder.mjs";
import { Rule } from "../../Rule.mjs";

/**
 * `GEMINI.md` loads into every session, so it must exist, stay short, name
 * every tool the extension exposes, and carry the three standing rules:
 * cite, how to sign in, and research only.
 */
export class GeminiContextRule extends Rule {
  /** @type {readonly string[]} */ #tools;

  /** @param {{ tools: readonly string[] }} options The tools the extension exposes after its allow-list. */
  constructor({ tools }) {
    super();
    this.#tools = tools;
  }

  /** @param {import("../../Rule.mjs").ValidationContext} context */
  async check({ pkg }) {
    const at = { path: GEMINI_CONTEXT_PATH };
    if (!pkg.has(GEMINI_CONTEXT_PATH)) return [this.error("GEMINI.md is required; it carries the standing rules", at)];
    const text = await pkg.readText(GEMINI_CONTEXT_PATH);
    const findings = [];

    const words = wordCount(text);
    if (words > GEMINI_CONTEXT_MAX_WORDS) {
      findings.push(this.error(`GEMINI.md is ${words} words; it loads into every session, keep it at most ${GEMINI_CONTEXT_MAX_WORDS}`, at));
    }
    for (const tool of this.#tools) {
      if (!text.includes(`\`${tool}\``)) findings.push(this.error(`GEMINI.md must name the tool "${tool}"`, at));
    }
    for (const [needle, why] of [
      ["cite", "the citation rule"],
      ["/mcp auth", "how to sign in"],
      ["read-only", "that tools are read-only"],
    ]) {
      if (!text.toLowerCase().includes(needle)) findings.push(this.error(`GEMINI.md must state ${why} ("${needle}")`, at));
    }
    return findings;
  }
}
