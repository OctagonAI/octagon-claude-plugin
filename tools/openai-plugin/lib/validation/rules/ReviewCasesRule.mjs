// @ts-check
import { MANIFEST_PATH, MCP_CONFIG_PATH, OPENAI_EXTENSION } from "../../manifest/ManifestBuilder.mjs";
import { isPlainObject, pick } from "../../util/object.mjs";
import { Rule } from "../Rule.mjs";
import { length } from "../support/text.mjs";

const POSITIVE_CASES = 5;
const NEGATIVE_CASES = 3;
const POSITIVE_FIELDS = ["description", "prompt", "tools_triggered", "expected_behavior"];
const NEGATIVE_FIELDS = ["description", "prompt"];
/** Fields the importer rejects; reviewer access belongs in the dashboard. */
const FORBIDDEN_REVIEW_KEYS = ["test_credentials", "reviewer_instructions"];

/**
 * Initial MCP review requirements: exactly one MCP server, exactly five positive
 * and three negative test cases, tool names that exist, and no credentials in the package.
 */
export class ReviewCasesRule extends Rule {
  /** @type {ReadonlySet<string>} */ #knownTools;

  /** @param {{ knownTools: readonly string[] }} options */
  constructor({ knownTools }) {
    super();
    this.#knownTools = new Set(knownTools);
  }

  /** @param {import("../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const findings = [];
    const at = { path: MANIFEST_PATH };

    if (pkg.mcp.error) {
      findings.push(this.error(pkg.mcp.error, { path: MCP_CONFIG_PATH }));
    } else {
      const servers = pick(pkg.mcp.value, ["mcpServers"]);
      const entries = isPlainObject(servers) ? Object.entries(servers) : [];
      if (!isPlainObject(servers)) {
        findings.push(this.error("mcpServers must be an object", { path: MCP_CONFIG_PATH, code: "mcp_servers_wrong_type" }));
      } else if (entries.length !== 1) {
        findings.push(this.error(`plugin-level review cases require exactly one MCP server (found ${entries.length})`, { path: MCP_CONFIG_PATH }));
      }
      for (const [name, server] of entries) {
        const url = pick(server, ["url"]);
        if (typeof url !== "string" || !url.startsWith("https://")) {
          findings.push(this.error(`server "${name}" needs an https:// url`, { path: MCP_CONFIG_PATH }));
        }
      }
    }

    const review = pick(pkg.manifestObject(), ["extensions", OPENAI_EXTENSION, "review"]);
    if (!isPlainObject(review)) {
      return [...findings, this.error("extensions.com.openai.review is required for MCP review", at)];
    }
    for (const key of FORBIDDEN_REVIEW_KEYS) {
      if (key in review) findings.push(this.error(`review.${key} must not be in the package; use the dashboard`, at));
    }

    findings.push(
      ...this.#checkCases(pick(review, ["test_cases", "positive"]), "positive", POSITIVE_CASES, POSITIVE_FIELDS),
      ...this.#checkCases(pick(review, ["test_cases", "negative"]), "negative", NEGATIVE_CASES, NEGATIVE_FIELDS),
    );

    if (typeof review.demo_recording_url !== "string" || review.demo_recording_url === "") {
      findings.push(this.warning("review.demo_recording_url is missing; it is required before submitting", at));
    }
    return findings;
  }

  /**
   * @param {unknown} cases
   * @param {string} kind
   * @param {number} expected
   * @param {string[]} fields
   */
  #checkCases(cases, kind, expected, fields) {
    const at = { path: MANIFEST_PATH };
    if (!Array.isArray(cases)) return [this.error(`review.test_cases.${kind} must list ${expected} cases`, at)];

    const findings = [];
    if (cases.length !== expected) {
      findings.push(this.error(`review.test_cases.${kind} has ${cases.length} cases; initial review needs exactly ${expected}`, at));
    }
    cases.forEach((testCase, index) => {
      const where = `review.test_cases.${kind}[${index}]`;
      for (const field of fields) {
        const value = pick(testCase, [field]);
        if (typeof value !== "string" || value.trim() === "") findings.push(this.error(`${where}.${field} is required`, at));
      }
      const description = pick(testCase, ["description"]);
      if (typeof description === "string" && length(description) > 4000) {
        findings.push(this.error(`${where}.description must be ≤4,000 characters`, at));
      }
      const tools = pick(testCase, ["tools_triggered"]);
      if (typeof tools === "string") {
        for (const tool of tools.split(",").map(name => name.trim()).filter(Boolean)) {
          if (!this.#knownTools.has(tool)) findings.push(this.error(`${where} names unknown tool "${tool}"`, at));
        }
      }
    });
    return findings;
  }
}
