// @ts-check
import { SkillTransform } from "./SkillTransform.mjs";

/** Drops companion files by exact path relative to the skill directory. */
export class RemoveFiles extends SkillTransform {
  /** @type {ReadonlySet<string>} */ #paths;

  /** @param {readonly string[]} paths */
  constructor(paths) {
    super();
    this.#paths = new Set(paths);
  }

  /** @param {import("../skill/SkillDocument.mjs").SkillDocument} doc */
  apply(doc) {
    return doc.withoutFiles(file => this.#paths.has(file));
  }
}
