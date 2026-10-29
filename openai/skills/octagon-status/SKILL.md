---
name: octagon-status
description: Check whether Octagon is connected and summarize the Octagon tools that are currently available. Use when the user asks what Octagon can do right now, whether Octagon is working, or why Octagon requests are failing.
---

# Octagon Status

Report the current state of the Octagon connection and the tools it provides.

## Step 1: Determine the state

Check which Octagon tools are available, then make one lightweight call, such as a stock quote for a large public company, to confirm they work.

| State | Signal |
|-------|--------|
| Connected | Tools are available and the test call succeeds |
| Not connected | No Octagon tools are available |
| Sign-in expired | Tools are available but calls fail with an authorization error |
| Account limit or service issue | Calls fail with plan, credit, or service errors |

## Step 2: Report

When connected, summarize the available tools:

- `octagon-agent`: company, filing, transcript, and market-data research
- `octagon-deep-research-agent`: multi-source research briefs
- `octagon-prediction-markets-agent`: prediction-market reports
- `prediction_markets_history`: prediction-market price history

Then suggest a first request, or follow the `get-started` skill.

## Step 3: When something is wrong

- **Not connected** or **sign-in expired**: ask the user to connect or reconnect Octagon from the plugin's connection settings, then check again.
- **Account limit or service issue**: report the exact message in plain language and stop retrying.

Never ask the user to paste passwords, access tokens, or other credentials into the conversation.
