// @ts-check
import { GROK_ICON_PATH, GROK_LICENSE_PATH, GROK_MANIFEST_PATH, GROK_README_PATH } from "../../../manifest/GrokManifestBuilder.mjs";
import { MCP_CONFIG_PATH, SKILLS_DIR } from "../../../manifest/ManifestBuilder.mjs";
import { Rule } from "../../Rule.mjs";

/** Component directories and executable file types the package must not carry. */
const FORBIDDEN = [
  { pattern: /^(?:hooks|commands|agents)\//, reason: "only skills and one MCP server ship; no hooks, commands, or agents" },
  { pattern: /^\.lsp\.json$/, reason: "no LSP servers ship" },
  { pattern: /^\.(?:claude-plugin|codex-plugin)\//, reason: "other platforms' manifests do not belong in the Grok package" },
  { pattern: /\.(?:sh|bash|zsh|py|rb|pl|js|mjs|cjs|ts|exe|bin|wasm)$/i, reason: "no executable code ships; review audits every script" },
];

/** Files allowed outside `skills/`. */
const ALLOWED_TOP_LEVEL = new Set([GROK_MANIFEST_PATH, MCP_CONFIG_PATH, GROK_README_PATH, GROK_LICENSE_PATH, GROK_ICON_PATH]);

/**
 * Least privilege, enforced: the package is skills plus one remote server.
 * Anything else widens the static security review for no benefit.
 */
export class GrokComponentScopeRule extends Rule {
  /** @param {import("../../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const findings = [];
    for (const file of pkg.files) {
      for (const { pattern, reason } of FORBIDDEN) {
        if (pattern.test(file)) findings.push(this.error(reason, { path: file }));
      }
      if (!file.startsWith(`${SKILLS_DIR}/`) && !ALLOWED_TOP_LEVEL.has(file)) {
        findings.push(this.error("unexpected file outside skills/", { path: file }));
      }
    }
    return findings;
  }
}
