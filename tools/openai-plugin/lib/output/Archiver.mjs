// @ts-check
import { spawn } from "node:child_process";
import { readFile, rm, stat } from "node:fs/promises";
import { PackagingError } from "../errors.mjs";
import { sha256 } from "../util/fs.mjs";

/**
 * @typedef {{ path: string, bytes: number, sha256: string, entries: string[] }} ArchiveInfo
 */

/**
 * Creates reproducible ZIP archives with the system `zip` binary.
 *
 * Reproducibility comes from: an explicit, sorted file list; `-X` (no extra
 * attributes such as uid/gid or extended timestamps); `-D` (no directory
 * entries); TZ=UTC, so stored DOS timestamps don't depend on the machine; and
 * the fixed mtimes and permissions applied by `PackageWriter.seal()`.
 */
export class Archiver {
  /** @type {string} */ #zip;
  /** @type {string} */ #unzip;

  /** @param {{ zipCommand?: string, unzipCommand?: string }} [options] */
  constructor({ zipCommand = "zip", unzipCommand = "unzip" } = {}) {
    this.#zip = zipCommand;
    this.#unzip = unzipCommand;
  }

  /**
   * @param {string} sourceDir Directory whose contents become the archive root.
   * @param {readonly string[]} files Relative POSIX paths to include.
   * @param {string} zipPath Destination archive.
   * @returns {Promise<ArchiveInfo>}
   */
  async create(sourceDir, files, zipPath) {
    await rm(zipPath, { force: true });
    const list = [...files].sort().join("\n");
    await run(this.#zip, ["-X", "-D", "-q", "-9", zipPath, "-@"], { cwd: sourceDir, input: `${list}\n` });
    return this.inspect(zipPath);
  }

  /**
   * @param {string} zipPath
   * @returns {Promise<ArchiveInfo>}
   */
  async inspect(zipPath) {
    const [{ size }, content, listing] = await Promise.all([
      stat(zipPath),
      readFile(zipPath),
      run(this.#unzip, ["-Z1", zipPath]),
    ]);
    return {
      path: zipPath,
      bytes: size,
      sha256: sha256(content),
      entries: listing.split("\n").filter(Boolean),
    };
  }
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{ cwd?: string, input?: string }} [options]
 * @returns {Promise<string>} stdout
 */
function run(command, args, { cwd, input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, TZ: "UTC" } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => (stdout += chunk));
    child.stderr.on("data", chunk => (stderr += chunk));
    child.on("error", error =>
      reject(new PackagingError(`Could not run "${command}": ${error.message}`, { cause: error })),
    );
    child.on("close", code =>
      code === 0
        ? resolve(stdout)
        : reject(new PackagingError(`"${command} ${args.join(" ")}" exited with ${code}: ${stderr.trim()}`)),
    );
    child.stdin.end(input ?? "");
  });
}
