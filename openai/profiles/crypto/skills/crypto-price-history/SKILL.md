---
name: crypto-price-history
description: Retrieve historical end-of-day prices for a cryptocurrency pair over a date range, with the period change and extremes. Use when the user asks for a chart, a price history, how a coin did in a year or month, or the high and low over a window.
---

# Crypto Price History

Return the daily price series for one pair over a window, summarized and offered as a table.

## Inputs

- One pair (`BTCUSD`).
- A window: a date range, a year, or 'last N days'. Default to the last 90 days and say so.

## Workflow

1. Call `octagon-crypto-agent` once with the pair and the window as dates:

   ```
   Retrieve historical end-of-day price data for BTCUSD from 2025-01-01 to 2025-12-31.
   ```

2. For a long window, summarize rather than list every day, and offer the full table.

## Output structure

1. **Window and pair**: one line with the dates covered and the source.
2. **Summary**: start and end price, percent change, high and low with their dates, average daily volume when returned.
3. **Table** (on request, or when the window is 31 days or shorter): date, open, high, low, close, volume.

## Framing rules

- Describe the series; do not extrapolate it or call a level support or resistance.
- No recommendations or timing. If asked, say the plugin reports data and suggest a licensed advisor.

## When not to use

- The current price only: `crypto-quote`.
- Several assets against each other: `crypto-compare`.
