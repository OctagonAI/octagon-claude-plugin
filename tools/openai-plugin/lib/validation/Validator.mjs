// @ts-check

/** @typedef {import("./Rule.mjs").Rule} Rule */
/** @typedef {import("./Rule.mjs").RuleScope} RuleScope */
/** @typedef {import("./Rule.mjs").ValidationContext} ValidationContext */
/** @typedef {import("./Finding.mjs").Finding} Finding */

/** Aggregated outcome of one validation pass. */
export class ValidationReport {
  /** @type {readonly Finding[]} */ findings;

  /** @param {Finding[]} findings */
  constructor(findings) {
    this.findings = Object.freeze([...findings]);
    Object.freeze(this);
  }

  /** @returns {Finding[]} */
  get errors() {
    return this.findings.filter(finding => finding.severity === "error");
  }

  /** @returns {Finding[]} */
  get warnings() {
    return this.findings.filter(finding => finding.severity === "warning");
  }

  /** @returns {boolean} */
  get ok() {
    return this.errors.length === 0;
  }

  /**
   * @param {ValidationReport} other
   * @returns {ValidationReport}
   */
  merge(other) {
    return new ValidationReport([...this.findings, ...other.findings]);
  }

  toJSON() {
    return { ok: this.ok, errors: this.errors.length, warnings: this.warnings.length, findings: this.findings };
  }
}

/** Runs a fixed set of rules against a validation context. */
export class Validator {
  /** @type {readonly Rule[]} */ #rules;

  /** @param {readonly Rule[]} rules */
  constructor(rules) {
    this.#rules = Object.freeze([...rules]);
  }

  /**
   * @param {ValidationContext} context
   * @param {RuleScope} scope
   * @returns {Promise<ValidationReport>}
   */
  async run(context, scope) {
    const findings = [];
    for (const rule of this.#rules.filter(candidate => candidate.scope === scope)) {
      findings.push(...(await rule.check(context)));
    }
    return new ValidationReport(findings);
  }
}
