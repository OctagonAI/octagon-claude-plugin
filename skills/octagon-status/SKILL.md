---
name: octagon-status
description: Check whether the Octagon Claude plugin is connected and summarize the current Octagon tool surface. Use when the user asks what Octagon can do now, whether the plugin is healthy, or whether the connector is configured correctly.
---

# Octagon Status

Use this skill to report the current state of the Octagon connector and available Octagon tools.

## Step 1: Check tool availability

Inspect whether the Octagon MCP tools for server `octagon-claude-plugin` are visible and callable.

Possible states:

- Healthy: tools are available and at least one call succeeds
- Not connected: no Octagon tools are visible
- Auth broken: tools are present but auth-related calls fail
- Entitlement or service issue: tools are visible but errors indicate account limitations or service failures

## Step 2: Summarize the tool surface

When healthy, summarize the available Octagon tools clearly:

- `octagon-agent`: broad Octagon market intelligence
- `octagon-deep-research-agent`: deeper multi-source research
- `octagon-prediction-markets-agent`: Kalshi and prediction-market specific workflows
- `prediction_markets_history`: structured market history retrieval

Use a response shape like:

"Your Octagon connector is connected and the plugin looks healthy. These Octagon tools are currently available:

- `octagon-agent`
- `octagon-deep-research-agent`
- `octagon-prediction-markets-agent`
- `prediction_markets_history`

You can start using the financial, SEC, earnings, market, and prediction-market skills now."

## Step 3: If unhealthy, branch

### Not connected

Say the connector is not connected and route the user to `octagon-setup`.

### Auth broken

Say the connector exists but needs reconnecting, then route the user to `octagon-setup`.

### Entitlement or service issue

Report the exact issue and recommend `octagon-api-smoke-test` for deeper classification if needed.

## Step 4: Offer next steps

When healthy, offer:

- run `octagon-api-smoke-test`
- start with a research query
- use a narrower workflow skill such as SEC, earnings, analyst estimates, or stock quote

When unhealthy, offer:

- reconnect via `octagon-setup`
- retry after auth
- diagnose deeper with `octagon-api-smoke-test`
