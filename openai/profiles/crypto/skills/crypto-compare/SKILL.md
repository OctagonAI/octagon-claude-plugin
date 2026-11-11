---
name: crypto-compare
description: Compare the performance of several cryptocurrency pairs over the same window, with the percent change and extremes for each. Use when the user asks how coins did against each other, which performed best over a period, or for a side-by-side of a watchlist.
---

# Crypto Compare

Put several pairs side by side over one window.

## Inputs

- Two to ten pairs.
- One window for all of them. Default to the last 90 days and say so.

## Workflow

1. Call `octagon-crypto-agent` once, naming every pair and the window:

   ```
   Compare BTCUSD, ETHUSD and SOLUSD performance from 2026-08-01 to 2026-10-31.
   ```

2. If the tool returns one series at a time, make one call per pair with the same dates and assemble the table yourself; say that you did.

## Output structure

1. **Window**: the dates and the source.
2. **Comparison table**: pair, start price, end price, percent change, high, low, and the dates of the extremes.
3. **One observation**: the spread between best and worst performer over the window, stated as a fact.

## Framing rules

- A ranking by past return is a description of the past, not a forecast. Say so when the user asks which to buy, and suggest a licensed advisor.

## When not to use

- One asset's history: `crypto-price-history`.
- Current prices only: `crypto-quote`.
