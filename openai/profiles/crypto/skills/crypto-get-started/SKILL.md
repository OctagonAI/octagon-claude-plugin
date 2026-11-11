---
name: crypto-get-started
description: Introduce Octagon Crypto, explain what it covers and how to connect, and suggest first requests. Use when the user is new to the plugin, asks what it can do with cryptocurrency market data, or needs help connecting their Octagon account.
---

# Get Started with Octagon Crypto

Built for analysts, researchers and writers who need a crypto price, a history or a comparison with its timestamp and source. Ask for a pair and a period and get the data, not a take.

## What the plugin does

- **Real-time crypto quotes**.
- **Historical price charts by date range**.
- **Compare assets over a period**.
- **Batch quotes for a watchlist**.
- **Crypto news by asset**.

## Coverage

- Assets: every cryptocurrency pair the data provider lists, by symbol such as BTCUSD or ETHUSD.
- Prices: real-time quotes, batch quotes for a watchlist, and daily end-of-day history for any date range.
- Context: volumes, market capitalization, and crypto news by pair.

## Connecting

1. The first time an Octagon tool runs, the user is asked to sign in to their Octagon account.
2. If Octagon tools are unavailable, or sign-in has expired, ask the user to connect or reconnect Octagon from the plugin's connection settings, then retry.
3. Never ask the user to paste passwords, access tokens, or other credentials into the conversation.
4. Each request uses one Octagon credit; say so when the user asks for many things at once.

## How the tool works

The plugin has one tool, `octagon-crypto-agent`. It takes a plain-language request and answers from cryptocurrency market data only.

- Use provider symbols: BTCUSD, ETHUSD, SOLUSD. If the user gives a name, pass the name; the tool resolves common ones.
- Name the period for history and comparisons (a date range or 'last 90 days').
- Several symbols in one request are fine for quotes and comparisons.

## Suggested first requests

Offer two or three of these, adapted to what the user mentioned:

- "What is the real-time quote for ETHUSD?"
- "Retrieve historical end-of-day prices for BTCUSD for 2025."
- "Compare BTC, ETH and SOL performance over the last 90 days."
- "Get quotes for BTCUSD, ETHUSD and SOLUSD."

## How to answer

- State the timestamp or as-of date and the source for every figure.
- Present prices and changes as data; do not call them signals.
- Do not recommend buying, selling, holding or sizing; if asked, say the plugin reports data and suggest a licensed advisor.

## What the plugin does not do

State these plainly when relevant, and name the plugin that does:

- Stock quotes and equity market data: the **Octagon Market Data** plugin.
- Crypto headlines across the market, not one asset: the **Octagon Market News** plugin.
- Everything at once, across sources: the **Octagon AI** plugin.
- It does not give investment advice. When asked what to buy, sell or hold, offer the data and suggest a licensed advisor.
