// @ts-check
import { MANIFEST_PATH, OPENAI_EXTENSION, SKILLS_DIR } from "../../manifest/ManifestBuilder.mjs";
import { SKILL_FILE } from "../../skill/SkillDocument.mjs";
import { pick } from "../../util/object.mjs";
import { Rule } from "../Rule.mjs";
import { hasUnsupportedCharacters, length } from "../support/text.mjs";

/** Every skill: placement, front matter, naming, and the onboarding reference. */
export class SkillRule extends Rule {
  /** @param {import("../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const findings = [];
    const pluginName = String(pkg.manifestObject()?.name ?? "");

    if (pkg.skills.length === 0) findings.push(this.error("package contains no skills", { path: SKILLS_DIR }));

    for (const file of pkg.files.filter(candidate => candidate.startsWith(`${SKILLS_DIR}/`))) {
      const segments = file.split("/");
      if (segments[1]?.startsWith(".")) {
        findings.push(this.error("skill directories must not be hidden", { path: file, code: "skill_directory_hidden" }));
      }
      if (segments.at(-1) === SKILL_FILE && segments.length !== 3) {
        findings.push(this.error("SKILL.md must sit directly in skills/<name>/", { path: file, code: "skill_manifest_nested" }));
      }
    }
    const skillDirs = new Set(pkg.skills.map(skill => skill.dir));
    for (const dir of new Set(pkg.files.filter(file => file.startsWith(`${SKILLS_DIR}/`)).map(file => file.split("/")[1]))) {
      if (!skillDirs.has(dir)) {
        findings.push(this.error("skill directory has no SKILL.md", { path: `${SKILLS_DIR}/${dir}`, code: "skill_manifest_missing" }));
      }
    }

    const names = new Map();
    for (const skill of pkg.skills) {
      const at = { path: skill.path };
      if (skill.error || !skill.frontMatter) {
        findings.push(this.error(skill.error ?? "front matter is unreadable", { ...at, code: "skill_frontmatter_yaml_malformed" }));
        continue;
      }
      const { name, description } = skill.frontMatter;
      if (!name) {
        findings.push(this.error("front matter name is required", { ...at, code: "skill_name_missing" }));
      } else {
        if (name !== skill.dir) findings.push(this.error(`name "${name}" must match its directory "${skill.dir}"`, at));
        if (length(`${pluginName}:${name}`) > 64) {
          findings.push(this.error(`"${pluginName}:${name}" exceeds 64 characters`, { ...at, code: "skill_identity_too_long" }));
        }
        if (names.has(name)) findings.push(this.error(`duplicate skill name "${name}"`, { ...at, code: "skill_identity_duplicate" }));
        names.set(name, skill.path);
      }
      if (!description || description.trim() === "") {
        findings.push(this.error("front matter description is required", { ...at, code: "skill_description_missing" }));
      } else {
        if (length(description) > 1024) {
          findings.push(this.error("description must be ≤1,024 characters", { ...at, code: "skill_description_too_long" }));
        }
        if (hasUnsupportedCharacters(description)) {
          findings.push(this.error("description must be a single line of supported text", { ...at, code: "skill_description_character_unsupported" }));
        }
      }
      if (!skill.body || skill.body.trim() === "") {
        findings.push(this.error("skill instructions must not be empty", { ...at, code: "skill_body_empty" }));
      }
    }

    const onboarding = pick(pkg.manifestObject(), ["extensions", OPENAI_EXTENSION, "onboardingSkill"]);
    if (onboarding !== undefined) {
      const target = typeof onboarding === "string" ? onboarding.replace(/^\.\//, "") : "";
      if (!pkg.skills.some(skill => skill.path === target)) {
        findings.push(this.error(`onboardingSkill "${String(onboarding)}" is not an included skill`, { path: MANIFEST_PATH }));
      }
    }
    return findings;
  }
}
