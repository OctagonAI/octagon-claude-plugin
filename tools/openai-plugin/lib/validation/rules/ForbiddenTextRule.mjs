// @ts-check
import { Rule } from "../Rule.mjs";

/**
 * Fails when any configured pattern survives in shipped text: Claude-specific
 * wording, local-install or API-key setup, references to excluded skills, or
 * trading-advice language. Acts as the safety net behind the transforms.
 */
export class ForbiddenTextRule extends Rule {
  /** @type {readonly { regex: RegExp, reason: string }[]} */ #patterns;

  /** @param {readonly { regex: RegExp, reason: string }[]} patterns */
  constructor(patterns) {
    super();
    this.#patterns = patterns;
  }

  /** @param {import("../Rule.mjs").ValidationContext} context */
  async check({ pkg }) {
    const findings = [];
    for (const file of pkg.textFiles()) {
      const lines = (await pkg.readText(file)).split("\n");
      for (const { regex, reason } of this.#patterns) {
        const line = lines.findIndex(text => regex.test(text));
        if (line !== -1) {
          const match = lines[line].match(regex)?.[0];
          findings.push(this.error(`${reason} (found "${match}")`, { path: `${file}:${line + 1}` }));
        }
      }
    }
    return findings;
  }
}
