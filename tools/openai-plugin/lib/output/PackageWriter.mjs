// @ts-check
import { chmod, copyFile, mkdir, rm, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { OutputError } from "../errors.mjs";
import { SKILLS_DIR } from "../manifest/ManifestBuilder.mjs";
import { SKILL_FILE } from "../skill/SkillDocument.mjs";
import { isWithin, listFiles } from "../util/fs.mjs";

/** Fixed timestamp applied to every staged file so archives are reproducible. */
export const FIXED_MTIME = new Date("2000-01-01T00:00:00Z");

/**
 * The only component that writes to disk.
 *
 * All writes are confined to `<outRoot>/openai/<pluginName>/` (the staging
 * directory) and `<outRoot>` itself (archives and reports). The constructor
 * refuses an `outRoot` that contains any protected path, so a bad `--out`
 * argument can never wipe or overwrite source files.
 */
export class PackageWriter {
  /** @type {string} */ outRoot;
  /** @type {string} */ stagingDir;

  /**
   * @param {{ outRoot: string, pluginName: string, protectedPaths: readonly string[] }} options
   */
  constructor({ outRoot, pluginName, protectedPaths }) {
    const resolved = path.resolve(outRoot);
    if (resolved === path.parse(resolved).root) {
      throw new OutputError(`Refusing to use the filesystem root as output: ${resolved}`);
    }
    for (const protectedPath of protectedPaths) {
      if (isWithin(resolved, protectedPath)) {
        throw new OutputError(`Output directory ${resolved} would contain protected path ${protectedPath}`);
      }
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(pluginName)) {
      throw new OutputError(`Unsafe plugin name for a directory: ${pluginName}`);
    }
    this.outRoot = resolved;
    this.stagingDir = path.join(resolved, "openai", pluginName);
    Object.freeze(this);
  }

  /** Removes and recreates the staging directory. */
  async reset() {
    await rm(this.stagingDir, { recursive: true, force: true });
    await mkdir(this.stagingDir, { recursive: true });
  }

  /**
   * @param {string} relative
   * @param {unknown} value
   */
  async writeJson(relative, value) {
    await this.writeFile(relative, `${JSON.stringify(value, null, 2)}\n`);
  }

  /**
   * @param {string} relative
   * @param {string | Buffer} content
   */
  async writeFile(relative, content) {
    const target = this.#resolve(relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  /**
   * @param {string} source Absolute source path (read only).
   * @param {string} relative Destination inside the staging directory.
   */
  async copyFile(source, relative) {
    const target = this.#resolve(relative);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }

  /** @param {import("../skill/SkillDocument.mjs").SkillDocument} skill */
  async writeSkill(skill) {
    const base = `${SKILLS_DIR}/${skill.name}`;
    await this.writeFile(`${base}/${SKILL_FILE}`, skill.toSkillText());
    for (const [file, content] of skill.files) {
      await this.writeFile(`${base}/${file}`, content);
    }
  }

  /**
   * Normalizes permissions and timestamps on everything staged.
   *
   * @returns {Promise<string[]>} Sorted relative paths of staged files.
   */
  async seal() {
    const files = await listFiles(this.stagingDir);
    for (const file of files) {
      const target = path.join(this.stagingDir, file);
      await chmod(target, 0o644);
      await utimes(target, FIXED_MTIME, FIXED_MTIME);
    }
    return files;
  }

  /**
   * @param {string} fileName A file name (not a path) placed directly in `outRoot`.
   * @returns {string}
   */
  artifactPath(fileName) {
    if (path.basename(fileName) !== fileName) {
      throw new OutputError(`Artifact name must not contain directories: ${fileName}`);
    }
    return path.join(this.outRoot, fileName);
  }

  /**
   * @param {string} fileName
   * @param {unknown} value
   */
  async writeArtifactJson(fileName, value) {
    await mkdir(this.outRoot, { recursive: true });
    await writeFile(this.artifactPath(fileName), `${JSON.stringify(value, null, 2)}\n`);
  }

  /**
   * @param {string} relative
   * @returns {string}
   */
  #resolve(relative) {
    if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) {
      throw new OutputError(`Refusing to write outside the staging directory: ${relative}`);
    }
    const target = path.resolve(this.stagingDir, relative);
    if (!isWithin(this.stagingDir, target) || target === this.stagingDir) {
      throw new OutputError(`Refusing to write outside the staging directory: ${relative}`);
    }
    return target;
  }
}
