// @ts-check
import {
  KIMI_ICON_PATH,
  KIMI_LICENSE_PATH,
  KIMI_MANIFEST_PATH,
  KIMI_README_PATH,
  KIMI_SYSTEM_PROMPT_PATH,
  KimiManifestBuilder,
} from "../../../manifest/KimiManifestBuilder.mjs";
import { isPlainObject } from "../../../util/object.mjs";
import { ComponentScopeRule } from "../vendor/ComponentScopeRule.mjs";
import { LicenseRule } from "../vendor/LicenseRule.mjs";
import { DEFAULT_REQUIRED, ReadmeDeclarationRule } from "../vendor/ReadmeDeclarationRule.mjs";
import { KimiArchiveRule } from "./KimiArchiveRule.mjs";
import { KimiInterfaceRule } from "./KimiInterfaceRule.mjs";
import { KimiLocaleRule } from "./KimiLocaleRule.mjs";
import { KimiManifestRule } from "./KimiManifestRule.mjs";
import { KimiMcpRule } from "./KimiMcpRule.mjs";
import { KimiSystemPromptRule } from "./KimiSystemPromptRule.mjs";

/**
 * Rules that apply only to the Kimi plugin format. Shared rules (skills,
 * links, forbidden text, secrets) are added by the composition root.
 *
 * @param {{
 *   licenseFile: string,
 *   expectedName?: string,
 *   mcpUrl?: string,
 *   enabledTools?: readonly string[],
 *   knownTools?: readonly string[],
 *   tools: readonly string[],
 *   locales: readonly string[],
 * }} options `tools` is what the plugin exposes after its allow-list;
 *   `locales` the translated locales the config declares.
 * @returns {import("../../Rule.mjs").Rule[]}
 */
export function createKimiRules({ licenseFile, expectedName, mcpUrl, enabledTools, knownTools, tools, locales }) {
  return [
    new KimiManifestRule({ expectedName }),
    new KimiInterfaceRule(),
    new KimiLocaleRule({ locales }),
    new KimiMcpRule({ expectedUrl: mcpUrl, enabledTools, knownTools }),
    new KimiSystemPromptRule({ tools }),
    new ComponentScopeRule({
      allowedTopLevel: [
        KIMI_MANIFEST_PATH,
        KIMI_SYSTEM_PROMPT_PATH,
        KIMI_README_PATH,
        KIMI_LICENSE_PATH,
        KIMI_ICON_PATH,
        ...locales.map(locale => KimiManifestBuilder.localePath(locale)),
      ],
      platform: "Kimi",
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
        ["/plugins install", "the Kimi Code install command"],
        ["/reload", "that changes apply after a reload"],
        ["Plugin Builder", "how to import it into the Kimi app"],
      ],
    }),
    new LicenseRule({ licenseFile }),
    new KimiArchiveRule(),
  ];
}
