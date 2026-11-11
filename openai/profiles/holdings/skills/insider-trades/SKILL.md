---
name: insider-trades
description: List insider trades filed for a company: date, insider, role, transaction type and size. Use when the user asks about insider buying or selling, officer and director transactions, or Form 4 activity for a stock.
---

# Insider Trades

List the insider transactions filed for one company.

## Inputs

- The ticker.
- Optional window; default to the latest filings.

## Workflow

1. Call `octagon-holdings-agent` once:

   ```
   Retrieve the latest insider trades filed for TSLA.
   ```

## Output structure

1. **Table**: filing date, transaction date, insider, role, transaction type (purchase, sale, award, exercise), shares, price, value.
2. **Summary**: net buying or selling over the window as a plain count and total, with the dates.

## Framing rules

- Many insider sales are scheduled or tax-related; report the transaction type as filed and do not characterize intent.
- No recommendations. If asked, say the plugin reports filings and suggest a licensed advisor.

## When not to use

- Institutional (13F) ownership: `symbol-ownership`.
