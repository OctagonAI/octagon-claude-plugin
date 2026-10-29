// @ts-check
import path from "node:path";
import { ConfigError } from "../errors.mjs";
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
 * @typedef {{ pattern: string, flags?: string, reason: string, paths?: string[], inherit?: boolean }} ForbiddenPattern
 *   `paths` limits a pattern to files whose package path starts with one of the prefixes.
 *   `inherit: false` keeps a pattern out of configs that extend this one.
 * @typedef {{
 *   excludeSkills: string[],
 *   includeSkills?: string[],
 *   removeFiles: string[],
 *   sections: SectionSpec[],
 *   substitutions: SubstitutionSpec[],
 *   skillEdits: Record<string, SkillEdits>,
 *   forbiddenPatterns: ForbiddenPattern[],
 * }} TransformConfigData
 * @typedef {Partial<TransformConfigData> & { extends?: string }} TransformConfigFile
 */

/**
 * Declarative rewrite rules (`transform.config.json`) that turn the Claude
 * skill catalog into provider-neutral OpenAI skills.
 *
 * Global rules are lenient: they apply wherever they match. Per-skill edits are
 * strict: an edit that no longer matches its source fails the build, so changes
 * to upstream skills can never silently skip a compliance rewrite.
 *
 * A profile's config may `extends` another file. Lists concatenate (parent
 * first), `excludeSkills` is replaced when the child sets it, `includeSkills`
 * is the child's alone, patterns marked `inherit: false` stay with the parent,
 * and `skillEdits` merge by skill with the child winning.
 * Inherited edits for skills the child does not ship are dropped rather than
 * failing, since the child never claimed them; the child's own edits stay strict.
 */
export class TransformConfig {
  /** @type {Readonly<TransformConfigData>} */ data;

  /** @param {TransformConfigData} data */
  constructor(data) {
    this.data = deepFreeze(structuredClone(data));
    Object.freeze(this);
  }

  /**
   * Loads a config file, resolving its `extends` chain.
   *
   * @param {string} file
   * @param {readonly string[]} [chain] Files already being loaded, for cycle detection.
   * @returns {Promise<TransformConfig>}
   */
  static async load(file, chain = []) {
    const resolved = path.resolve(file);
    if (chain.includes(resolved)) {
      throw new ConfigError(resolved, [`"extends" cycle: ${[...chain, resolved].join(" -> ")}`]);
    }
    const raw = await readJsonFile(resolved);
    TransformConfig.check(raw, resolved);
    const own = /** @type {TransformConfigFile} */ (raw);

    if (own.extends === undefined) {
      return new TransformConfig(/** @type {TransformConfigData} */ (own));
    }
    const parent = await TransformConfig.load(path.resolve(path.dirname(resolved), own.extends), [...chain, resolved]);
    return new TransformConfig(TransformConfig.merge(parent.data, own));
  }

  /**
   * @param {Readonly<TransformConfigData>} parent
   * @param {TransformConfigFile} child
   * @returns {TransformConfigData}
   */
  static merge(parent, child) {
    const excludeSkills = child.excludeSkills ?? parent.excludeSkills;
    const includeSkills = child.includeSkills;
    const shipped = (/** @type {string} */ skill) =>
      !excludeSkills.includes(skill) && (includeSkills === undefined || includeSkills.includes(skill));

    const inherited = Object.fromEntries(Object.entries(parent.skillEdits).filter(([skill]) => shipped(skill)));

    return {
      excludeSkills,
      ...(includeSkills === undefined ? {} : { includeSkills }),
      removeFiles: [...parent.removeFiles, ...(child.removeFiles ?? [])],
      sections: [...parent.sections, ...(child.sections ?? [])],
      substitutions: [...parent.substitutions, ...(child.substitutions ?? [])],
      skillEdits: { ...inherited, ...(child.skillEdits ?? {}) },
      forbiddenPatterns: [
        ...parent.forbiddenPatterns.filter(pattern => pattern.inherit !== false),
        ...(child.forbiddenPatterns ?? []),
      ],
    };
  }

  /**
   * Structural checks. A file that `extends` another may omit any list; a root
   * file must declare all of them.
   *
   * @param {unknown} raw
   * @param {string} source
   */
  static check(raw, source) {
    const check = new Checker();
    if (!check.object(raw, "config")) return check.throwIfAny(source);

    const partial = raw.extends !== undefined;
    if (partial && typeof raw.extends !== "string") check.fail("extends must be a relative file path");
    const present = (/** @type {string} */ key) => raw[key] !== undefined || !partial;

    if (present("excludeSkills")) check.stringArray(raw.excludeSkills, "excludeSkills");
    if (raw.includeSkills !== undefined) check.stringArray(raw.includeSkills, "includeSkills");
    if (present("removeFiles")) check.stringArray(raw.removeFiles, "removeFiles");
    if (present("sections")) checkSections(check, raw.sections, "sections");
    if (present("substitutions")) checkSubstitutions(check, raw.substitutions, "substitutions");

    if (present("skillEdits") && check.object(raw.skillEdits, "skillEdits")) {
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

    if (present("forbiddenPatterns") && check.array(raw.forbiddenPatterns, "forbiddenPatterns")) {
      raw.forbiddenPatterns.forEach((entry, index) => {
        const where = `forbiddenPatterns[${index}]`;
        if (!check.object(entry, where)) return;
        if (check.string(entry.pattern, `${where}.pattern`)) {
          tryRegExp(check, entry.pattern, entry.flags, where);
        }
        check.string(entry.reason, `${where}.reason`);
        if (entry.paths !== undefined) check.stringArray(entry.paths, `${where}.paths`);
        if (entry.inherit !== undefined && typeof entry.inherit !== "boolean") check.fail(`${where}.inherit must be a boolean`);
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

  /**
   * @returns {{ regex: RegExp, reason: string, paths?: readonly string[] }[]}
   *   Non-global regexes, safe for repeated `test()`.
   */
  forbiddenRegexes() {
    return this.data.forbiddenPatterns.map(({ pattern, flags = "", reason, paths }) => ({
      regex: new RegExp(pattern, flags.replaceAll("g", "").replaceAll("y", "")),
      reason,
      ...(paths === undefined ? {} : { paths }),
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
