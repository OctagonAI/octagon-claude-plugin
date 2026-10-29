// @ts-check

/** @typedef {import("../skill/SkillDocument.mjs").SkillDocument} SkillDocument */

/**
 * A pure, deterministic rewrite of a {@link SkillDocument}.
 * Subclasses must not perform I/O and must return a new document.
 *
 * @abstract
 */
export class SkillTransform {
  /** @returns {string} Human-readable identifier used in error messages. */
  get id() {
    return this.constructor.name;
  }

  /**
   * @param {SkillDocument} _doc
   * @returns {SkillDocument}
   */
  apply(_doc) {
    throw new Error(`${this.id}.apply() is not implemented`);
  }
}
