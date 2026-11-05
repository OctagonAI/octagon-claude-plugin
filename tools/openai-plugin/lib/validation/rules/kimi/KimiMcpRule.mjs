// @ts-check
import { KIMI_MANIFEST_PATH, KIMI_SERVER_FIELDS } from "../../../manifest/KimiManifestBuilder.mjs";
import { isPlainObject } from "../../../util/object.mjs";
import { Rule } from "../../Rule.mjs";

/** Keys that would make the server local, legacy, or credential-bearing. */
const FORBIDDEN_KEYS = ["command", "args", "env", "cwd", "environment_id", "headers", "bearerTokenEnvVar", "transport", "disabledTools", "deferred"];

/**
 * The manifest's `mcpServers` declares exactly one remote HTTP server (a
 * `url` with no `transport`, which Kimi reads as Streamable HTTP), native
 * OAuth (`auth: "oauth"`), the configured endpoint, the configured tool
 * allow-list, a tool timeout, and nothing that runs locally or carries a
 * credential. The hosted platform forbids stdio outright.
 */
export class KimiMcpRule extends Rule {
  /** @type {string | undefined} */ #expectedUrl;
  /** @type {readonly string[] | undefined} */ #enabledTools;
  /** @type {readonly string[]} */ #knownTools;

  /**
   * @param {{ expectedUrl?: string, enabledTools?: readonly string[], knownTools?: readonly string[] }} [options]
   *   `enabledTools` is the configured allow-list; `undefined` means the
   *   server must not declare one. `knownTools` is everything the endpoint serves.
   */
  constructor({ expectedUrl, enabledTools, knownTools = [] } = {}) {
    super();
    this.#expectedUrl = expectedUrl;
    this.#enabledTools = enabledTools;
    this.#knownTools = knownTools;
  }

  /** @param {import("../../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const at = { path: KIMI_MANIFEST_PATH };
    const servers = pkg.manifestObject()?.mcpServers;
    if (!isPlainObject(servers)) return [];
    const entries = Object.entries(servers);
    if (entries.length !== 1) return [this.error(`exactly one MCP server is expected, found ${entries.length}`, at)];

    const findings = [];
    const [name, server] = entries[0];
    if (!isPlainObject(server)) return [this.error(`server "${name}" must be an object`, at)];
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) findings.push(this.error(`server key "${name}" must be kebab-case; it is the mcpOverrides key and the mcp_key in the catalog`, at));

    for (const key of FORBIDDEN_KEYS) {
      if (key in server) {
        const why =
          key === "transport"
            ? "must be omitted; a url without transport is Streamable HTTP, and SSE is legacy"
            : "must not be set; only a remote OAuth server ships";
        findings.push(this.error(`server "${name}": "${key}" ${why}`, at));
      }
    }
    for (const key of Object.keys(server)) {
      if (!KIMI_SERVER_FIELDS.includes(key) && !FORBIDDEN_KEYS.includes(key)) {
        findings.push(this.error(`server "${name}": "${key}" is not a field this plugin declares`, at));
      }
    }
    if (typeof server.url !== "string" || !server.url.startsWith("https://")) {
      findings.push(this.error(`server "${name}" must have an https:// url`, at));
    } else if (this.#expectedUrl !== undefined && server.url !== this.#expectedUrl) {
      findings.push(this.error(`server "${name}" url ${server.url} differs from the configured ${this.#expectedUrl}`, at));
    }
    if (server.auth !== "oauth") findings.push(this.error(`server "${name}" must declare auth: "oauth" (Kimi's native MCP OAuth)`, at));
    if (server.toolTimeoutMs !== undefined && (!Number.isInteger(server.toolTimeoutMs) || /** @type {number} */ (server.toolTimeoutMs) <= 0)) {
      findings.push(this.error(`server "${name}" toolTimeoutMs must be a positive integer of milliseconds`, at));
    }

    const declared = server.enabledTools;
    if (this.#enabledTools === undefined) {
      if (declared !== undefined) findings.push(this.error(`server "${name}" declares enabledTools but the config has none`, at));
    } else if (!Array.isArray(declared) || declared.join("\n") !== this.#enabledTools.join("\n")) {
      findings.push(this.error(`server "${name}" enabledTools must equal the configured allow-list [${this.#enabledTools.join(", ")}]`, at));
    } else {
      for (const tool of declared) {
        if (!this.#knownTools.includes(tool)) findings.push(this.error(`server "${name}" enabledTools names "${tool}", which the endpoint does not serve`, at));
      }
    }
    return findings;
  }
}
