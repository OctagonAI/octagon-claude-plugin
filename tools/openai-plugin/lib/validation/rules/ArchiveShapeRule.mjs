// @ts-check
import { MANIFEST_PATH } from "../../manifest/ManifestBuilder.mjs";
import { Rule } from "../Rule.mjs";

const MAX_BYTES = 100 * 1024 * 1024;
const MAX_ENTRIES = 5000;
const MAX_DEPTH = 20;

/** ZIP-level limits from the submission error reference, and parity with staging. */
export class ArchiveShapeRule extends Rule {
  get scope() {
    return /** @type {const} */ ("archive");
  }

  /** @param {import("../Rule.mjs").ValidationContext} context */
  check({ pkg, archive }) {
    if (!archive) return [this.error("no archive to inspect")];
    const at = { path: archive.path };
    const findings = [];

    if (archive.bytes > MAX_BYTES) findings.push(this.error("archive exceeds 100 MB", { ...at, code: "archive_too_large" }));
    if (archive.entries.length === 0) findings.push(this.error("archive is empty", { ...at, code: "archive_empty" }));
    if (archive.entries.length > MAX_ENTRIES) {
      findings.push(this.error(`archive has ${archive.entries.length} entries; limit is ${MAX_ENTRIES}`, { ...at, code: "archive_too_many_entries" }));
    }

    const normalized = new Set();
    for (const entry of archive.entries) {
      const where = { path: entry };
      if (entry.includes("\\")) findings.push(this.error("path uses a backslash", { ...where, code: "archive_member_path_has_backslash" }));
      if (entry.startsWith("/")) findings.push(this.error("path is absolute", { ...where, code: "archive_member_path_absolute" }));
      if (entry.split("/").includes("..")) findings.push(this.error("path contains ..", { ...where, code: "archive_member_path_has_parent_segment" }));
      if (entry.split("/").length > MAX_DEPTH) findings.push(this.error(`path is deeper than ${MAX_DEPTH} segments`, { ...where, code: "archive_member_path_too_deep" }));
      const key = entry.normalize("NFC").toLowerCase();
      if (normalized.has(key)) findings.push(this.error("path collides after case/Unicode normalization", { ...where, code: "archive_member_path_normalization_collision" }));
      normalized.add(key);
    }

    if (!archive.entries.includes(MANIFEST_PATH)) {
      findings.push(this.error(`${MANIFEST_PATH} must be at the archive root`, { ...at, code: "plugin_root_ambiguous" }));
    }

    const staged = [...pkg.files].sort().join("\n");
    const zipped = [...archive.entries].sort().join("\n");
    if (staged !== zipped) findings.push(this.error("archive contents differ from the staged package", at));
    return findings;
  }
}
