---
name: latest-13f-filings
description: List the most recent Form 13F and related institutional ownership filings, optionally for one holder. Use when the user asks what institutions filed recently, whether a fund's latest 13F is in, or for the newest filings in general.
---

# Latest 13F Filings

Return the newest institutional ownership filings, with holder, period and filing date.

## Inputs

- Optional holder (fund name or CIK). Without one, the latest filings across holders.
- Optional count; default 20.

## Workflow

1. Call `octagon-holdings-agent` once:

   ```
   Retrieve the most recent Form 13F and related filings submitted by institutional investors, limited to 20 records.
   ```

   ```
   Retrieve the most recent 13F filings by Berkshire Hathaway.
   ```

## Output structure

1. **Table**: holder, CIK, form type, period of report, filing date.
2. **Note**: 13F filings cover quarter-end positions and are due 45 days after quarter end; say which quarter the newest filings cover.

## Framing rules

- Filings are records; report them as such. No inference about intent.

## When not to use

- What a holder owns: `holder-portfolio`.
- Who owns a stock: `symbol-ownership`.
