// @ts-check
import { FrontMatter } from "./FrontMatter.mjs";

export const SKILL_FILE = "SKILL.md";

/**
 * Callback used by {@link SkillDocument#mapText}.
 * `target` is `SKILL.md` for the skill body, `SKILL.md#description` for the
 * front matter description, or the relative path of a companion Markdown file.
 *
 * @callback TextMapper
 * @param {string} text
 * @param {string} target
 * @returns {string}
 */

/**
 * Immutable in-memory representation of one skill directory.
 * Every "mutator" returns a new instance and leaves the original untouched.
 */
export class SkillDocument {
  /** @type {string} */ name;
  /** @type {Readonly<Record<string, string>>} */ frontMatter;
  /** @type {string} */ body;
  /** @type {ReadonlyMap<string, Buffer>} */ files;

  /**
   * @param {{
   *   name: string,
   *   frontMatter: Record<string, string>,
   *   body: string,
   *   files?: ReadonlyMap<string, Buffer>,
   * }} init
   */
  constructor({ name, frontMatter, body, files = new Map() }) {
    this.name = name;
    this.frontMatter = Object.freeze({ ...frontMatter });
    this.body = body;
    this.files = new Map([...files].sort(([a], [b]) => a.localeCompare(b)));
    Object.freeze(this);
  }

  /**
   * @param {string} name Directory name of the skill.
   * @param {string} skillText Contents of SKILL.md.
   * @param {ReadonlyMap<string, Buffer>} [files] Companion files keyed by relative path.
   * @returns {SkillDocument}
   */
  static fromText(name, skillText, files) {
    const { data, body } = FrontMatter.parse(skillText, `${name}/${SKILL_FILE}`);
    return new SkillDocument({ name, frontMatter: data, body, files });
  }

  /** @returns {string} */
  get description() {
    return this.frontMatter.description ?? "";
  }

  /** @returns {string} Serialized SKILL.md. */
  toSkillText() {
    return FrontMatter.serialize(this.frontMatter, this.body);
  }

  /** @returns {string[]} Relative paths of companion Markdown files. */
  markdownFiles() {
    return [...this.files.keys()].filter(file => file.endsWith(".md"));
  }

  /**
   * Applies `mapper` to the body, the description, and companion Markdown files.
   *
   * @param {TextMapper} mapper
   * @param {{ only?: string }} [options] Limit to one file (`SKILL.md` covers body and description).
   * @returns {SkillDocument}
   */
  mapText(mapper, { only } = {}) {
    const includes = (/** @type {string} */ file) => only === undefined || only === file;

    const frontMatter = { ...this.frontMatter };
    let body = this.body;
    if (includes(SKILL_FILE)) {
      body = mapper(body, SKILL_FILE);
      if (frontMatter.description !== undefined) {
        frontMatter.description = mapper(frontMatter.description, `${SKILL_FILE}#description`);
      }
    }

    const files = new Map(this.files);
    for (const file of this.markdownFiles()) {
      if (!includes(file)) continue;
      const original = /** @type {Buffer} */ (this.files.get(file)).toString("utf8");
      const mapped = mapper(original, file);
      if (mapped !== original) files.set(file, Buffer.from(mapped, "utf8"));
    }

    return new SkillDocument({ name: this.name, frontMatter, body, files });
  }

  /**
   * @param {(file: string) => boolean} predicate Files for which this returns true are dropped.
   * @returns {SkillDocument}
   */
  withoutFiles(predicate) {
    const files = new Map([...this.files].filter(([file]) => !predicate(file)));
    return new SkillDocument({ ...this, files });
  }
}
