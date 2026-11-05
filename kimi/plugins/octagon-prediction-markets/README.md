# Octagon Prediction Markets for Kimi

Cited research on Kalshi and Polymarket prediction markets: event odds, what moves them, probability history, Trust Scores, and where the market-implied probability diverges from Octagon's research-adjusted model estimate.

Built for analysts, economists, strategists, policy and risk teams, and journalists who treat event probabilities as data. Give it a market and it returns a cited analyst brief: what resolves the event, what the market currently implies, how that probability has moved and why, how similar events have resolved before, the market's Trust Score, and whether the market is mispriced relative to Octagon's research-adjusted model estimate.

Everything the plugin does goes through one hosted MCP server. It ships no scripts, hooks, commands, agents, or local executables, and it reads no keys or environment variables.

## Install

Kimi Code (CLI or Desktop):

```
/plugins install https://github.com/OctagonAI/octagon-prediction-markets-kimi-plugin
/reload
```

Kimi app (Kimi Work desktop): type `/`, open **Plugin Builder**, paste `https://github.com/OctagonAI/octagon-prediction-markets-kimi-plugin`, then install the plugin from **Plugins → Personal**.

The first tool call asks you to sign in to Octagon in the browser (OAuth); the plugin manager shows the `octagon-predictions` server's authorization state under `/plugins`. Every tool is read-only. OAuth needs a browser, so headless sessions without one cannot authorize.

## Components

- **7 skills** (`skills/<name>/SKILL.md`), listed below.
- **1 MCP server** (`kimi.plugin.json`): `octagon-predictions`, Streamable HTTP, `https://mcp.octagonai.co/prediction-markets/mcp`, exposing `octagon-prediction-markets-agent`, `prediction_markets_history`.
- **1 system-prompt file** (`SYSTEM.md`): standing rules on citations, sign-in, and scope, loaded while the plugin is enabled.
- **Display text in en-US and zh-CN** (`interface` in the manifest, `locales/<locale>.json`).
- No hooks, no commands, no sub-agents.

## Network endpoints

The plugin contacts only these hosts:

| Host | Purpose |
|---|---|
| `mcp.octagonai.co` | MCP server (`https://mcp.octagonai.co/prediction-markets/mcp`); receives prompts and tool arguments, returns cited results |
| `login.octagonai.co` | OAuth authorization server (`https://login.octagonai.co`); sign-in on first tool use, discovered by Kimi from the server's metadata |

No other endpoint is called. The plugin sends no telemetry of its own.

## Credentials

- Authentication is browser OAuth with an Octagon account (free tier available), using Kimi's native MCP OAuth with dynamic client registration.
- The plugin declares no headers, tokens, environment variables, or local files.
- Tokens live in Kimi's own credential store; disabling or removing the plugin revokes them, and the grant can also be revoked on the Octagon side.

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
| `mispricing-analysis` | Compare a prediction market's implied probability with Octagon's research-adjusted model estimate and report the mispricing, its size and direction, the confidence behind each estimate, and how similar gaps have resolved historically. Use when the user asks whether a market is mispriced, how the market compares to the model, or whether the odds look right. |
| `prediction-markets-analysis` | Research a prediction market on Kalshi or Polymarket with the Octagon prediction-markets agent. Returns a cited report with the market-implied and model probabilities, price drivers, catalysts, resolution history, and the market's Trust Score. Use when the user shares a Kalshi or Polymarket link, names an event with a market, or asks what the odds on something are and why. |
| `prediction-markets-get-started` | Introduce Octagon Prediction Markets, explain what prediction-market data is and how to connect, and suggest first requests. Use when the user is new to the plugin, asks what it can do with prediction markets, Kalshi, or Polymarket, or needs help connecting their Octagon account. |
| `prediction-markets-status` | Check whether Octagon is connected and summarize the prediction-market tools that are currently available. Use when the user asks whether the plugin is working, what it can do right now, or why requests are failing. |
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

## About this repository

This repository is a generated mirror of `kimi/plugins/octagon-prediction-markets/` in Octagon's plugin source repository (github.com/OctagonAI); releases are tagged `v<version>` from there and carry the plugin as a ZIP asset. Report issues and propose changes in that repository, not here.
