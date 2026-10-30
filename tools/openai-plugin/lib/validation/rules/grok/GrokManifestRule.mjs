// @ts-check
import { GROK_MANIFEST_FIELDS, GROK_MANIFEST_PATH } from "../../../manifest/GrokManifestBuilder.mjs";
import { MCP_CONFIG_PATH, SKILLS_DIR } from "../../../manifest/ManifestBuilder.mjs";
import { isPlainObject } from "../../../util/object.mjs";
import { Rule } from "../../Rule.mjs";

/** Grok Build: 1–64 chars, lowercase alphanumerics and hyphens, no leading or trailing hyphen. */
const NAME = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const URL_FIELDS = ["homepage", "repository"];

/**
 * `.grok-plugin/plugin.json`: present, documented fields only, identity and
 * component paths as Grok Build expects them, public URLs over HTTPS.
 */
export class GrokManifestRule extends Rule {
  /** @param {import("../../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const at = { path: GROK_MANIFEST_PATH };
    if (pkg.manifest.error) return [this.error(pkg.manifest.error, at)];
    const manifest = pkg.manifestObject();
    if (!manifest) return [this.error("manifest must be a JSON object", at)];

    const findings = [];
    const { name, version, description, author, license, keywords } = manifest;

    if (typeof name !== "string" || !NAME.test(name)) {
      findings.push(this.error("name must be 1–64 lowercase letters, digits, and hyphens, not starting or ending with a hyphen", at));
    }
    if (typeof version !== "string" || !SEMVER.test(version)) {
      findings.push(this.error("version must be a semantic version such as 1.0.0", at));
    }
    if (typeof description !== "string" || description.trim() === "") {
      findings.push(this.error("description is required", at));
    }
    if (!isPlainObject(author) || typeof author.name !== "string" || author.name.trim() === "") {
      findings.push(this.error("author.name is required", at));
    } else if (author.url !== undefined) {
      const problem = urlProblem(author.url);
      if (problem) findings.push(this.error(`author.url ${problem}`, at));
    }
    if (typeof license !== "string" || license.trim() === "") {
      findings.push(this.error("license is required; unlicensed plugins are sent back", at));
    }
    if (!Array.isArray(keywords) || keywords.length === 0 || !keywords.every(keyword => typeof keyword === "string")) {
      findings.push(this.error("keywords must be a non-empty array of strings", at));
    }
    for (const field of URL_FIELDS) {
      const value = manifest[field];
      if (value === undefined) continue;
      const problem = urlProblem(value);
      if (problem) findings.push(this.error(`${field} ${problem}`, at));
    }
    if (manifest.homepage === undefined) findings.push(this.error("homepage is required for a marketplace listing", at));

    if (manifest.skills !== `./${SKILLS_DIR}/`) findings.push(this.error(`skills must be "./${SKILLS_DIR}/"`, at));
    if (manifest.mcpServers !== `./${MCP_CONFIG_PATH}`) findings.push(this.error(`mcpServers must be "./${MCP_CONFIG_PATH}"`, at));

    for (const key of Object.keys(manifest)) {
      if (!GROK_MANIFEST_FIELDS.includes(key)) {
        findings.push(this.error(`"${key}" is not a documented Grok plugin manifest field`, at));
      }
    }
    return findings;
  }
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function urlProblem(value) {
  if (typeof value !== "string") return "must be a string";
  let url;
  try {
    url = new URL(value);
  } catch {
    return `is not a valid URL: ${value}`;
  }
  if (url.protocol !== "https:") return `must use HTTPS: ${value}`;
  if (url.username || url.password) return "must not embed credentials";
  return null;
}
