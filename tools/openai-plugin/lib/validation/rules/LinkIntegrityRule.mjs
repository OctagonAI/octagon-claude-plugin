// @ts-check
import path from "node:path";
import { SKILLS_DIR } from "../../manifest/ManifestBuilder.mjs";
import { relativeLinks } from "../../skill/markdown.mjs";
import { Rule } from "../Rule.mjs";

/**
 * Relative links in skill Markdown must resolve to files inside the package.
 * This catches references to files that a transform removed.
 */
export class LinkIntegrityRule extends Rule {
  /** @param {import("../Rule.mjs").ValidationContext} context */
  async check({ pkg }) {
    const findings = [];
    const markdown = pkg.files.filter(file => file.startsWith(`${SKILLS_DIR}/`) && file.endsWith(".md"));
    for (const file of markdown) {
      for (const link of relativeLinks(await pkg.readText(file))) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), link));
        if (target.startsWith("..") || !(pkg.has(target) || pkg.files.some(candidate => candidate.startsWith(`${target}/`)))) {
          findings.push(this.error(`broken relative link: ${link}`, { path: file }));
        }
      }
    }
    return findings;
  }
}
