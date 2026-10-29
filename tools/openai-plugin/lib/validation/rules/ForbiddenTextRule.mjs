// @ts-check
import { Rule } from "../Rule.mjs";

/**
 * @typedef {{ regex: RegExp, reason: string, paths?: readonly string[] }} ForbiddenText
 *   `paths` limits the pattern to files whose package path starts with one of
 *   the prefixes; without it the pattern applies to every text file.
 */

/**
 * Fails when any configured pattern survives in shipped text: Claude-specific
 * wording, local-install or API-key setup, references to excluded skills, or
 * trading-advice language. Acts as the safety net behind the transforms.
 */
export class ForbiddenTextRule extends Rule {
  /** @type {readonly ForbiddenText[]} */ #patterns;

  /** @param {readonly ForbiddenText[]} patterns */
  constructor(patterns) {
    super();
    this.#patterns = patterns;
  }

  /** @param {import("../Rule.mjs").ValidationContext} context */
  async check({ pkg }) {
    const findings = [];
    for (const file of pkg.textFiles()) {
      const applicable = this.#patterns.filter(({ paths }) => !paths || paths.some(prefix => file.startsWith(prefix)));
      if (applicable.length === 0) continue;
      const lines = (await pkg.readText(file)).split("\n");
      for (const { regex, reason } of applicable) {
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
