---
name: earnings-calls-status
description: Check whether Octagon is connected and whether the earnings call transcripts tool is answering. Use when the user asks whether the plugin is working, what it can do right now, or why requests are failing.
---

# Octagon Earnings Calls Status

Report the current state of the Octagon connection and the tool it provides.

## Step 1: Determine the state

Check whether `octagon-transcripts-agent` is available, then make one lightweight call:

```
Which earnings call transcripts do you have for AAPL, and what is the most recent call date?
```

| State | Signal |
|-------|--------|
| Connected | The tool is available and the call returns data with a source |
| Not connected | No Octagon tools are available |
| Sign-in expired | The tool is available but the call fails with an authorization error |
| Account limit or service issue | The call fails with a plan, credit or service error |

## Step 2: Report

When connected, say the tool is working and what it can do right now:

- Extract guidance and revenue outlook
- Summarize analyst Q&A
- Track management commentary by topic
- Gauge call sentiment and tone
- Review product pipeline and capital allocation

Then suggest a first request, or follow the `earnings-calls-get-started` skill.

## Step 3: When something is wrong

- **Not connected** or **sign-in expired**: ask the user to connect or reconnect Octagon from the plugin's connection settings, then check again.
- **Account limit or service issue**: report the exact message in plain language and stop retrying.
- **The tool answers but not for this request**: the request may belong to another Octagon plugin; check the "What the plugin does not do" list in `earnings-calls-get-started`.

Never ask the user to paste passwords, access tokens, or other credentials into the conversation.
