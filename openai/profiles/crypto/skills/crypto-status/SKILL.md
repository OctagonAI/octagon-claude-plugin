---
name: crypto-status
description: Check whether Octagon is connected and whether the cryptocurrency market data tool is answering. Use when the user asks whether the plugin is working, what it can do right now, or why requests are failing.
---

# Octagon Crypto Status

Report the current state of the Octagon connection and the tool it provides.

## Step 1: Determine the state

Check whether `octagon-crypto-agent` is available, then make one lightweight call:

```
Retrieve the real-time quote for BTCUSD.
```

| State | Signal |
|-------|--------|
| Connected | The tool is available and the call returns data with a source |
| Not connected | No Octagon tools are available |
| Sign-in expired | The tool is available but the call fails with an authorization error |
| Account limit or service issue | The call fails with a plan, credit or service error |

## Step 2: Report

When connected, say the tool is working and what it can do right now:

- Real-time crypto quotes
- Historical price charts by date range
- Compare assets over a period
- Batch quotes for a watchlist
- Crypto news by asset

Then suggest a first request, or follow the `crypto-get-started` skill.

## Step 3: When something is wrong

- **Not connected** or **sign-in expired**: ask the user to connect or reconnect Octagon from the plugin's connection settings, then check again.
- **Account limit or service issue**: report the exact message in plain language and stop retrying.
- **The tool answers but not for this request**: the request may belong to another Octagon plugin; check the "What the plugin does not do" list in `crypto-get-started`.

Never ask the user to paste passwords, access tokens, or other credentials into the conversation.
