// @ts-check
import { GEMINI_MANIFEST_PATH, GEMINI_SERVER_FIELDS } from "../../../manifest/GeminiManifestBuilder.mjs";
import { isPlainObject } from "../../../util/object.mjs";
import { Rule } from "../../Rule.mjs";

/** Keys that would make the server local, trusted, or secret-bearing. */
const FORBIDDEN_KEYS = ["httpUrl", "command", "args", "env", "cwd", "headers", "trust", "authProviderType", "targetAudience", "targetServiceAccount"];

/**
 * The manifest's `mcpServers` declares exactly one remote Streamable HTTP
 * server, in the non-deprecated `url` + `type: "http"` form, with OAuth
 * enabled, pointing at the configured endpoint, exposing the configured tool
 * allow-list, and nothing that runs locally or carries a credential.
 */
export class GeminiMcpRule extends Rule {
  /** @type {string | undefined} */ #expectedUrl;
  /** @type {readonly string[] | undefined} */ #includeTools;

  /**
   * @param {{ expectedUrl?: string, includeTools?: readonly string[] }} [options]
   *   `includeTools` is the configured allow-list; `undefined` means the server
   *   must not declare one.
   */
  constructor({ expectedUrl, includeTools } = {}) {
    super();
    this.#expectedUrl = expectedUrl;
    this.#includeTools = includeTools;
  }

  /** @param {import("../../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const at = { path: GEMINI_MANIFEST_PATH };
    const servers = pkg.manifestObject()?.mcpServers;
    if (!isPlainObject(servers)) return [];
    const entries = Object.entries(servers);
    if (entries.length !== 1) return [this.error(`exactly one MCP server is expected, found ${entries.length}`, at)];

    const findings = [];
    const [name, server] = entries[0];
    if (!isPlainObject(server)) return [this.error(`server "${name}" must be an object`, at)];

    for (const key of FORBIDDEN_KEYS) {
      if (key in server) {
        const why = key === "httpUrl" ? "is deprecated in Gemini CLI; use url with type \"http\"" : "must not be set; only a remote OAuth server ships";
        findings.push(this.error(`server "${name}": "${key}" ${why}`, at));
      }
    }
    for (const key of Object.keys(server)) {
      if (!GEMINI_SERVER_FIELDS.includes(key) && !FORBIDDEN_KEYS.includes(key)) {
        findings.push(this.error(`server "${name}": "${key}" is not a field this extension declares`, at));
      }
    }
    if (typeof server.url !== "string" || !server.url.startsWith("https://")) {
      findings.push(this.error(`server "${name}" must have an https:// url`, at));
    } else if (this.#expectedUrl !== undefined && server.url !== this.#expectedUrl) {
      findings.push(this.error(`server "${name}" url ${server.url} differs from the configured ${this.#expectedUrl}`, at));
    }
    if (server.type !== "http") findings.push(this.error(`server "${name}" must declare type "http" (Streamable HTTP)`, at));
    if (!isPlainObject(server.oauth) || server.oauth.enabled !== true) {
      findings.push(this.error(`server "${name}" must declare oauth.enabled: true`, at));
    }
    if (server.timeout !== undefined && (!Number.isInteger(server.timeout) || /** @type {number} */ (server.timeout) <= 0)) {
      findings.push(this.error(`server "${name}" timeout must be a positive integer of milliseconds`, at));
    }
    const declared = server.includeTools;
    if (this.#includeTools === undefined) {
      if (declared !== undefined) findings.push(this.error(`server "${name}" declares includeTools but the config has none`, at));
    } else if (!Array.isArray(declared) || declared.join("\n") !== this.#includeTools.join("\n")) {
      findings.push(this.error(`server "${name}" includeTools must equal the configured allow-list [${this.#includeTools.join(", ")}]`, at));
    }
    return findings;
  }
}
