// @ts-check
import { ConfigError } from "../errors.mjs";

/**
 * World Monitor (koala73/worldmonitor) lists third-party MCP servers in a
 * "Quick Connect" catalog, `MCP_PRESETS` in `src/services/mcp-store.ts`. A
 * preset prefills the connect form; the user pastes an API key and gets a
 * dashboard panel that calls one tool on a refresh interval. Every preset host
 * also needs a row in `shared/source-attribution-manifest.json`, which
 * generates the public sources page.
 *
 * This builder turns a profile's `worldmonitor` block plus its `mcp` block
 * into both artifacts, so the copy World Monitor ships comes from the same
 * place as every other vendor's.
 */

/** Where the generated artifacts live in this repository (POSIX, repo-relative). */
export const WORLDMONITOR_PRESETS_PATH = "worldmonitor/presets.generated.json";
export const WORLDMONITOR_MANIFEST_ROW_PATH = "worldmonitor/source-attribution-row.json";

/** The header template World Monitor's connect modal turns into a single API-key field. */
export const WORLDMONITOR_API_KEY_HEADER = "Authorization: Bearer {key}";

/** The one host every Octagon preset points at; one attribution row covers them all. */
export const OCTAGON_MCP_HOST = "mcp.octagonai.co";

/**
 * @typedef {{
 *   name: string,
 *   icon: string,
 *   description: string,
 *   serverUrl: string,
 *   authNote: string,
 *   apiKeyHeader: string,
 *   defaultTool: string,
 *   defaultArgs: Record<string, unknown>,
 *   defaultTitle: string,
 * }} WorldMonitorPreset Mirrors World Monitor's `McpPreset` interface, every optional field filled.
 *
 * @typedef {{
 *   host: string,
 *   provider: string,
 *   kind: "structured",
 *   observed: true,
 *   license: string,
 *   attribution: string,
 *   status: "terms-review",
 *   references: { path: string }[],
 * }} AttributionRow One entry of `shared/source-attribution-manifest.json`.
 */

/** Upper bound World Monitor's catalog cards render without truncating. */
const DESCRIPTION_MAX = 110;

export class WorldMonitorCatalogBuilder {
  /** @type {import("../config/PluginConfig.mjs").PluginConfig} */ config;

  /** @param {import("../config/PluginConfig.mjs").PluginConfig} config */
  constructor(config) {
    this.config = config;
    Object.freeze(this);
  }

  /**
   * The preset for this profile. The server URL is the plugin's own MCP
   * endpoint unless the block overrides it (the umbrella plugin points at the
   * public-markets endpoint so a polling panel cannot reach deep research).
   *
   * @returns {WorldMonitorPreset}
   */
  preset() {
    const { data } = this.config;
    const block = this.config.worldmonitor();
    const serverUrl = block.serverUrl ?? data.mcp.url;
    const tools = block.serverUrl ? block.tools ?? data.mcp.tools : data.mcp.tools;
    if (!tools.includes(block.defaultTool)) {
      throw new ConfigError(`plugin "${data.name}"`, [
        `worldmonitor.defaultTool "${block.defaultTool}" is not served by ${serverUrl} (tools: ${tools.join(", ")})`,
      ]);
    }
    if (block.description.length > DESCRIPTION_MAX) {
      throw new ConfigError(`plugin "${data.name}"`, [`worldmonitor.description must be at most ${DESCRIPTION_MAX} characters`]);
    }
    return {
      name: block.name,
      icon: block.icon,
      description: block.description,
      serverUrl,
      authNote: `Requires Authorization: Bearer <OCTAGON_API_KEY> (${block.authHint})`,
      apiKeyHeader: WORLDMONITOR_API_KEY_HEADER,
      defaultTool: block.defaultTool,
      defaultArgs: { ...block.defaultArgs },
      defaultTitle: block.defaultTitle,
    };
  }

  /**
   * Renders one preset as the TypeScript object literal World Monitor's file
   * uses: single quotes, two-space indent, trailing comma, key order as the
   * `McpPreset` interface declares it. Pasted verbatim into `MCP_PRESETS`.
   *
   * @param {WorldMonitorPreset} preset
   * @returns {string}
   */
  static renderTypeScript(preset) {
    const quote = (/** @type {string} */ s) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
    const args = Object.entries(preset.defaultArgs)
      .map(([key, value]) => `${key}: ${typeof value === "string" ? quote(value) : JSON.stringify(value)}`)
      .join(", ");
    return [
      "  {",
      `    name: ${quote(preset.name)},`,
      `    icon: ${quote(preset.icon)},`,
      `    description: ${quote(preset.description)},`,
      `    serverUrl: ${quote(preset.serverUrl)},`,
      `    authNote: ${quote(preset.authNote)},`,
      `    apiKeyHeader: ${quote(preset.apiKeyHeader)},`,
      `    defaultTool: ${quote(preset.defaultTool)},`,
      `    defaultArgs: { ${args} },`,
      `    defaultTitle: ${quote(preset.defaultTitle)},`,
      "  },",
    ].join("\n");
  }

  /**
   * The attribution-manifest row for the Octagon MCP host. World Monitor's
   * script discovers the host from `src/services/mcp-store.ts`, so that is the
   * only reference; `status` starts as `terms-review` like every commercial
   * API in their ledger and is flipped by the maintainer.
   *
   * @param {{ termsUrl: string, homepage: string }} octagon
   * @returns {AttributionRow}
   */
  static attributionRow({ termsUrl, homepage }) {
    return {
      host: OCTAGON_MCP_HOST,
      provider: "Octagon AI",
      kind: "structured",
      observed: true,
      license: `Octagon Terms of Service (${termsUrl}); per-request agent output under the user's own API key, not redistributed by World Monitor`,
      attribution: `Credit Octagon AI and link to ${homepage}. Answers carry their own upstream citations (SEC filings, transcripts, market data providers).`,
      status: "terms-review",
      references: [{ path: "src/services/mcp-store.ts" }],
    };
  }
}
