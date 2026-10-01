// @ts-check
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Creates a temporary directory that is removed when the test finishes.
 *
 * @param {import("node:test").TestContext} t
 * @returns {Promise<string>}
 */
export async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "octagon-openai-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

/**
 * Writes a tree of files: keys are relative paths, values are contents.
 *
 * @param {string} root
 * @param {Record<string, string | Buffer>} files
 */
export async function writeTree(root, files) {
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

/**
 * @param {string} name
 * @param {string} description
 * @param {string} [body]
 * @returns {string}
 */
export function skillText(name, description, body = "\n# Title\n\nInstructions.\n") {
  return `---\nname: ${name}\ndescription: ${description}\n---\n${body}`;
}

/**
 * Minimal valid PNG header (signature + IHDR) of the given size.
 *
 * @param {number} width
 * @param {number} height
 * @returns {Buffer}
 */
export function pngHeader(width, height) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}
