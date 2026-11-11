---
name: crypto-forex-news
description: Retrieve cryptocurrency news for a pair or forex news for a currency pair, with dates and sources. Use when the user asks what is in the news about a coin or a currency pair, or for the latest crypto or forex headlines.
---

# Crypto and Forex News

List recent news for a crypto pair or a currency pair.

## Inputs

- A crypto pair (`BTCUSD`) or a currency pair (`EURUSD`), or 'latest crypto' / 'latest forex'.
- Optional window and count.

## Workflow

1. Call `octagon-news-agent` once:

   ```
   What crypto news mentioned Bitcoin this week?
   ```

   ```
   Summarize forex news on EURUSD from the past week.
   ```

## Output structure

1. **Articles**: date, source, title, one-line summary, link when returned.
2. **Themes** (when five or more items).

## Framing rules

- Attribute every claim to its article. No recommendations.

## When not to use

- Crypto prices and history: the Octagon Crypto plugin.
- Stock news: `ticker-news`.
