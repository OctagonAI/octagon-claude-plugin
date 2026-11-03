// @ts-check
import { GEMINI_CONTEXT_PATH, GEMINI_LICENSE_PATH, GEMINI_MANIFEST_PATH, GEMINI_README_PATH } from "../../../manifest/GeminiManifestBuilder.mjs";
import { isPlainObject } from "../../../util/object.mjs";
import { ComponentScopeRule } from "../vendor/ComponentScopeRule.mjs";
import { LicenseRule } from "../vendor/LicenseRule.mjs";
import { DEFAULT_REQUIRED, ReadmeDeclarationRule } from "../vendor/ReadmeDeclarationRule.mjs";
import { GeminiContextRule } from "./GeminiContextRule.mjs";
import { GeminiManifestRule } from "./GeminiManifestRule.mjs";
import { GeminiMcpRule } from "./GeminiMcpRule.mjs";

/**
 * Rules that apply only to the Gemini CLI extension format. Shared rules
 * (skills, links, forbidden text, secrets) are added by the composition root.
 *
 * @param {{
 *   licenseFile: string,
 *   expectedName?: string,
 *   mcpUrl?: string,
 *   includeTools?: readonly string[],
 *   tools: readonly string[],
 * }} options `tools` is what the extension exposes after its allow-list.
 * @returns {import("../../Rule.mjs").Rule[]}
 */
export function createGeminiRules({ licenseFile, expectedName, mcpUrl, includeTools, tools }) {
  return [
    new GeminiManifestRule({ expectedName }),
    new GeminiMcpRule({ expectedUrl: mcpUrl, includeTools }),
    new GeminiContextRule({ tools }),
    new ComponentScopeRule({
      allowedTopLevel: [GEMINI_MANIFEST_PATH, GEMINI_CONTEXT_PATH, GEMINI_README_PATH, GEMINI_LICENSE_PATH],
      platform: "Gemini",
    }),
    new ReadmeDeclarationRule({
      endpoints: pkg => {
        const servers = pkg.manifestObject()?.mcpServers;
        return isPlainObject(servers)
          ? Object.values(servers).flatMap(server => (isPlainObject(server) && typeof server.url === "string" ? [server.url] : []))
          : [];
      },
      required: [
        ...DEFAULT_REQUIRED,
        ["gemini extensions install", "the Gemini CLI install command"],
        ["agy plugin install", "the Antigravity CLI install command"],
        ["/mcp auth", "how to sign in"],
      ],
    }),
    new LicenseRule({ licenseFile }),
  ];
}
