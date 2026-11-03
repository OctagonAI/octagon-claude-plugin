// @ts-check

/** @typedef {import("../config/PluginConfig.mjs").PluginConfig} PluginConfig */

export const GEMINI_MANIFEST_PATH = "gemini-extension.json";
export const GEMINI_CONTEXT_PATH = "GEMINI.md";
export const GEMINI_README_PATH = "README.md";
export const GEMINI_LICENSE_PATH = "LICENSE";
/** Repository directory (POSIX, relative to the root) that holds the committed Gemini extensions. */
export const GEMINI_EXTENSIONS_DIR = "gemini/extensions";
/** The GitHub topic the gallery crawler indexes. */
export const GEMINI_GALLERY_TOPIC = "gemini-cli-extension";

/**
 * Request timeout for the remote server, in milliseconds. Report generation
 * can run for minutes; this is Gemini CLI's documented default, stated so a
 * reader of the manifest sees it.
 */
export const GEMINI_SERVER_TIMEOUT_MS = 600_000;

/** Manifest fields Gemini CLI documents and this builder may write. */
export const GEMINI_MANIFEST_FIELDS = Object.freeze(["name", "version", "description", "contextFileName", "mcpServers"]);
/** Server fields this builder may write: a remote Streamable HTTP server with OAuth, and nothing local. */
export const GEMINI_SERVER_FIELDS = Object.freeze(["url", "type", "oauth", "includeTools", "timeout"]);

/**
 * Turns a {@link PluginConfig} into a Gemini CLI extension manifest. Pure: no
 * I/O, stable key order.
 *
 * The server is declared with `url` + `type: "http"`, the current form;
 * `httpUrl` is deprecated in Gemini CLI and suspected of failing the gallery
 * crawler's validation. OAuth is left to Gemini CLI's discovery (401 →
 * protected-resource metadata → authorization server → dynamic registration),
 * which our server supports, so no settings or secrets are declared.
 */
export class GeminiManifestBuilder {
  /** @type {PluginConfig} */ #config;

  /** @param {PluginConfig} config */
  constructor(config) {
    this.#config = config;
  }

  /** @returns {string} The MCP server key users see in `/mcp list`. */
  serverName() {
    return this.#config.gemini().serverName ?? this.#config.data.mcp.serverName;
  }

  /** @returns {string[]} The tools the extension exposes after its allow-list. */
  exposedTools() {
    const { includeTools } = this.#config.gemini();
    return [...(includeTools ?? this.#config.data.mcp.tools)];
  }

  /** @returns {Record<string, unknown>} */
  manifest() {
    const config = this.#config.data;
    const { includeTools } = this.#config.gemini();
    const server = compact({
      url: config.mcp.url,
      type: "http",
      oauth: { enabled: true },
      includeTools: includeTools ? [...includeTools] : undefined,
      timeout: GEMINI_SERVER_TIMEOUT_MS,
    });
    return {
      name: config.name,
      version: config.version,
      description: config.description,
      contextFileName: GEMINI_CONTEXT_PATH,
      mcpServers: { [this.serverName()]: server },
    };
  }

  /**
   * The GitHub repository settings the gallery reads: the About description
   * (shown as `repoDescription`), the homepage, and the crawler topic.
   *
   * @returns {{ repository: string, description: string, homepage: string, topics: string[] }}
   */
  aboutSettings() {
    const { repository, repoDescription } = this.#config.gemini();
    return {
      repository,
      description: repoDescription,
      homepage: this.#config.data.homepage ?? "",
      topics: [GEMINI_GALLERY_TOPIC],
    };
  }
}

/**
 * @param {Record<string, unknown>} object
 * @returns {Record<string, unknown>}
 */
function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}
