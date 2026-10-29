// @ts-check
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MANIFEST_PATH, MCP_CONFIG_PATH, SKILLS_DIR } from "../manifest/ManifestBuilder.mjs";
import { FrontMatter } from "../skill/FrontMatter.mjs";
import { SKILL_FILE } from "../skill/SkillDocument.mjs";
import { listFiles } from "../util/fs.mjs";

/**
 * @typedef {{
 *   dir: string,
 *   path: string,
 *   frontMatter?: Record<string, string>,
 *   body?: string,
 *   error?: string,
 * }} SkillEntry
 *
 * @typedef {{ value?: unknown, error?: string }} JsonEntry
 */

const TEXT_EXTENSIONS = new Set([".md", ".json", ".txt", ".yaml", ".yml", ".svg", ".py", ".sh", ".js", ".mjs", ".ts"]);

/**
 * Read-only snapshot of a staged plugin directory: the exact bytes that will
 * be zipped. Validation rules inspect this view instead of re-reading config, so
 * they check what is actually shipped.
 */
export class PackageView {
  /** @type {string} */ root;
  /** @type {readonly string[]} */ files;
  /** @type {JsonEntry} */ manifest;
  /** @type {JsonEntry} */ mcp;
  /** @type {readonly SkillEntry[]} */ skills;

  /**
   * @param {{ root: string, files: string[], manifest: JsonEntry, mcp: JsonEntry, skills: SkillEntry[] }} init
   */
  constructor({ root, files, manifest, mcp, skills }) {
    this.root = root;
    this.files = Object.freeze(files);
    this.manifest = manifest;
    this.mcp = mcp;
    this.skills = Object.freeze(skills);
    Object.freeze(this);
  }

  /**
   * @param {string} root
   * @returns {Promise<PackageView>}
   */
  static async load(root) {
    const files = existsSync(root) ? await listFiles(root) : [];
    const skills = await Promise.all(
      files
        .filter(file => file.startsWith(`${SKILLS_DIR}/`) && file.endsWith(`/${SKILL_FILE}`))
        .map(async file => {
          const dir = file.slice(SKILLS_DIR.length + 1, -(SKILL_FILE.length + 1));
          try {
            const { data, body } = FrontMatter.parse(await readFile(path.join(root, file), "utf8"), file);
            return { dir, path: file, frontMatter: data, body };
          } catch (error) {
            return { dir, path: file, error: /** @type {Error} */ (error).message };
          }
        }),
    );
    return new PackageView({
      root,
      files,
      manifest: await readJson(root, MANIFEST_PATH),
      mcp: await readJson(root, MCP_CONFIG_PATH),
      skills,
    });
  }

  /** @param {string} relative */
  has(relative) {
    return this.files.includes(relative);
  }

  /** @param {string} relative */
  async readBytes(relative) {
    return readFile(path.join(this.root, relative));
  }

  /** @param {string} relative */
  async readText(relative) {
    return readFile(path.join(this.root, relative), "utf8");
  }

  /** @returns {string[]} Files whose contents are scanned as text. */
  textFiles() {
    return this.files.filter(file => TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()));
  }

  /** @returns {Record<string, unknown> | undefined} */
  manifestObject() {
    const value = this.manifest.value;
    return value && typeof value === "object" && !Array.isArray(value)
      ? /** @type {Record<string, unknown>} */ (value)
      : undefined;
  }
}

/**
 * @param {string} root
 * @param {string} relative
 * @returns {Promise<JsonEntry>}
 */
async function readJson(root, relative) {
  const file = path.join(root, relative);
  if (!existsSync(file)) return { error: `${relative} is missing` };
  try {
    return { value: JSON.parse(await readFile(file, "utf8")) };
  } catch (error) {
    return { error: `${relative} is not valid JSON: ${/** @type {Error} */ (error).message}` };
  }
}
