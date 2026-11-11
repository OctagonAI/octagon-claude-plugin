---
name: crypto-quote
description: Get a real-time quote, or a batch of quotes, for cryptocurrency pairs with timestamp and source. Use when the user asks what a coin is trading at, for current prices of several assets, or for today's change and volume.
---

# Crypto Quote

Return the current price of one or several cryptocurrency pairs, with the timestamp and source.

## Inputs

- One or more pairs in provider form (`BTCUSD`, `ETHUSD`, `SOLUSD`). If the user names the coin, pass the name; the tool resolves common ones.

## Workflow

1. Call `octagon-crypto-agent` once:

   ```
   Retrieve the real-time quote for ETHUSD.
   ```

   ```
   Get quotes for BTCUSD, ETHUSD and SOLUSD.
   ```

2. If the tool does not recognize a symbol, ask the user for the pair or offer the closest listed symbols.

## Output structure

1. **Quote table**: pair, price, change (absolute and percent), volume, market cap when returned, timestamp.
2. **Source line**: the data provider and the as-of time.

## Framing rules

- A price is a fact at a timestamp. Do not call it high, low, cheap or expensive.
- Do not suggest buying, selling or sizing. If asked, say the plugin reports data and suggest a licensed advisor.

## When not to use

- Price history or a comparison over a period: `crypto-price-history` or `crypto-compare`.
- A stock or ETF quote: the Octagon Stock Data plugin.
