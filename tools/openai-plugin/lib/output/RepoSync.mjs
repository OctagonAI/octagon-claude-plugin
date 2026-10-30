// @ts-check
import { existsSync, lstatSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, rmdir } from "node:fs/promises";
import path from "node:path";
import { OutputError } from "../errors.mjs";
import { GROK_PLUGINS_DIR } from "../manifest/GrokManifestBuilder.mjs";
import { canonicalize, isWithin, listFiles } from "../util/fs.mjs";

/** The one place under the repository that generated Grok packages may occupy. */
export const SYNC_ROOT = GROK_PLUGINS_DIR.split("/").join(path.sep);

/**
 * @typedef {"added" | "changed" | "removed"} DriftKind
 * @typedef {{ path: string, kind: DriftKind }} Drift
 */

/**
 * Copies a validated Grok staging directory into the repository so the
 * marketplace can reference it by commit.
 *
 * This is the only component allowed to write into the source tree, and it
 * may only write under `grok/plugins/<pluginName>/`. Both ends are
 * canonicalized, the destination may not be a symlink, the staging directory
 * may not be inside the destination, and a build whose validation failed is
 * refused outright. `check()` reports drift without writing, for CI.
 */
export class RepoSync {
  /** @type {string} */ repoRoot;
  /** @type {string} */ targetDir;

  /** @param {{ repoRoot: string, pluginName: string }} options */
  constructor({ repoRoot, pluginName }) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(pluginName)) {
      throw new OutputError(`Unsafe plugin name for a directory: ${pluginName}`);
    }
    this.repoRoot = canonicalize(repoRoot);
    const target = canonicalize(path.join(this.repoRoot, SYNC_ROOT, pluginName));
    if (!isWithin(path.join(this.repoRoot, SYNC_ROOT), target) || path.basename(target) !== pluginName) {
      throw new OutputError(`Sync target ${target} is outside ${SYNC_ROOT}`);
    }
    this.targetDir = target;
    Object.freeze(this);
  }

  /**
   * @param {string} stagingDir
   * @param {{ ok: boolean }} build The build result the staging directory came from.
   */
  async sync(stagingDir, build) {
    if (!build.ok) throw new OutputError("Refusing to sync a build whose validation failed");
    const source = this.#checkedSource(stagingDir);
    this.#checkTarget();

    const staged = await listFiles(source);
    await mkdir(this.targetDir, { recursive: true });
    const existing = existsSync(this.targetDir) ? await listFiles(this.targetDir) : [];

    for (const file of staged) {
      const destination = path.join(this.targetDir, file);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(source, file), destination);
    }
    for (const file of existing.filter(candidate => !staged.includes(candidate))) {
      await rm(path.join(this.targetDir, file), { force: true });
    }
    await pruneEmptyDirs(this.targetDir);
    return staged;
  }

  /**
   * @param {string} stagingDir
   * @returns {Promise<Drift[]>} Empty when the committed directory matches the staging directory.
   */
  async check(stagingDir) {
    const source = this.#checkedSource(stagingDir);
    this.#checkTarget();
    const staged = await listFiles(source);
    const committed = existsSync(this.targetDir) ? await listFiles(this.targetDir) : [];

    /** @type {Drift[]} */
    const drift = [];
    for (const file of staged) {
      if (!committed.includes(file)) {
        drift.push({ path: file, kind: "added" });
        continue;
      }
      const [a, b] = await Promise.all([readFile(path.join(source, file)), readFile(path.join(this.targetDir, file))]);
      if (!a.equals(b)) drift.push({ path: file, kind: "changed" });
    }
    for (const file of committed.filter(candidate => !staged.includes(candidate))) {
      drift.push({ path: file, kind: "removed" });
    }
    return drift;
  }

  /**
   * @param {string} stagingDir
   * @returns {string}
   */
  #checkedSource(stagingDir) {
    const source = canonicalize(stagingDir);
    if (!existsSync(source)) throw new OutputError(`Nothing to sync at ${source}; run the build first`);
    if (isWithin(this.targetDir, source) || isWithin(source, this.targetDir)) {
      throw new OutputError(`Staging directory ${source} overlaps the sync target ${this.targetDir}`);
    }
    return source;
  }

  #checkTarget() {
    if (existsSync(this.targetDir) && lstatSync(this.targetDir).isSymbolicLink()) {
      throw new OutputError(`Sync target ${this.targetDir} is a symbolic link`);
    }
    if (canonicalize(this.targetDir) !== this.targetDir) {
      throw new OutputError(`Sync target ${this.targetDir} no longer resolves inside the repository`);
    }
  }
}

/**
 * Removes subdirectories of `root` left empty after stale files were deleted.
 * `root` itself is kept.
 *
 * @param {string} root
 */
async function pruneEmptyDirs(root) {
  /** @param {string} dir @returns {Promise<boolean>} True when `dir` is now empty. */
  async function prune(dir) {
    let remaining = 0;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory() && (await prune(child))) {
        await rmdir(child);
      } else {
        remaining += 1;
      }
    }
    return remaining === 0;
  }
  await prune(root);
}
