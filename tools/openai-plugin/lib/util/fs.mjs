// @ts-check
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/** OS metadata files that never belong in a package. */
const JUNK_FILE = /^(?:\.DS_Store|Thumbs\.db|\._.*)$/;

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isJunkFile(name) {
  return JUNK_FILE.test(name);
}

/**
 * Lists every regular file under `root` as sorted, POSIX-style relative paths.
 *
 * @param {string} root
 * @param {{ skipJunk?: boolean }} [options]
 * @returns {Promise<string[]>}
 */
export async function listFiles(root, { skipJunk = false } = {}) {
  /** @type {string[]} */
  const files = [];

  /** @param {string} dir */
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (skipJunk && isJunkFile(entry.name)) continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        files.push(toPosix(path.relative(root, absolute)));
      }
    }
  }

  await walk(root);
  return files.sort();
}

/**
 * @param {string} relativePath
 * @returns {string}
 */
export function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

/**
 * @param {string | Buffer} content
 * @returns {string}
 */
export function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Hashes a directory tree (paths and contents) into a single digest.
 *
 * @param {string} root
 * @returns {Promise<string>}
 */
export async function hashTree(root) {
  const hash = createHash("sha256");
  for (const file of await listFiles(root)) {
    hash.update(file).update("\0").update(await readFile(path.join(root, file))).update("\0");
  }
  return hash.digest("hex");
}

/**
 * True when `child` is `parent` or lives underneath it.
 *
 * @param {string} parent
 * @param {string} child
 * @returns {boolean}
 */
export function isWithin(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/**
 * Resolves a path to its canonical form even when it does not exist yet: the
 * nearest existing ancestor is resolved through symlinks, and the missing
 * components are appended unchanged. Use it before comparing a user-supplied
 * path against protected locations, since `path.resolve` leaves symlinks in
 * place and a link inside the output directory could otherwise point anywhere.
 *
 * @param {string} target
 * @returns {string}
 */
export function canonicalize(target) {
  let current = path.resolve(target);
  /** @type {string[]} */
  const missing = [];
  for (;;) {
    try {
      return path.join(realpathSync(current), ...missing);
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return path.join(current, ...missing);
      missing.unshift(path.basename(current));
      current = parent;
    }
  }
}
