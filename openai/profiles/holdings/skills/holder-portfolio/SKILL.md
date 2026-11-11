---
name: holder-portfolio
description: Summarize an institutional holder's 13F portfolio for a quarter: top positions, industry breakdown and quarter-over-quarter changes. Use when the user asks what a fund holds, how its portfolio is allocated, or what it added and sold.
---

# Holder Portfolio

Describe what one institutional holder reported for a quarter.

## Inputs

- The holder, by name or CIK. If the name is ambiguous, ask the tool for candidates and confirm.
- The quarter, or 'latest'.

## Workflow

1. Call `octagon-holdings-agent` once for the holdings analytics:

   ```
   Retrieve the 13F holdings analytics for the holder with CIK 0001067983 for Q2 2026, limited to 25 records.
   ```

2. For the industry view, call once more:

   ```
   Retrieve the industry breakdown for the holder with CIK 0001067983 for Q2 2026.
   ```

## Output structure

1. **Holder and quarter**: name, CIK, period of report, filing date.
2. **Top positions**: security, shares, value, weight, change versus the prior quarter.
3. **Industry breakdown**: industry, weight, change.
4. **New and closed positions** when the tool reports them.

## Framing rules

- Changes are between two reported quarters, not trades on a date. Say so.
- Do not recommend copying the holder. If asked, say the plugin reports filings and suggest a licensed advisor.

## When not to use

- The holder's returns: `holder-performance`.
- One stock across holders: `symbol-ownership`.
