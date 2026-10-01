// @ts-check
import { MANIFEST_PATH, MCP_CONFIG_PATH, SKILLS_DIR } from "../../manifest/ManifestBuilder.mjs";
import { isPlainObject } from "../../util/object.mjs";
import { Rule } from "../Rule.mjs";
import { hasUnsupportedCharacters, length } from "../support/text.mjs";

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
/** Claude-only or unsupported manifest declarations. */
const UNSUPPORTED_KEYS = ["hooks", "apps", "agents", "commands", "userConfig", "outputStyles", "lspServers", "channels"];

/** Package identity and component fields of `.codex-plugin/plugin.json`. */
export class ManifestShapeRule extends Rule {
  /** @param {import("../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const at = { path: MANIFEST_PATH };
    if (pkg.manifest.error) return [this.error(pkg.manifest.error, { ...at, code: "plugin_manifest_missing" })];
    const manifest = pkg.manifestObject();
    if (!manifest) return [this.error("manifest must be a JSON object", { ...at, code: "plugin_manifest_root_not_object" })];

    const findings = [];
    const { name, version, description, author } = manifest;

    if (typeof name !== "string" || !NAME.test(name) || name.length > 64) {
      findings.push(this.error("name must be ≤64 lowercase letters, digits, and single hyphens", { ...at, code: "plugin_name_format" }));
    }
    if (typeof version !== "string" || !SEMVER.test(version)) {
      findings.push(this.error("version must be a semantic version such as 1.0.0", { ...at, code: "plugin_version_not_semver" }));
    }
    if (typeof description !== "string" || description.trim() === "") {
      findings.push(this.error("description is required", { ...at, code: "plugin_description_missing" }));
    } else {
      if (length(description) > 1024) {
        findings.push(this.error("description must be ≤1,024 characters", { ...at, code: "plugin_description_too_long" }));
      }
      if (hasUnsupportedCharacters(description, { allowNewlines: true })) {
        findings.push(this.error("description contains unsupported characters", { ...at, code: "plugin_description_character_unsupported" }));
      }
    }

    if (!isPlainObject(author) || typeof author.name !== "string" || author.name.trim() === "") {
      findings.push(this.error("author.name is required", { ...at, code: "plugin_developer_missing" }));
    } else {
      if (length(author.name) > 120) findings.push(this.error("author.name must be ≤120 characters", { ...at, code: "plugin_author_name_too_long" }));
      if (typeof author.email === "string" && length(author.email) > 320) {
        findings.push(this.error("author.email must be ≤320 characters", at));
      }
    }

    if (manifest.skills !== `./${SKILLS_DIR}/`) findings.push(this.error(`skills must be "./${SKILLS_DIR}/"`, at));
    if (manifest.mcpServers !== `./${MCP_CONFIG_PATH}`) findings.push(this.error(`mcpServers must be "./${MCP_CONFIG_PATH}"`, at));
    if (!isPlainObject(manifest.interface)) {
      findings.push(this.error("interface object is required", { ...at, code: "plugin_interface_wrong_type" }));
    }
    for (const key of UNSUPPORTED_KEYS) {
      if (key in manifest) findings.push(this.error(`"${key}" is not supported in OpenAI plugin packages`, at));
    }
    return findings;
  }
}
