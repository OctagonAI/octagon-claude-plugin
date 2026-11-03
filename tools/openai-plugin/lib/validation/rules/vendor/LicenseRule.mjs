// @ts-check
import { readFile } from "node:fs/promises";
import { Rule } from "../../Rule.mjs";

const LICENSE = "LICENSE";

/** The package carries the repository's license file, byte for byte. */
export class LicenseRule extends Rule {
  /** @type {string} */ #licenseFile;

  /** @param {{ licenseFile: string }} options Absolute path of the repository's LICENSE. */
  constructor({ licenseFile }) {
    super();
    this.#licenseFile = licenseFile;
  }

  /** @param {import("../../Rule.mjs").ValidationContext} context */
  async check({ pkg }) {
    const at = { path: LICENSE };
    if (!pkg.has(LICENSE)) return [this.error("LICENSE is required; unlicensed plugins are sent back", at)];
    const [shipped, expected] = await Promise.all([pkg.readBytes(LICENSE), readFile(this.#licenseFile)]);
    return shipped.equals(expected) ? [] : [this.error("LICENSE differs from the repository's license", at)];
  }
}
