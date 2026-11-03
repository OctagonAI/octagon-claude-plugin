// @ts-check
import { Rule } from "../../Rule.mjs";

const README = "README.md";

/**
 * The README must declare what reviewers audit against: the MCP endpoint,
 * the credential model, every skill, and the license. A plugin that explains
 * itself is the one that merges on the first pass.
 */
export class ReadmeDeclarationRule extends Rule {
  /** @type {(pkg: import("../../PackageView.mjs").PackageView) => string[]} */ #endpoints;
  /** @type {readonly [string, string][]} */ #required;

  /**
   * @param {{
   *   endpoints: (pkg: import("../../PackageView.mjs").PackageView) => string[],
   *   required?: readonly [string, string][],
   * }} options `endpoints` reads the MCP URLs the package declares (each
   *   platform keeps them in a different file); `required` lists
   *   `[needle, what it proves]` pairs the README must contain.
   */
  constructor({ endpoints, required = DEFAULT_REQUIRED }) {
    super();
    this.#endpoints = endpoints;
    this.#required = required;
  }

  /** @param {import("../../Rule.mjs").ValidationContext} context */
  async check({ pkg }) {
    const at = { path: README };
    if (!pkg.has(README)) return [this.error("README.md is required; reviewers read it first", at)];
    const text = await pkg.readText(README);
    const findings = [];

    for (const url of this.#endpoints(pkg)) {
      if (!text.includes(url)) findings.push(this.error(`README must declare the MCP endpoint ${url}`, at));
    }
    for (const [needle, why] of this.#required) {
      if (!text.includes(needle)) findings.push(this.error(`README must state ${why} ("${needle}")`, at));
    }
    for (const skill of pkg.skills) {
      if (!text.includes(`\`${skill.dir}\``)) findings.push(this.error(`README must list the skill "${skill.dir}"`, at));
    }
    return findings;
  }
}

/** @type {readonly [string, string][]} */
export const DEFAULT_REQUIRED = Object.freeze([
  ["OAuth", "the credential model"],
  ["## Network endpoints", "the network endpoints section"],
  ["## Credentials", "the credentials section"],
  ["## Components", "the components section"],
  ["License", "the license"],
]);
