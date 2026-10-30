# Octagon Prediction Markets for Grok Build

Cited research on Kalshi and Polymarket prediction markets: event odds, what moves them, probability history, Trust Scores, and where the market-implied probability diverges from an independent model estimate.

Built for analysts, economists, strategists, policy and risk teams, and journalists who treat event probabilities as data. Give it a market and it returns a cited analyst brief: what resolves the event, what the market currently implies, how that probability has moved and why, how similar events have resolved before, the market's Trust Score, and whether the market is mispriced relative to an independent model estimate.

Everything the plugin does goes through one hosted MCP server. It ships no scripts, hooks, agents, commands, or local executables.

## Components

- **7 skills** (`skills/<name>/SKILL.md`), listed below.
- **1 MCP server** (`.mcp.json`): `octagon-predictions`, HTTP transport, `https://mcp.octagonai.co/prediction-markets/mcp`.
- No hooks, no subagents, no slash commands, no LSP servers.

## Network endpoints

The plugin contacts only these hosts:

| Host | Purpose |
|---|---|
| `mcp.octagonai.co` | MCP server (`https://mcp.octagonai.co/prediction-markets/mcp`); receives prompts and tool arguments, returns cited results |
| `login.octagonai.co` | OAuth authorization server (`https://login.octagonai.co`); sign-in on first tool use |

No other endpoint is called. The plugin sends no telemetry of its own.

## Credentials

- Authentication is browser OAuth with an Octagon account; Grok Build opens the sign-in page the first time a tool is called.
- The plugin reads no keys, tokens, environment variables, or local files.
- Disconnect at any time from Grok Build's MCP settings (`/mcps`); revoking the OAuth grant on the Octagon side has the same effect.

## Data flow

Your prompt and the tool arguments the model derives from it are sent to the Octagon MCP server; the server returns research results with their sources. Results are shown in the session and are not stored by the plugin.

## Install

From the xAI marketplace inside Grok Build:

```bash
grok plugin install octagon-prediction-markets --trust
```

From a checkout of this repository, for testing before the marketplace entry exists:

```bash
grok --plugin-dir grok/plugins/octagon-prediction-markets
```

`--trust` is Grok Build's confirmation that the plugin's MCP server may run; it is required for every plugin that ships one.

## Try it

- `Write an event brief for this market: https://kalshi.com/markets/kxfeddecision/fed-meeting/kxfeddecision-26dec`
  Expected: a brief with the resolution criteria and date, the market-implied probability with a timestamp, the drivers with sources, and upcoming catalysts; no side or action recommended
- `What is the Trust Score for that market, and what drives it?`
  Expected: the 0-100 score and label with its timestamp, the Integrity and Trade quality components, and the screen or cap behind the verdict
- `Put $50 on YES for me.`
  Expected: a decline: the plugin cannot place or route wagers; it offers the event brief instead

## Skills

| Skill | What it does |
|---|---|
| `event-brief` | Write a cited analyst brief on one prediction-market event, covering resolution criteria, the current market-implied probability, base rates, drivers, and the catalyst calendar. Use when the user asks what a prediction market says, shares a Kalshi or Polymarket link, or asks for research on the odds of an event. |
| `get-started` | Introduce Octagon Prediction Markets, explain what prediction-market data is and how to connect, and suggest first requests. Use when the user is new to the plugin, asks what it can do with prediction markets, Kalshi, or Polymarket, or needs help connecting their Octagon account. |
| `mispricing-analysis` | Compare a prediction market's implied probability with Octagon's independent model estimate and report the mispricing, its size and direction, the confidence behind each estimate, and how similar gaps have resolved historically. Use when the user asks whether a market is mispriced, how the market compares to the model, or whether the odds look right. |
| `octagon-status` | Check whether Octagon is connected and summarize the prediction-market tools that are currently available. Use when the user asks whether the plugin is working, what it can do right now, or why requests are failing. |
| `prediction-markets-analysis` | Research a prediction market on Kalshi or Polymarket with the Octagon prediction-markets agent. Returns a cited report with the market-implied and model probabilities, price drivers, catalysts, resolution history, and the market's Trust Score. Use when the user shares a Kalshi or Polymarket link, names an event with a market, or asks what the odds on something are and why. |
| `probability-history` | Analyze how a prediction market's probability has moved over time, including the largest moves, regime changes, and the events that explain each move. Use when the user asks how the odds have changed, what moved a market, or wants the probability history of a Kalshi or Polymarket market. |
| `trust-score` | Explain and retrieve the Octagon Trust Score for a Kalshi or Polymarket market: a 0–100 score of whether the market can be rigged and whether its price can be trusted, with the pillars and screens behind it. Use when the user asks how trustworthy a market is, whether a market could be manipulated, what the Trust Score or Trust Index means, or why a market scored the way it did. |

## Scope

Research only. The plugin does not place, route, or recommend bets or trades, hold funds, or connect to any trading account, and it does not give personalized financial advice. Generating a new report takes several minutes and uses report credits; the skills ask before generating one.

## License and support

- License: MIT (see `LICENSE`).
- Homepage: https://www.octagonai.co/
- Support: https://www.octagonai.co/contact/
- Privacy policy: https://www.octagonai.co/privacy/
- Terms of service: https://www.octagonai.co/terms-of-service/

This directory is generated from the plugin's config and skill catalog by the packaging tool in this repository; edit the sources, not these files.
