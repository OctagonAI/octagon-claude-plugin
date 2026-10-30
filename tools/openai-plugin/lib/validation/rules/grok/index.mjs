// @ts-check
import { BrandKeywordRule } from "./BrandKeywordRule.mjs";
import { GrokComponentScopeRule } from "./GrokComponentScopeRule.mjs";
import { GrokManifestRule } from "./GrokManifestRule.mjs";
import { GrokMcpConfigRule } from "./GrokMcpConfigRule.mjs";
import { LicenseRule } from "./LicenseRule.mjs";
import { ReadmeDeclarationRule } from "./ReadmeDeclarationRule.mjs";

/** The brand every Grok keyword must carry. */
export const BRAND = "octagon";

/**
 * Rules that apply only to the Grok Build package format. Shared rules
 * (skills, links, forbidden text, secrets) are added by the composition root.
 *
 * @param {{ licenseFile: string, brand?: string, mcpUrl?: string }} options
 *   `mcpUrl` is the server URL the profile config declares; the shipped `.mcp.json` must match it.
 * @returns {import("../../Rule.mjs").Rule[]}
 */
export function createGrokRules({ licenseFile, brand = BRAND, mcpUrl }) {
  return [
    new GrokManifestRule(),
    new GrokMcpConfigRule({ expectedUrl: mcpUrl }),
    new GrokComponentScopeRule(),
    new BrandKeywordRule({ brand }),
    new ReadmeDeclarationRule(),
    new LicenseRule({ licenseFile }),
  ];
}
