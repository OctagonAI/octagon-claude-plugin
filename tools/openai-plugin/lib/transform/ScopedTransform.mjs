// @ts-check
import { SkillTransform } from "./SkillTransform.mjs";

/**
 * Applies an inner transform to a subset of skills: either `only` the named
 * skills, or every skill `except` the named ones.
 */
export class ScopedTransform extends SkillTransform {
  /** @type {ReadonlySet<string>} */ #names;
  /** @type {boolean} */ #include;
  /** @type {SkillTransform} */ #inner;

  /**
   * @param {{ only: readonly string[] } | { except: readonly string[] }} scope
   * @param {SkillTransform} inner
   */
  constructor(scope, inner) {
    super();
    this.#include = "only" in scope;
    this.#names = new Set("only" in scope ? scope.only : scope.except);
    this.#inner = inner;
  }

  get id() {
    const names = [...this.#names].join(",");
    return `${this.#include ? "only" : "except"}[${names}]:${this.#inner.id}`;
  }

  /** @param {import("../skill/SkillDocument.mjs").SkillDocument} doc */
  apply(doc) {
    return this.#names.has(doc.name) === this.#include ? this.#inner.apply(doc) : doc;
  }
}
