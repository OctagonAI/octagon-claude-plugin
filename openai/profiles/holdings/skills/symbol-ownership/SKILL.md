---
name: symbol-ownership
description: Summarize institutional ownership of one stock for a quarter: holder count, total shares and value, who added, who reduced, who exited. Use when the user asks who owns a stock, which funds bought or sold it, or how institutional ownership changed.
---

# Symbol Ownership

Describe the institutional ownership of one security for a quarter.

## Inputs

- The ticker.
- The quarter, or 'latest'.

## Workflow

1. Call `octagon-holdings-agent` once for the positions summary:

   ```
   Retrieve the institutional positions summary for NVDA for Q2 2026.
   ```

2. When the user asks who added or exited, call once more for the holder-level analytics for that symbol and quarter.

## Output structure

1. **Ticker and quarter**: period of report and the filing lag note.
2. **Totals**: number of holders, total shares and value, change versus the prior quarter.
3. **Movers**: largest increases, largest decreases, new positions, closed positions, each with the holder and the size of the change.

## Framing rules

- Report filings; do not infer motive or predict price.
- No recommendations. If asked, say the plugin reports filings and suggest a licensed advisor.

## When not to use

- One holder's whole portfolio: `holder-portfolio`.
- Insider (officer and director) trades: `insider-trades`.
