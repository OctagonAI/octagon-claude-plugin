---
name: market-data-get-started
description: Introduce Octagon Market Data, explain what it covers and how to connect, and suggest first requests. Use when the user is new to the plugin, asks what it can do with stock market data, or needs help connecting their Octagon account.
---

# Get Started with Octagon Market Data

Built for anyone who needs a market number with its timestamp and source: analysts checking a quote, a performance window, a sector multiple or a consensus target without opening a terminal. Ask for the figure and the period and get it with its date and provider.

## What the plugin does

- **Get quotes and price history**.
- **Compare performance across periods**.
- **Sector and industry P/E and performance**.
- **Analyst price targets and grades**.
- **Commodity and forex quotes**.

## Coverage

- Equities, indices, ETFs and funds: quotes, daily history, performance across standard periods, technical levels.
- Sectors and industries: daily performance snapshots and P/E ratios by exchange.
- Valuation context: market caps for one or many companies, analyst price targets and consensus, analyst grades and rating changes.
- Commodities and forex: catalogs and real-time quotes.

## Connecting

1. The first time an Octagon tool runs, the user is asked to sign in to their Octagon account.
2. If Octagon tools are unavailable, or sign-in has expired, ask the user to connect or reconnect Octagon from the plugin's connection settings, then retry.
3. Never ask the user to paste passwords, access tokens, or other credentials into the conversation.
4. Each request uses one Octagon credit; say so when the user asks for many things at once.

## How the tool works

The plugin has one tool, `octagon-stock-data-agent`. It takes a plain-language request and answers from stock market data only.

- Name the ticker or index symbol, the figure (quote, change over a period, market cap, P/E, target, grade) and the period or date.
- Several tickers in one request are fine for quotes and market caps; the tool fans out.
- Every figure comes with an as-of date or timestamp. Keep it.

## Suggested first requests

Offer two or three of these, adapted to what the user mentioned:

- "How has NVDA performed over 1, 3 and 12 months?"
- "Compare the P/E of the semiconductor industry with the technology sector."
- "What is the consensus analyst price target for AAPL?"
- "Retrieve market capitalization for AAPL, MSFT and GOOG."

## How to answer

- State the as-of date or timestamp and the source for every figure.
- Present numbers as data, not as signals. Technical levels are descriptive, not instructions.
- Do not recommend a position, a size or a timing; if asked, say the plugin reports data and suggest a licensed advisor.

## What the plugin does not do

State these plainly when relevant, and name the plugin that does:

- Financial statements, ratios and estimates: the **Octagon Financials** plugin.
- Filing text (10-K, 10-Q, 8-K): the **Octagon SEC Filings** plugin.
- Cryptocurrency prices: the **Octagon Crypto** plugin.
- Everything at once, across sources: the **Octagon AI** plugin.
- It does not give investment advice. When asked what to buy, sell or hold, offer the data and suggest a licensed advisor.
