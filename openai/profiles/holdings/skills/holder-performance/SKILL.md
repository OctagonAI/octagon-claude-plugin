---
name: holder-performance
description: Summarize an institutional holder's performance and portfolio statistics as derived from its 13F filings. Use when the user asks how a fund has performed, how concentrated it is, or how its reported holdings have done over time.
---

# Holder Performance

Report the performance summary the filings support for one holder.

## Inputs

- The holder, by name or CIK.

## Workflow

1. Call `octagon-holdings-agent` once:

   ```
   Get a summary of the performance of the institutional holder with CIK 0001067983.
   ```

## Output structure

1. **Holder**: name, CIK, latest period of report.
2. **Performance summary**: the figures the tool returns (portfolio value over time, period changes, concentration, turnover), each with its period.
3. **Caveat**: 13F-derived performance reflects reported long US equity positions at quarter ends, not the fund's actual returns.

## Framing rules

- State the caveat every time; it is the most common misreading of 13F data.
- No recommendations.

## When not to use

- The positions themselves: `holder-portfolio`.
