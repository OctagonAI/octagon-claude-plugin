---
name: crypto-news
description: Retrieve recent news for a cryptocurrency pair or for the crypto market, with dates and sources. Use when the user asks what is in the news about a coin, what moved it, or for the latest crypto headlines.
---

# Crypto News

List recent crypto news for one pair or the market, each item with its date and source.

## Inputs

- A pair (`BTCUSD`) or 'the crypto market'.
- Optional window; default to the latest items.

## Workflow

1. Call `octagon-crypto-agent` once:

   ```
   What is the latest news on Bitcoin?
   ```

2. When the user asks what moved a price, pair this with `crypto-price-history` for the same window and present the news next to the dated moves, without asserting causation the articles do not state.

## Output structure

1. **Headlines**: date, source, title, one-line summary, link when returned.
2. **Themes** (optional, three or more items): the two or three recurring topics, each pointing at the articles.

## Framing rules

- Report what was published; do not add analysis the articles do not contain.
- No recommendations.

## When not to use

- Stock or forex news: the Octagon Market News plugin.
- Prices and history: `crypto-quote`, `crypto-price-history`.
