// @ts-check
import { GROK_ICON_PATH, GROK_LICENSE_PATH, GROK_MANIFEST_PATH, GROK_README_PATH } from "../../../manifest/GrokManifestBuilder.mjs";
import { MCP_CONFIG_PATH } from "../../../manifest/ManifestBuilder.mjs";
import { ComponentScopeRule } from "../vendor/ComponentScopeRule.mjs";

/** The shared scope rule with the Grok package's allowed top-level files. */
export class GrokComponentScopeRule extends ComponentScopeRule {
  constructor() {
    super({
      allowedTopLevel: [GROK_MANIFEST_PATH, MCP_CONFIG_PATH, GROK_README_PATH, GROK_LICENSE_PATH, GROK_ICON_PATH],
      platform: "Grok",
    });
  }
}
