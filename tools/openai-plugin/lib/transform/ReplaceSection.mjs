// @ts-check
import { SkillError } from "../errors.mjs";
import { replaceSection } from "../skill/markdown.mjs";
import { SKILL_FILE } from "../skill/SkillDocument.mjs";
import { SkillTransform } from "./SkillTransform.mjs";

/**
 * Replaces a Markdown section (heading through the next heading of the same or
 * higher level) with new content, or removes it when `body` is `null`.
 */
export class ReplaceSection extends SkillTransform {
  /** @type {string} */ #file;
  /** @type {string} */ #heading;
  /** @type {string | null} */ #body;
  /** @type {boolean} */ #strict;

  /**
   * @param {{ file?: string, heading: string, body?: string | null, strict?: boolean }} spec
   *   `strict` makes a missing heading an error, which surfaces upstream drift.
   */
  constructor({ file = SKILL_FILE, heading, body = null, strict = false }) {
    super();
    this.#file = file;
    this.#heading = heading;
    this.#body = body;
    this.#strict = strict;
  }

  get id() {
    return `ReplaceSection(${this.#file} ${this.#heading})`;
  }

  /** @param {import("../skill/SkillDocument.mjs").SkillDocument} doc */
  apply(doc) {
    let count = 0;
    const result = doc.mapText(
      (text, target) => {
        if (target.endsWith("#description")) return text;
        const replaced = replaceSection(text, this.#heading, this.#body);
        count += replaced.count;
        return replaced.text;
      },
      { only: this.#file },
    );
    if (this.#strict && count === 0) {
      throw new SkillError(`${doc.name}: ${this.id} matched nothing; the source skill has changed`);
    }
    return result;
  }
}
