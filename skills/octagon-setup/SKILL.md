---
name: octagon-setup
description: Set up or reconnect the Octagon Claude plugin through the hosted Octagon AI connector. Use when the user wants to connect Octagon, repair a broken connection, confirm what auth path the plugin uses, or get started with Octagon tools in Claude.
---

# Octagon Setup

Guide the user through the Octagon connector-first setup flow for Claude. Treat the hosted Octagon connector as the primary auth path. Only mention API-key mode as an advanced fallback.

Always treat this as a plugin-scoped workflow:

- Use only the Octagon MCP server `octagon-claude-plugin` when checking plugin health.
- Do not fall back to `octagon-local` or any other separate Octagon server just because it is available.
- If another Octagon server exists in the client, ignore it unless the user explicitly asks to troubleshoot that different setup.

## Step 1: Brief introduction

Start with a short explanation of what the Octagon connector enables:

"Octagon connects Claude to market intelligence, SEC filing analysis, earnings workflows, quotes, and prediction market research. Once connected, Claude can use the Octagon tools directly inside the plugin."

Then move immediately into connection detection.

## Step 2: Detect connection state

Check the available Octagon MCP tools for the server `octagon-claude-plugin`.

### Healthy

If the Octagon tools are available and callable, the connector is already authenticated.

Say:

"Your Octagon connector is already connected. I'll summarize the available Octagon tools and confirm the plugin is healthy."

Then route to `octagon-status`.

### Not connected

If no Octagon tools are visible or the server appears disconnected:

1. Attempt `mcp_auth` on the Octagon MCP server if that tool is available in the current Claude client.
2. If `mcp_auth` succeeds, re-check tool visibility and continue to `octagon-status`.
3. If `mcp_auth` is unavailable or fails, give manual connector instructions:

   - In Claude, open **Plugins**
   - Select **Octagon**
   - Open **Connectors**
   - Click **Connect** for Octagon AI

4. Wait for the user to confirm, then re-check tool visibility.

### Auth broken

If the server exists but calls fail with auth or 401/403 style errors:

1. Tell the user the Octagon connector looks installed but disconnected or expired.
2. Attempt `mcp_auth` if available.
3. Otherwise instruct the user to open **Plugins -> Octagon -> Connectors** and click **Reconnect** for Octagon AI.
4. After reconnect, route to `octagon-status`.

### Entitlement or service issue

If tools exist but errors indicate account entitlements, credits, or service-side failures:

1. Do not keep retrying auth.
2. Report the exact issue clearly.
3. Recommend `octagon-api-smoke-test` for a more explicit classification if needed.

## Step 3: Explain the auth model

If the user asks how Octagon auth works:

- Explain that the default plugin path is the hosted Octagon connector.
- Explain that Claude may open a browser-based connect or reconnect flow.
- Explain that API-key mode is only an advanced fallback for manual or standalone runtime workflows and is not the preferred setup path for this plugin.

## Step 4: Healthy summary

When the connector is healthy, summarize the main Octagon tool surface:

- `octagon-agent`
- `octagon-deep-research-agent`
- `octagon-prediction-markets-agent`
- `prediction_markets_history`

Then offer next steps:

- "Run a health check" -> use `octagon-api-smoke-test`
- "Show me what's available now" -> use `octagon-status`
- "Start researching a company, filing, or prediction market" -> route to the appropriate Octagon skill

## Advanced fallback

Only mention this when:

- the user explicitly asks for API-key mode
- the connector flow is unavailable in their environment
- the user needs a standalone CLI or local runtime workflow

Fallback guidance:

- The default plugin no longer requires pasting an API key into `/plugin`
- Advanced manual workflows can still use `OCTAGON_API_KEY` with the standalone Octagon runtime outside the default hosted-connector plugin path

## Tone

Keep the tone efficient and product-oriented. Avoid protocol jargon. Focus on whether the user is connected, broken, or ready to use Octagon.
