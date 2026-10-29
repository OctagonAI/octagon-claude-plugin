// @ts-check
import { ConfigError } from "../errors.mjs";

/** @typedef {import("../skill/SkillDocument.mjs").SkillDocument} SkillDocument */
/** @typedef {import("../source/SkillRepository.mjs").SkillRepository} SkillRepository */
/** @typedef {import("../transform/SkillTransform.mjs").SkillTransform} SkillTransform */

/**
 * @typedef {{
 *   skills: SkillDocument[],
 *   transformed: string[],
 *   added: string[],
 *   overridden: string[],
 *   excluded: string[],
 *   incomplete: string[],
 * }} CatalogResult
 */

/**
 * Assembles the OpenAI skill set:
 *   (source skills − excluded) → transformed, then merged with overlay skills.
 *
 * Overlay skills (`openai/skills/`) are authored for OpenAI and are used as-is.
 * An overlay with the same name as a source skill replaces it entirely.
 */
export class SkillCatalog {
  /** @type {SkillRepository} */ #source;
  /** @type {SkillRepository} */ #overlay;
  /** @type {ReadonlySet<string>} */ #exclude;
  /** @type {readonly string[]} */ #requiredSources;
  /** @type {SkillTransform} */ #transform;

  /** @type {ReadonlySet<string> | undefined} */ #include;

  /**
   * @param {{
   *   source: SkillRepository,
   *   overlay: SkillRepository,
   *   exclude: readonly string[],
   *   include?: readonly string[],
   *   transform: SkillTransform,
   *   requiredSources?: readonly string[],
   * }} deps `include`, when given, is an allowlist of source skills; `exclude`
   *   still applies on top of it. `requiredSources` are source skills that must
   *   be present and transformed (for example, targets of per-skill edits).
   */
  constructor({ source, overlay, exclude, include, transform, requiredSources = [] }) {
    this.#source = source;
    this.#overlay = overlay;
    this.#exclude = new Set(exclude);
    this.#include = include === undefined ? undefined : new Set(include);
    this.#transform = transform;
    this.#requiredSources = requiredSources;
  }

  /** @returns {Promise<CatalogResult>} */
  async build() {
    const sourceNames = await this.#source.names();
    const overlayNames = await this.#overlay.names();
    this.#checkConsistency(sourceNames, overlayNames);

    const overlaySet = new Set(overlayNames);
    const transformed = sourceNames.filter(name => this.#ships(name) && !overlaySet.has(name));

    /** @type {SkillDocument[]} */
    const skills = [];
    for (const name of transformed) {
      skills.push(this.#transform.apply(await this.#source.load(name)));
    }
    for (const name of overlayNames) {
      skills.push(await this.#overlay.load(name));
    }
    skills.sort((a, b) => a.name.localeCompare(b.name));

    return {
      skills,
      transformed,
      added: overlayNames.filter(name => !sourceNames.includes(name)),
      overridden: overlayNames.filter(name => sourceNames.includes(name)),
      excluded: [...this.#exclude].sort(),
      incomplete: await this.#source.incomplete(),
    };
  }

  /**
   * Whether a source skill is selected by the include allowlist and not excluded.
   *
   * @param {string} name
   */
  #ships(name) {
    return (this.#include === undefined || this.#include.has(name)) && !this.#exclude.has(name);
  }

  /**
   * @param {string[]} sourceNames
   * @param {string[]} overlayNames
   */
  #checkConsistency(sourceNames, overlayNames) {
    /** @type {string[]} */
    const problems = [];
    for (const name of this.#include ?? []) {
      if (!sourceNames.includes(name)) problems.push(`included skill "${name}" does not exist`);
    }
    for (const name of this.#exclude) {
      if (!sourceNames.includes(name)) problems.push(`excluded skill "${name}" does not exist`);
      if (overlayNames.includes(name)) problems.push(`skill "${name}" is both excluded and overlaid`);
    }
    for (const name of this.#requiredSources) {
      if (!sourceNames.includes(name)) {
        problems.push(`edited skill "${name}" does not exist`);
      } else if (!this.#ships(name) || overlayNames.includes(name)) {
        problems.push(`edited skill "${name}" is not shipped or is overlaid, so its edits would never run`);
      }
    }
    if (problems.length > 0) throw new ConfigError("skill catalog", problems);
  }
}
