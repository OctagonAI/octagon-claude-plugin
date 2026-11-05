// @ts-check
import { KIMI_LOCALES_DIR, KIMI_MANIFEST_PATH } from "../../../manifest/KimiManifestBuilder.mjs";
import { SKILLS_DIR } from "../../../manifest/ManifestBuilder.mjs";
import { Rule } from "../../Rule.mjs";

/** The hosted validator's archive limits. */
export const KIMI_ARCHIVE_MAX_BYTES = 64 * 1024 * 1024;
export const KIMI_ARCHIVE_MAX_ENTRIES = 500;
/** Warn well before the cap: the skill catalog grows, and a failed upload is the worst time to learn the number. */
export const KIMI_ARCHIVE_WARN_ENTRIES = 450;

/**
 * The release ZIP as the hosted validator and Kimi Code's installer see it:
 * the manifest at the root with `skills/` and `locales/` beside it, within
 * the size and entry limits, portable paths, and contents identical to the
 * staged package.
 */
export class KimiArchiveRule extends Rule {
  get scope() {
    return /** @type {const} */ ("archive");
  }

  /** @param {import("../../Rule.mjs").ValidationContext} context */
  check({ pkg, archive }) {
    if (!archive) return [this.error("no archive to inspect")];
    const at = { path: archive.path };
    const findings = [];

    if (archive.bytes > KIMI_ARCHIVE_MAX_BYTES) findings.push(this.error(`archive is ${archive.bytes} bytes; the limit is 64 MiB`, at));
    if (archive.entries.length === 0) findings.push(this.error("archive is empty", at));
    if (archive.entries.length > KIMI_ARCHIVE_MAX_ENTRIES) {
      findings.push(this.error(`archive has ${archive.entries.length} entries; the limit is ${KIMI_ARCHIVE_MAX_ENTRIES}`, at));
    } else if (archive.entries.length >= KIMI_ARCHIVE_WARN_ENTRIES) {
      findings.push(this.warning(`archive has ${archive.entries.length} entries; the limit is ${KIMI_ARCHIVE_MAX_ENTRIES}, consolidate skill references before it is reached`, at));
    }

    for (const entry of archive.entries) {
      const where = { path: entry };
      if (entry.includes("\\")) findings.push(this.error("path uses a backslash", where));
      if (entry.startsWith("/")) findings.push(this.error("path is absolute", where));
      if (entry.split("/").includes("..")) findings.push(this.error("path contains ..", where));
    }

    if (!archive.entries.includes(KIMI_MANIFEST_PATH)) findings.push(this.error(`${KIMI_MANIFEST_PATH} must be at the archive root`, at));
    for (const dir of [SKILLS_DIR, KIMI_LOCALES_DIR]) {
      if (!archive.entries.some(entry => entry.startsWith(`${dir}/`))) findings.push(this.error(`${dir}/ must sit beside the manifest at the archive root`, at));
    }

    const staged = [...pkg.files].sort().join("\n");
    const zipped = [...archive.entries].sort().join("\n");
    if (staged !== zipped) findings.push(this.error("archive contents differ from the staged package", at));
    return findings;
  }
}
