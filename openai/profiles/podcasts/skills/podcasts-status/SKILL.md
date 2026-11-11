---
name: podcasts-status
description: Check whether Octagon is connected and whether the podcast tool is answering. Use when the user asks whether the plugin is working, what it can do right now, how fresh the podcast index is, or why requests are failing.
---

# Octagon Podcasts Status

Report the current state of the Octagon connection, the podcast tool, and how recent the indexed episodes are.

## Step 1: Determine the state

Check whether `octagon-podcasts-agent` is available, then make one lightweight call:

```
What is the most recent episode you have indexed, and from which show?
```

| State | Signal |
|-------|--------|
| Connected | The tool is available and the call returns an episode with a date |
| Not connected | No Octagon tools are available |
| Sign-in expired | The tool is available but the call fails with an authorization error |
| Account limit or service issue | The call fails with a plan, credit or service error |

## Step 2: Report

When connected, tell the user:

- The tool is working, and the date of the most recent indexed episode. If that date is more than two weeks old, say that questions about "this week" or "this month" may return older episodes or no coverage, and suggest naming a window that ends at that date.
- What it can do right now: topic and company views, catch-ups by period or show, show recaps, host and guest tracking, most-discussed rankings. Point to `podcasts-get-started` for examples.

## Step 3: When something is wrong

- **Not connected** or **sign-in expired**: ask the user to connect or reconnect Octagon from the plugin's connection settings, then check again.
- **Account limit or service issue**: report the exact message in plain language and stop retrying.
- **No coverage on a question that should have some**: try once more with an explicit window that ends at the most recent indexed date; if it still returns nothing, say so and suggest another show or a broader topic.

Never ask the user to paste passwords, access tokens, or other credentials into the conversation.
