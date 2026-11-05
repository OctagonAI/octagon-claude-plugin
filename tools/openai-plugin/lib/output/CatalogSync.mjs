// @ts-check
import { existsSync, lstatSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { OutputError } from "../errors.mjs";
import { canonicalize, isWithin } from "../util/fs.mjs";

/**
 * Writes one generated JSON catalog into the repository, at a fixed POSIX
 * path under a vendor directory (`kimi/marketplace.json`), and reports drift
 * for CI. Like {@link RepoSync} it is confined: the path is validated, both
 * ends are canonicalized, and the destination may not be a symlink.
 */
export class CatalogSync {
  /** @type {string} */ repoRoot;
  /** @type {string} */ file;

  /**
   * @param {{ repoRoot: string, relativePath: string }} options `relativePath` is POSIX, relative to the repository root.
   */
  constructor({ repoRoot, relativePath }) {
    if (!/^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9.-]*)*\.json$/.test(relativePath)) {
      throw new OutputError(`Unsafe catalog path: ${relativePath}`);
    }
    this.repoRoot = canonicalize(repoRoot);
    const file = canonicalize(path.join(this.repoRoot, ...relativePath.split("/")));
    if (!isWithin(this.repoRoot, file) || file === this.repoRoot) throw new OutputError(`Catalog ${file} is outside ${this.repoRoot}`);
    this.file = file;
    Object.freeze(this);
  }

  /**
   * @param {unknown} catalog
   * @returns {string} The exact text written or compared.
   */
  static render(catalog) {
    return `${JSON.stringify(catalog, null, 2)}\n`;
  }

  /** @param {unknown} catalog */
  async write(catalog) {
    this.#checkTarget();
    await mkdir(path.dirname(this.file), { recursive: true });
    await writeFile(this.file, CatalogSync.render(catalog));
  }

  /**
   * @param {unknown} catalog
   * @returns {Promise<"missing" | "changed" | null>} `null` when the committed file matches.
   */
  async check(catalog) {
    this.#checkTarget();
    if (!existsSync(this.file)) return "missing";
    const committed = await readFile(this.file, "utf8");
    return committed === CatalogSync.render(catalog) ? null : "changed";
  }

  #checkTarget() {
    if (existsSync(this.file) && lstatSync(this.file).isSymbolicLink()) {
      throw new OutputError(`Catalog ${this.file} is a symbolic link`);
    }
  }
}
