// @ts-check
import { GROK_README_PATH } from "../../../manifest/GrokManifestBuilder.mjs";
import { isPlainObject } from "../../../util/object.mjs";
import { Rule } from "../../Rule.mjs";

/**
 * The README must declare what reviewers audit against: the MCP endpoint,
 * the credential model, every skill, and the license. A plugin that explains
 * itself is the one that merges on the first pass.
 */
export class ReadmeDeclarationRule extends Rule {
  /** @param {import("../../Rule.mjs").ValidationContext} context */
  async check({ pkg }) {
    const at = { path: GROK_README_PATH };
    if (!pkg.has(GROK_README_PATH)) return [this.error("README.md is required; reviewers read it first", at)];
    const text = await pkg.readText(GROK_README_PATH);
    const findings = [];

    const servers = isPlainObject(pkg.mcp.value) && isPlainObject(pkg.mcp.value.mcpServers) ? Object.values(pkg.mcp.value.mcpServers) : [];
    for (const server of servers) {
      if (isPlainObject(server) && typeof server.url === "string" && !text.includes(server.url)) {
        findings.push(this.error(`README must declare the MCP endpoint ${server.url}`, at));
      }
    }
    for (const [needle, why] of [
      ["OAuth", "the credential model"],
      ["## Network endpoints", "the network endpoints section"],
      ["## Credentials", "the credentials section"],
      ["## Components", "the components section"],
      ["License", "the license"],
    ]) {
      if (!text.includes(needle)) findings.push(this.error(`README must state ${why} ("${needle}")`, at));
    }
    for (const skill of pkg.skills) {
      if (!text.includes(`\`${skill.dir}\``)) findings.push(this.error(`README must list the skill "${skill.dir}"`, at));
    }
    return findings;
  }
}
