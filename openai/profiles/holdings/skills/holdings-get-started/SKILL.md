---
name: holdings-get-started
description: Introduce Octagon 13F Holdings, explain what it covers and how to connect, and suggest first requests. Use when the user is new to the plugin, asks what it can do with institutional ownership data, or needs help connecting their Octagon account.
---

# Get Started with Octagon 13F Holdings

Built for analysts and journalists tracking where institutional money went: who added, who exited, what a fund holds and how it performed, by quarter, with the filing period on every figure.

## What the plugin does

- **Latest 13F filings**.
- **A fund's portfolio and performance**.
- **Institutional positions in a stock**.
- **Industry exposure by holder**.
- **Insider trades**.

## Coverage

- Form 13F: the latest filings, a holder's filings by quarter, and analytics per holder and per security.
- Holders: portfolio summaries, performance summaries and industry breakdowns, by CIK or name.
- Securities: institutional positions in a stock by quarter, new and exited positions, ETF composition.
- Insiders: insider trades by company.

## Connecting

1. The first time an Octagon tool runs, the user is asked to sign in to their Octagon account.
2. If Octagon tools are unavailable, or sign-in has expired, ask the user to connect or reconnect Octagon from the plugin's connection settings, then retry.
3. Never ask the user to paste passwords, access tokens, or other credentials into the conversation.
4. Each request uses one Octagon credit; say so when the user asks for many things at once.

## How the tool works

The plugin has one tool, `octagon-holdings-agent`. It takes a plain-language request and answers from institutional ownership data only.

- Name the security (ticker) or the holder (fund name or CIK), the quarter (or 'latest'), and what you want: positions, changes, performance, industry breakdown, insider trades.
- 13F data is quarterly and filed up to 45 days after quarter end; say which quarter the data covers.
- One holder or one security per call; comparisons are separate calls.

## Suggested first requests

Offer two or three of these, adapted to what the user mentioned:

- "Which institutions added to NVDA positions last quarter?"
- "Summarize Berkshire Hathaway's latest 13F portfolio by industry."
- "Show the institutional positions summary for AAPL in Q2 2026."
- "Which funds exited META last quarter?"

## How to answer

- State the 13F quarter and filing date for every figure; note the reporting lag when the user asks about 'now'.
- Report ownership changes as facts about filings, not as signals to follow.
- Do not recommend copying a holder; if asked, say the plugin reports filings and suggest a licensed advisor.

## What the plugin does not do

State these plainly when relevant, and name the plugin that does:

- The company's own filings (10-K, 10-Q, 8-K): the **Octagon SEC Filings** plugin.
- Stock prices and market cap: the **Octagon Stock Data** plugin.
- Everything at once, across sources: the **Octagon AI** plugin.
- It does not give investment advice. When asked what to buy, sell or hold, offer the data and suggest a licensed advisor.
