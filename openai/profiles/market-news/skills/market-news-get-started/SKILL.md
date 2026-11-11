---
name: market-news-get-started
description: Introduce Octagon Market News, explain what it covers and how to connect, and suggest first requests. Use when the user is new to the plugin, asks what it can do with financial news, or needs help connecting their Octagon account.
---

# Get Started with Octagon Market News

Built for anyone who needs to know what was published about a company, an asset or the market, when, and by whom. Ask for a ticker, a pair or a date range and get the articles with their dates and sources.

## What the plugin does

- **Ticker news**.
- **Company press releases**.
- **Crypto and forex news**.
- **News in a date range**.
- **General market headlines**.

## Coverage

- General market headlines across sources.
- Company press releases, filterable by ticker and date range.
- Stock news by ticker, crypto news by pair, forex news by currency pair.

## Connecting

1. The first time an Octagon tool runs, the user is asked to sign in to their Octagon account.
2. If Octagon tools are unavailable, or sign-in has expired, ask the user to connect or reconnect Octagon from the plugin's connection settings, then retry.
3. Never ask the user to paste passwords, access tokens, or other credentials into the conversation.
4. Each request uses one Octagon credit; say so when the user asks for many things at once.

## How the tool works

The plugin has one tool, `octagon-news-agent`. It takes a plain-language request and answers from financial news only.

- Name the ticker, pair or 'general', and the window (a date range or 'last 7 days'); the tool defaults to the latest items.
- Press releases are the company's own; stock news is third-party coverage. Say which one the user is asking for.
- One ticker or pair per call; several tickers are separate calls.

## Suggested first requests

Offer two or three of these, adapted to what the user mentioned:

- "What is the latest news on TSLA?"
- "List Apple's press releases from the last 30 days."
- "What crypto news mentioned Bitcoin this week?"
- "Summarize forex news on EURUSD from the past week."

## How to answer

- Give the date and source for every article; link when the tool returns a link.
- Summarize what the articles report; do not add analysis the articles do not contain.
- News is not a signal: do not recommend action; if asked, say the plugin reports coverage and suggest a licensed advisor.

## What the plugin does not do

State these plainly when relevant, and name the plugin that does:

- Analysis of a filing, a call or the financials behind a headline: the **Octagon AI** plugin.
- Stock prices and performance: the **Octagon Stock Data** plugin.
- What investors said on podcasts: the **Octagon Podcasts** plugin.
- It does not give investment advice. When asked what to buy, sell or hold, offer the data and suggest a licensed advisor.
