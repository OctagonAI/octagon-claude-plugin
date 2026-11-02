// @ts-check
import { SKILLS_DIR } from "../../../manifest/ManifestBuilder.mjs";
import { Rule } from "../../Rule.mjs";

/** Component directories and executable file types no marketplace package may carry. */
const FORBIDDEN = [
  { pattern: /^(?:hooks|commands|agents|policies|themes)\//, reason: "only skills and one MCP server ship; no hooks, commands, or agents (nor policies or themes)" },
  { pattern: /^\.lsp\.json$/, reason: "no LSP servers ship" },
  { pattern: /^\.(?:claude-plugin|codex-plugin|grok-plugin|cursor-plugin)\/|^gemini-extension\.json$/, reason: "other platforms' manifests do not belong in this package" },
  { pattern: /\.(?:sh|bash|zsh|py|rb|pl|js|mjs|cjs|ts|exe|bin|wasm)$/i, reason: "no executable code ships; review audits every script" },
];

/**
 * Least privilege, enforced: a marketplace package is skills plus one remote
 * server plus the files its platform documents. Anything else widens the
 * static security review for no benefit.
 */
export class ComponentScopeRule extends Rule {
  /** @type {ReadonlySet<string>} */ #allowedTopLevel;
  /** @type {string} */ #platform;

  /**
   * @param {{ allowedTopLevel: readonly string[], platform: string }} options
   *   `allowedTopLevel` lists the package-relative files allowed outside
   *   `skills/`, the platform's own manifest included; `platform` names the
   *   package format in findings.
   */
  constructor({ allowedTopLevel, platform }) {
    super();
    this.#allowedTopLevel = new Set(allowedTopLevel);
    this.#platform = platform;
  }

  /** @param {import("../../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const findings = [];
    for (const file of pkg.files) {
      if (this.#allowedTopLevel.has(file)) continue;
      for (const { pattern, reason } of FORBIDDEN) {
        if (pattern.test(file)) findings.push(this.error(reason.replace("this package", `the ${this.#platform} package`), { path: file }));
      }
      if (!file.startsWith(`${SKILLS_DIR}/`)) {
        findings.push(this.error("unexpected file outside skills/", { path: file }));
      }
    }
    return findings;
  }
}
