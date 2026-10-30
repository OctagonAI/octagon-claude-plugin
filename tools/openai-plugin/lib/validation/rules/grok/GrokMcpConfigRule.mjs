// @ts-check
import { MCP_CONFIG_PATH } from "../../../manifest/ManifestBuilder.mjs";
import { isPlainObject } from "../../../util/object.mjs";
import { Rule } from "../../Rule.mjs";

/** Keys that would make the server a local process rather than a remote endpoint. */
const LOCAL_KEYS = ["command", "args", "env", "cwd"];

/**
 * `.mcp.json` declares exactly one remote HTTP server over HTTPS and nothing
 * that runs on the user's machine. A shell-exec or local-command server is a
 * stated reason for marketplace rejection.
 */
export class GrokMcpConfigRule extends Rule {
  /** @type {string | undefined} */ #expectedUrl;

  /** @param {{ expectedUrl?: string }} [options] The server URL the profile config declares. */
  constructor({ expectedUrl } = {}) {
    super();
    this.#expectedUrl = expectedUrl;
  }

  /** @param {import("../../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const at = { path: MCP_CONFIG_PATH };
    if (pkg.mcp.error) return [this.error(pkg.mcp.error, at)];
    const servers = isPlainObject(pkg.mcp.value) ? pkg.mcp.value.mcpServers : undefined;
    if (!isPlainObject(servers)) return [this.error("mcpServers object is required", at)];

    const entries = Object.entries(servers);
    if (entries.length !== 1) return [this.error(`exactly one MCP server is expected, found ${entries.length}`, at)];

    const findings = [];
    const [name, server] = entries[0];
    if (!isPlainObject(server)) return [this.error(`server "${name}" must be an object`, at)];
    if (server.type !== "http") findings.push(this.error(`server "${name}" must declare type "http"`, at));
    if (typeof server.url !== "string" || !server.url.startsWith("https://")) {
      findings.push(this.error(`server "${name}" must have an https:// url`, at));
    } else if (this.#expectedUrl !== undefined && server.url !== this.#expectedUrl) {
      findings.push(this.error(`server "${name}" url ${server.url} differs from the configured ${this.#expectedUrl}`, at));
    }
    for (const key of LOCAL_KEYS) {
      if (key in server) findings.push(this.error(`server "${name}" must not set "${key}"; only a remote HTTP server ships`, at));
    }
    return findings;
  }
}
