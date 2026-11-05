// @ts-check
import { KIMI_SYSTEM_PROMPT_MAX_BYTES, KIMI_SYSTEM_PROMPT_PATH } from "../../../manifest/KimiManifestBuilder.mjs";
import { utf8Bytes } from "../../../manifest/KimiSystemPromptBuilder.mjs";
import { Rule } from "../../Rule.mjs";

/**
 * `SYSTEM.md` is appended to the agent's system prompt while the plugin is
 * enabled, so it must exist, fit Kimi's per-field 32 KB cap with room to
 * spare, decode as UTF-8, name every tool the plugin exposes, and carry the
 * three standing rules: cite, how to sign in, and read-only.
 */
export class KimiSystemPromptRule extends Rule {
  /** @type {readonly string[]} */ #tools;

  /** @param {{ tools: readonly string[] }} options The tools the plugin exposes after its allow-list. */
  constructor({ tools }) {
    super();
    this.#tools = tools;
  }

  /** @param {import("../../Rule.mjs").ValidationContext} context */
  async check({ pkg }) {
    const at = { path: KIMI_SYSTEM_PROMPT_PATH };
    if (!pkg.has(KIMI_SYSTEM_PROMPT_PATH)) return [this.error(`${KIMI_SYSTEM_PROMPT_PATH} is required; it carries the standing rules`, at)];
    const bytes = await pkg.readBytes(KIMI_SYSTEM_PROMPT_PATH);
    const findings = [];

    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return [this.error("must be valid UTF-8; Kimi ignores a file it cannot decode", at)];
    }
    const size = utf8Bytes(text);
    if (size > KIMI_SYSTEM_PROMPT_MAX_BYTES) {
      findings.push(this.error(`is ${size} bytes; Kimi ignores a system-prompt file over ${KIMI_SYSTEM_PROMPT_MAX_BYTES} bytes`, at));
    } else if (size > KIMI_SYSTEM_PROMPT_MAX_BYTES / 4) {
      findings.push(this.warning(`is ${size} bytes; every enabled plugin shares a 64 KB budget, keep it short`, at));
    }
    for (const tool of this.#tools) {
      if (!text.includes(`\`${tool}\``)) findings.push(this.error(`must name the tool "${tool}"`, at));
    }
    for (const [needle, why] of [
      ["cite", "the citation rule"],
      ["sign-in", "how to sign in"],
      ["read-only", "that tools are read-only"],
    ]) {
      if (!text.toLowerCase().includes(needle)) findings.push(this.error(`must state ${why} ("${needle}")`, at));
    }
    return findings;
  }
}
