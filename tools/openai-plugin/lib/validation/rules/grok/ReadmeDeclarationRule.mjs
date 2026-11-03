// @ts-check
import { isPlainObject } from "../../../util/object.mjs";
import { ReadmeDeclarationRule as SharedReadmeDeclarationRule } from "../vendor/ReadmeDeclarationRule.mjs";

/** The shared README rule, reading the Grok package's `.mcp.json` for endpoints. */
export class ReadmeDeclarationRule extends SharedReadmeDeclarationRule {
  constructor() {
    super({
      endpoints: pkg => {
        const servers = isPlainObject(pkg.mcp.value) && isPlainObject(pkg.mcp.value.mcpServers) ? Object.values(pkg.mcp.value.mcpServers) : [];
        return servers.flatMap(server => (isPlainObject(server) && typeof server.url === "string" ? [server.url] : []));
      },
    });
  }
}
