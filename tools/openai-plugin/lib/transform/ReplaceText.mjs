// @ts-check
import { SkillError } from "../errors.mjs";
import { SkillTransform } from "./SkillTransform.mjs";

/**
 * Literal or regular-expression substitution across a skill's Markdown text
 * (body, description, and companion `.md` files), optionally limited to one file.
 */
export class ReplaceText extends SkillTransform {
  /** @type {RegExp} */ #pattern;
  /** @type {string} */ #replace;
  /** @type {string | undefined} */ #file;
  /** @type {boolean} */ #strict;

  /**
   * @param {{
   *   find?: string,
   *   pattern?: string,
   *   flags?: string,
   *   replace: string,
   *   file?: string,
   *   strict?: boolean,
   * }} spec Exactly one of `find` (literal) or `pattern` (regex source) is required.
   *   `strict` makes a substitution that matches nothing an error.
   */
  constructor({ find, pattern, flags = "", replace, file, strict = false }) {
    super();
    if ((find === undefined) === (pattern === undefined)) {
      throw new TypeError("ReplaceText needs exactly one of `find` or `pattern`");
    }
    const source = pattern ?? escapeRegExp(/** @type {string} */ (find));
    this.#pattern = new RegExp(source, flags.includes("g") ? flags : `${flags}g`);
    this.#replace = pattern === undefined ? replace.replaceAll("$", "$$$$") : replace;
    this.#file = file;
    this.#strict = strict;
  }

  get id() {
    return `ReplaceText(${this.#pattern}${this.#file ? ` in ${this.#file}` : ""})`;
  }

  /** @param {import("../skill/SkillDocument.mjs").SkillDocument} doc */
  apply(doc) {
    let count = 0;
    const result = doc.mapText(
      text => {
        const matches = text.match(this.#pattern);
        if (!matches) return text;
        count += matches.length;
        return text.replace(this.#pattern, this.#replace);
      },
      { only: this.#file },
    );
    if (this.#strict && count === 0) {
      throw new SkillError(`${doc.name}: ${this.id} matched nothing; the source skill has changed`);
    }
    return result;
  }
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
