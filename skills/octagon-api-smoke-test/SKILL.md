---
name: octagon-api-smoke-test
description: Validate Octagon connector health and run a lightweight smoke test across the main Octagon Claude plugin workflows. Use when checking whether the Octagon connector is configured correctly, debugging auth, or verifying tool availability.
---

# Octagon API Smoke Test

Use this skill to confirm that the Claude plugin and hosted Octagon connector are configured correctly.

## Smoke test sequence

1. Check whether Octagon tools for server `octagon-claude-plugin` are visible
2. Run a simple `octagon-agent` request
3. Run a simple `octagon-deep-research-agent` request
4. If a Kalshi URL is available, run `octagon-prediction-markets-agent`
5. If an event ticker is available, run `prediction_markets_history`

## MCP calls

General agent:

```json
{
  "server": "octagon-claude-plugin",
  "toolName": "octagon-agent",
  "arguments": {
    "prompt": "Give me a one-sentence summary of Apple's latest quarter."
  }
}
```

Deep research:

```json
{
  "server": "octagon-claude-plugin",
  "toolName": "octagon-deep-research-agent",
  "arguments": {
    "prompt": "Research the current AI infrastructure spending cycle in one short paragraph."
  }
}
```

## Status matrix

Classify failures before suggesting next steps:

- No Octagon tools are visible at all: the Octagon connector is not connected in Claude yet
- Auth flow is requested or connector auth appears missing: route the user to `octagon-setup`
- 401 or 403 style failures after tools appear: the connector exists but needs reconnect
- Credit, entitlement, or plan restriction failures: report the exact error and stop
- Network, timeout, or service failures: classify as service-side or connectivity issues
- Successful text response from at least one tool: the connector is healthy enough to use

## Failure triage

- No tools visible: connect the Octagon AI connector, then rerun the smoke test
- Auth or reconnect needed: use `octagon-setup`
- Prediction market failures mentioning Kalshi URL: supply a valid Kalshi market URL
- Credit or entitlement failures: report the exact error and stop
- Advanced/manual API-key fallback questions: explain that API-key mode is no longer the default plugin path and should only be used for standalone or local runtime workflows

## Success criteria

- At least one Octagon tool returns usable text
- Tool failures, if any, are classified clearly as connection, auth, entitlement, input, or service issues
