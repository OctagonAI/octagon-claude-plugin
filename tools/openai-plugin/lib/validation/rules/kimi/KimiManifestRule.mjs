// @ts-check
import { KIMI_MANIFEST_FIELDS, KIMI_MANIFEST_PATH, KIMI_SYSTEM_PROMPT_PATH } from "../../../manifest/KimiManifestBuilder.mjs";
import { SKILLS_DIR } from "../../../manifest/ManifestBuilder.mjs";
import { isPlainObject } from "../../../util/object.mjs";
import { Rule } from "../../Rule.mjs";

/**
 * Kimi Code accepts a wider pattern, but the hosted validator that gates the
 * official marketplace demands kebab-case (`manifest.name.pattern`), and the
 * name doubles as the catalog id and the skill namespace.
 */
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
/** Component fields the plugin deliberately never sets, and legacy fields Kimi ignores with a diagnostic. */
const NEVER = ["agents", "hooks", "commands", "systemPrompt", "tools", "apps", "inject", "configFile", "config_file", "bootstrap"];

/**
 * `kimi.plugin.json`: present at the root, documented fields only, a
 * kebab-case name equal to the plugin name, a semver version, a description,
 * `skills` pointing at the shipped directory, a `sessionStart` skill that
 * exists, a `systemPromptPath` that exists, and no component the package does
 * not ship.
 */
export class KimiManifestRule extends Rule {
  /** @type {string | undefined} */ #expectedName;

  /** @param {{ expectedName?: string }} [options] */
  constructor({ expectedName } = {}) {
    super();
    this.#expectedName = expectedName;
  }

  /** @param {import("../../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const at = { path: KIMI_MANIFEST_PATH };
    if (pkg.manifest.error) return [this.error(pkg.manifest.error, at)];
    const manifest = pkg.manifestObject();
    if (!manifest) return [this.error("manifest must be a JSON object", at)];

    const findings = [];
    const { name, version, description, skills, sessionStart, systemPromptPath, skillInstructions } = manifest;

    if (typeof name !== "string" || !NAME.test(name)) {
      findings.push(this.error("name must be kebab-case: lowercase letters, digits, single hyphens", { ...at, code: "manifest.name.pattern" }));
    } else if (this.#expectedName !== undefined && name !== this.#expectedName) {
      findings.push(this.error(`name "${name}" must equal the plugin name "${this.#expectedName}" (the catalog id and the package directory)`, at));
    }
    if (typeof version !== "string" || !SEMVER.test(version)) {
      findings.push(this.error("version must be a semantic version such as 1.0.0; the release tag is v<version> and the hosted platform refuses a reused version", at));
    }
    if (typeof description !== "string" || description.trim() === "") {
      findings.push(this.error("description is required; the catalog shows it", at));
    } else if (/[\r\n]/.test(description)) {
      findings.push(this.error("description must be a single line", at));
    }

    if (!Array.isArray(skills) || skills.join("\n") !== `./${SKILLS_DIR}/`) {
      findings.push(this.error(`skills must be ["./${SKILLS_DIR}/"], the one directory the package ships`, at));
    }
    if (sessionStart !== undefined) {
      const skill = isPlainObject(sessionStart) ? sessionStart.skill : undefined;
      if (typeof skill !== "string" || !pkg.skills.some(entry => entry.dir === skill)) {
        findings.push(this.error(`sessionStart.skill must name a shipped skill (got ${JSON.stringify(skill)})`, at));
      }
    }
    if (systemPromptPath !== `./${KIMI_SYSTEM_PROMPT_PATH}`) {
      findings.push(this.error(`systemPromptPath must be "./${KIMI_SYSTEM_PROMPT_PATH}"`, at));
    } else if (!pkg.has(KIMI_SYSTEM_PROMPT_PATH)) {
      findings.push(this.error(`${KIMI_SYSTEM_PROMPT_PATH} is not in the package`, at));
    }
    if (skillInstructions !== undefined && (typeof skillInstructions !== "string" || skillInstructions.trim() === "")) {
      findings.push(this.error("skillInstructions must be a non-empty string when present", at));
    }
    if (!isPlainObject(manifest.mcpServers)) findings.push(this.error("mcpServers object is required", at));
    if (!isPlainObject(manifest.interface)) findings.push(this.error("interface object is required; the hosted validator rejects a plugin without it", at));

    for (const key of Object.keys(manifest)) {
      if (NEVER.includes(key)) {
        findings.push(this.error(`"${key}" must not be set: the plugin ships skills and one remote server, and legacy fields are ignored with a diagnostic`, at));
      } else if (!KIMI_MANIFEST_FIELDS.includes(key)) {
        findings.push(this.error(`"${key}" is not a documented Kimi plugin manifest field`, at));
      }
    }
    return findings;
  }
}
