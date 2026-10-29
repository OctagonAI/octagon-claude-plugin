// @ts-check
import { RemoveFiles } from "../transform/RemoveFiles.mjs";
import { ReplaceSection } from "../transform/ReplaceSection.mjs";
import { ReplaceText } from "../transform/ReplaceText.mjs";
import { ScopedTransform } from "../transform/ScopedTransform.mjs";
import { TransformPipeline } from "../transform/TransformPipeline.mjs";
import { deepFreeze, isPlainObject } from "../util/object.mjs";
import { Checker, readJsonFile } from "./validate.mjs";

/**
 * @typedef {{ file?: string, heading: string, body?: string | null }} SectionSpec
 * @typedef {{ file?: string, find?: string, pattern?: string, flags?: string, replace: string }} SubstitutionSpec
 * @typedef {{ sections?: SectionSpec[], substitutions?: SubstitutionSpec[] }} SkillEdits
 * @typedef {{ pattern: string, flags?: string, reason: string }} ForbiddenPattern
 * @typedef {{
 *   excludeSkills: string[],
 *   removeFiles: string[],
 *   sections: SectionSpec[],
 *   substitutions: SubstitutionSpec[],
 *   skillEdits: Record<string, SkillEdits>,
 *   forbiddenPatterns: ForbiddenPattern[],
 * }} TransformConfigData
 */

/**
 * Declarative rewrite rules (`openai/transform.config.json`) that turn the
 * Claude skill catalog into provider-neutral OpenAI skills.
 *
 * Global rules are lenient: they apply wherever they match. Per-skill edits are
 * strict: an edit that no longer matches its source fails the build, so changes
 * to upstream skills can never silently skip a compliance rewrite.
 */
export class TransformConfig {
  /** @type {Readonly<TransformConfigData>} */ data;

  /** @param {TransformConfigData} data */
  constructor(data) {
    this.data = deepFreeze(structuredClone(data));
    Object.freeze(this);
  }

  /**
   * @param {string} file
   * @returns {Promise<TransformConfig>}
   */
  static async load(file) {
    const raw = await readJsonFile(file);
    TransformConfig.check(raw, file);
    return new TransformConfig(/** @type {TransformConfigData} */ (raw));
  }

  /**
   * @param {unknown} raw
   * @param {string} source
   */
  static check(raw, source) {
    const check = new Checker();
    if (!check.object(raw, "config")) return check.throwIfAny(source);

    check.stringArray(raw.excludeSkills, "excludeSkills");
    check.stringArray(raw.removeFiles, "removeFiles");
    checkSections(check, raw.sections, "sections");
    checkSubstitutions(check, raw.substitutions, "substitutions");

    if (check.object(raw.skillEdits, "skillEdits")) {
      for (const [skill, edits] of Object.entries(raw.skillEdits)) {
        if (!check.object(edits, `skillEdits.${skill}`)) continue;
        if (edits.sections !== undefined) {
          checkSections(check, edits.sections, `skillEdits.${skill}.sections`);
        }
        if (edits.substitutions !== undefined) {
          checkSubstitutions(check, edits.substitutions, `skillEdits.${skill}.substitutions`);
        }
      }
    }

    if (check.array(raw.forbiddenPatterns, "forbiddenPatterns")) {
      raw.forbiddenPatterns.forEach((entry, index) => {
        const where = `forbiddenPatterns[${index}]`;
        if (!check.object(entry, where)) return;
        if (check.string(entry.pattern, `${where}.pattern`)) {
          tryRegExp(check, entry.pattern, entry.flags, where);
        }
        check.string(entry.reason, `${where}.reason`);
      });
    }
    check.throwIfAny(source);
  }

  /** @returns {string[]} Skills that per-skill edits target. */
  editedSkills() {
    return Object.keys(this.data.skillEdits);
  }

  /**
   * Builds the rewrite pipeline:
   * 1. drop companion files;
   * 2. per-skill edits, which run first so they match the original upstream text;
   * 3. global section rewrites, skipping skills that override the same section;
   * 4. global substitutions.
   *
   * @returns {TransformPipeline}
   */
  toPipeline() {
    const { removeFiles, sections, substitutions, skillEdits } = this.data;
    const edits = Object.entries(skillEdits);

    const perSkill = edits.flatMap(([skill, { sections = [], substitutions = [] }]) =>
      [
        ...sections.map(spec => new ReplaceSection({ ...spec, strict: true })),
        ...substitutions.map(spec => new ReplaceText({ ...spec, strict: true })),
      ].map(transform => new ScopedTransform({ only: [skill] }, transform)),
    );

    const globalSections = sections.map(spec => {
      const overriding = edits
        .filter(([, edit]) => (edit.sections ?? []).some(own => sameSection(own, spec)))
        .map(([skill]) => skill);
      return new ScopedTransform({ except: overriding }, new ReplaceSection(spec));
    });

    return new TransformPipeline([
      new RemoveFiles(removeFiles),
      ...perSkill,
      ...globalSections,
      ...substitutions.map(spec => new ReplaceText(spec)),
    ]);
  }

  /** @returns {{ regex: RegExp, reason: string }[]} Non-global regexes, safe for repeated `test()`. */
  forbiddenRegexes() {
    return this.data.forbiddenPatterns.map(({ pattern, flags = "", reason }) => ({
      regex: new RegExp(pattern, flags.replaceAll("g", "").replaceAll("y", "")),
      reason,
    }));
  }
}

/**
 * @param {SectionSpec} a
 * @param {SectionSpec} b
 * @returns {boolean}
 */
function sameSection(a, b) {
  return a.heading === b.heading && (a.file ?? "SKILL.md") === (b.file ?? "SKILL.md");
}

/**
 * @param {Checker} check
 * @param {unknown} value
 * @param {string} where
 */
function checkSections(check, value, where) {
  if (!check.array(value, where)) return;
  value.forEach((spec, index) => {
    const at = `${where}[${index}]`;
    if (!check.object(spec, at)) return;
    check.optionalString(spec.file, `${at}.file`);
    if (check.string(spec.heading, `${at}.heading`) && !/^#{1,6} \S/.test(spec.heading)) {
      check.fail(`${at}.heading must be a Markdown heading line`);
    }
    if (spec.body !== undefined && spec.body !== null && typeof spec.body !== "string") {
      check.fail(`${at}.body must be a string or null`);
    }
  });
}

/**
 * @param {Checker} check
 * @param {unknown} value
 * @param {string} where
 */
function checkSubstitutions(check, value, where) {
  if (!check.array(value, where)) return;
  value.forEach((spec, index) => {
    const at = `${where}[${index}]`;
    if (!isPlainObject(spec)) return check.fail(`${at} must be an object`);
    check.optionalString(spec.file, `${at}.file`);
    const hasFind = typeof spec.find === "string" && spec.find !== "";
    const hasPattern = typeof spec.pattern === "string" && spec.pattern !== "";
    if (hasFind === hasPattern) check.fail(`${at} needs exactly one of "find" or "pattern"`);
    if (hasPattern) tryRegExp(check, /** @type {string} */ (spec.pattern), spec.flags, at);
    if (typeof spec.replace !== "string") check.fail(`${at}.replace must be a string`);
  });
}

/**
 * @param {Checker} check
 * @param {string} pattern
 * @param {unknown} flags
 * @param {string} where
 */
function tryRegExp(check, pattern, flags, where) {
  try {
    new RegExp(pattern, typeof flags === "string" ? flags : "");
  } catch (error) {
    check.fail(`${where}: invalid regular expression (${/** @type {Error} */ (error).message})`);
  }
}
