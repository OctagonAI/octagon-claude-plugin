// @ts-check
import { GEMINI_MANIFEST_FIELDS, GEMINI_MANIFEST_PATH } from "../../../manifest/GeminiManifestBuilder.mjs";
import { isPlainObject } from "../../../util/object.mjs";
import { Rule } from "../../Rule.mjs";

/** Gemini CLI: lowercase letters, digits, and dashes; it must equal the extension directory name. */
const NAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const MAX_DESCRIPTION = 300;
/** Documented fields the extension deliberately never sets. */
const NEVER = ["settings", "excludeTools", "themes", "migratedTo", "plan"];

/**
 * `gemini-extension.json`: present, documented fields only, a name that
 * matches the config, a semver version, a gallery-sized description, and a
 * context file that exists in the package.
 */
export class GeminiManifestRule extends Rule {
  /** @type {string | undefined} */ #expectedName;

  /** @param {{ expectedName?: string }} [options] */
  constructor({ expectedName } = {}) {
    super();
    this.#expectedName = expectedName;
  }

  /** @param {import("../../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const at = { path: GEMINI_MANIFEST_PATH };
    if (pkg.manifest.error) return [this.error(pkg.manifest.error, at)];
    const manifest = pkg.manifestObject();
    if (!manifest) return [this.error("manifest must be a JSON object", at)];

    const findings = [];
    const { name, version, description, contextFileName } = manifest;

    if (typeof name !== "string" || !NAME.test(name)) {
      findings.push(this.error("name must be lowercase letters, digits, and dashes", at));
    } else if (this.#expectedName !== undefined && name !== this.#expectedName) {
      findings.push(this.error(`name "${name}" must equal the plugin name "${this.#expectedName}" (and the extension directory)`, at));
    }
    if (typeof version !== "string" || !SEMVER.test(version)) {
      findings.push(this.error("version must be a semantic version such as 1.0.0; the release tag is v<version>", at));
    }
    if (typeof description !== "string" || description.trim() === "") {
      findings.push(this.error("description is required; the gallery shows it", at));
    } else {
      if (/[\r\n]/.test(description)) findings.push(this.error("description must be a single line", at));
      if (description.length > MAX_DESCRIPTION) findings.push(this.error(`description must be at most ${MAX_DESCRIPTION} characters`, at));
    }
    if (typeof contextFileName !== "string" || contextFileName.trim() === "") {
      findings.push(this.error("contextFileName is required so the standing rules load", at));
    } else if (!pkg.has(contextFileName)) {
      findings.push(this.error(`contextFileName "${contextFileName}" is not in the package`, at));
    }
    if (!isPlainObject(manifest.mcpServers)) findings.push(this.error("mcpServers object is required", at));

    for (const key of Object.keys(manifest)) {
      if (NEVER.includes(key)) {
        findings.push(this.error(`"${key}" must not be set: the extension declares no settings, restrictions, themes, or migrations`, at));
      } else if (!GEMINI_MANIFEST_FIELDS.includes(key)) {
        findings.push(this.error(`"${key}" is not a documented Gemini CLI extension manifest field`, at));
      }
    }
    return findings;
  }
}
