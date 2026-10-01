// @ts-check

/** @typedef {"error" | "warning"} Severity */

/**
 * One validation result. `code` mirrors the OpenAI portal error code where one
 * exists, so a local finding can be matched against the submission-errors reference.
 */
export class Finding {
  /** @type {string} */ ruleId;
  /** @type {Severity} */ severity;
  /** @type {string} */ message;
  /** @type {string | undefined} */ path;
  /** @type {string | undefined} */ code;

  /**
   * @param {{ ruleId: string, severity: Severity, message: string, path?: string, code?: string }} init
   */
  constructor({ ruleId, severity, message, path, code }) {
    this.ruleId = ruleId;
    this.severity = severity;
    this.message = message;
    this.path = path;
    this.code = code;
    Object.freeze(this);
  }

  /** @returns {string} */
  toString() {
    const location = this.path ? ` ${this.path}:` : "";
    const code = this.code ? ` [${this.code}]` : "";
    return `${this.severity.toUpperCase()} ${this.ruleId}${code}${location} ${this.message}`;
  }
}
