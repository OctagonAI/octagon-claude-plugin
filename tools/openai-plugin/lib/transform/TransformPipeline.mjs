// @ts-check
import { SkillTransform } from "./SkillTransform.mjs";

/** Composite transform: applies its children in order. */
export class TransformPipeline extends SkillTransform {
  /** @type {readonly SkillTransform[]} */ #steps;

  /** @param {readonly SkillTransform[]} steps */
  constructor(steps) {
    super();
    this.#steps = Object.freeze([...steps]);
  }

  /** @returns {readonly SkillTransform[]} */
  get steps() {
    return this.#steps;
  }

  /** @param {import("../skill/SkillDocument.mjs").SkillDocument} doc */
  apply(doc) {
    return this.#steps.reduce((current, step) => step.apply(current), doc);
  }
}
