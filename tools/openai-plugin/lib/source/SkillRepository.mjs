// @ts-check
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { SKILL_FILE, SkillDocument } from "../skill/SkillDocument.mjs";
import { listFiles } from "../util/fs.mjs";

/**
 * Read-only view of a `skills/` directory: one sub-directory per skill, each
 * with a SKILL.md. This class never writes to disk.
 */
export class SkillRepository {
  /** @type {string} */ root;

  /** @param {string} root */
  constructor(root) {
    this.root = path.resolve(root);
    Object.freeze(this);
  }

  /** @returns {Promise<string[]>} Sorted names of directories that contain a SKILL.md. */
  async names() {
    return (await this.#directories()).filter(name => this.#hasSkillFile(name));
  }

  /** @returns {Promise<string[]>} Sorted names of directories missing a SKILL.md. */
  async incomplete() {
    return (await this.#directories()).filter(name => !this.#hasSkillFile(name));
  }

  /**
   * @param {string} name
   * @returns {Promise<SkillDocument>}
   */
  async load(name) {
    const dir = path.join(this.root, name);
    const text = await readFile(path.join(dir, SKILL_FILE), "utf8");
    /** @type {Map<string, Buffer>} */
    const files = new Map();
    for (const file of await listFiles(dir, { skipJunk: true })) {
      if (file !== SKILL_FILE) files.set(file, await readFile(path.join(dir, file)));
    }
    return SkillDocument.fromText(name, text, files);
  }

  /** @returns {Promise<string[]>} */
  async #directories() {
    if (!existsSync(this.root)) return [];
    const entries = await readdir(this.root, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith("."))
      .map(entry => entry.name)
      .sort();
  }

  /** @param {string} name */
  #hasSkillFile(name) {
    return existsSync(path.join(this.root, name, SKILL_FILE));
  }
}
