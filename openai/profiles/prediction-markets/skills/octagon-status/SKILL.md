---
name: octagon-status
description: Check whether Octagon is connected and summarize the prediction-market tools that are currently available. Use when the user asks whether the plugin is working, what it can do right now, or why requests are failing.
---

# Octagon Status

Report the current state of the Octagon connection and the tools it provides.

## Step 1: Determine the state

Check which Octagon tools are available, then make one lightweight call, such as `prediction_markets_history` with a short window for a well-known event ticker, to confirm they work.

| State | Signal |
|-------|--------|
| Connected | Tools are available and the test call succeeds |
| Not connected | No Octagon tools are available |
| Sign-in expired | Tools are available but calls fail with an authorization error |
| Account limit or service issue | Calls fail with plan, credit, or service errors |

## Step 2: Report

When connected, summarize the available tools:

- `octagon-prediction-markets-agent`: cited research reports on a prediction-market event
- `prediction_markets_history`: a market's probability history over a chosen window

Then suggest a first request, or follow the `get-started` skill.

## Step 3: When something is wrong

- **Not connected** or **sign-in expired**: ask the user to connect or reconnect Octagon from the plugin's connection settings, then check again.
- **Account limit or service issue**: report the exact message in plain language and stop retrying. If the limit concerns report generation, mention that cached reports remain available.

Never ask the user to paste passwords, access tokens, or other credentials into the conversation.
