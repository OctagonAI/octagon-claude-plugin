// @ts-check
import { Finding } from "./Finding.mjs";

/** @typedef {import("./PackageView.mjs").PackageView} PackageView */
/** @typedef {import("../output/Archiver.mjs").ArchiveInfo} ArchiveInfo */
/** @typedef {"package" | "archive"} RuleScope */
/** @typedef {{ pkg: PackageView, archive?: ArchiveInfo }} ValidationContext */

/**
 * Base class for validation rules.
 *
 * A rule inspects the built output and returns findings. Rules never modify
 * anything. Package-scope rules run on the staging directory; archive-scope
 * rules run on the ZIP once it exists.
 *
 * @abstract
 */
export class Rule {
  /** @returns {string} Stable identifier shown in reports. */
  get id() {
    return this.constructor.name;
  }

  /** @returns {RuleScope} */
  get scope() {
    return "package";
  }

  /**
   * @param {ValidationContext} _context
   * @returns {Finding[] | Promise<Finding[]>}
   */
  check(_context) {
    throw new Error(`${this.id}.check() is not implemented`);
  }

  /**
   * @param {string} message
   * @param {{ path?: string, code?: string }} [details]
   * @returns {Finding}
   */
  error(message, details = {}) {
    return new Finding({ ruleId: this.id, severity: "error", message, ...details });
  }

  /**
   * @param {string} message
   * @param {{ path?: string, code?: string }} [details]
   * @returns {Finding}
   */
  warning(message, details = {}) {
    return new Finding({ ruleId: this.id, severity: "warning", message, ...details });
  }
}
