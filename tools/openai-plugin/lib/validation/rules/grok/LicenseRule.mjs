// @ts-check
import { readFile } from "node:fs/promises";
import { GROK_LICENSE_PATH } from "../../../manifest/GrokManifestBuilder.mjs";
import { Rule } from "../../Rule.mjs";

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
    const at = { path: GROK_LICENSE_PATH };
    if (!pkg.has(GROK_LICENSE_PATH)) return [this.error("LICENSE is required; unlicensed plugins are sent back", at)];
    const [shipped, expected] = await Promise.all([pkg.readBytes(GROK_LICENSE_PATH), readFile(this.#licenseFile)]);
    return shipped.equals(expected) ? [] : [this.error("LICENSE differs from the repository's license", at)];
  }
}
