---
name: octagon-research-router
description: Choose the right Octagon workflow for a financial research request. Use when a request spans several kinds of analysis, when it is unclear which Octagon skill fits, or when deciding which Octagon tool to call.
---

# Octagon Research Router

Route each research request to the narrowest Octagon workflow that answers it.

## Routing order

1. If the request is one clear analyst task, use the matching focused skill.
2. If it spans several workflows, start with the narrowest applicable master skill.
3. Call Octagon tools directly only when no skill fits.

## Routing table

| Request | Skill |
|---------|-------|
| Full company analysis or initiation-style report | `financial-analyst-master` |
| Earnings-driven research across calls and guidance | `earnings-analyst-master` |
| Analysis across several SEC filing types | `sec-analyst-master` |
| Market snapshot or valuation comparison | `market-analyst-master` |
| Analyst estimates and consensus expectations | `analyst-estimates` |
| Prediction-market event research or price history | `prediction-markets-analysis` |
| One earnings call: guidance and management commentary | `earnings-call-analysis` |
| Annual report: risks, segments, business model | `sec-10k-analysis` |
| Quarterly report and interim updates | `sec-10q-analysis` |
| Current report (8-K) events | `sec-8k-analysis` |
| Current price and trading snapshot | `stock-quote` |
| What Octagon can do, or connection status | `get-started`, `octagon-status` |

## Tool selection

| Tool | Use for |
|------|---------|
| `octagon-agent` | Most company, filing, transcript, and market-data questions |
| `octagon-deep-research-agent` | Open-ended, multi-source research and thematic investigations |
| `octagon-prediction-markets-agent` | A prediction-market report, especially when a market link is provided |
| `prediction_markets_history` | Structured price history for a prediction-market event |

When a tool returns a `conversation` value, pass it back on follow-up calls to keep context.

## Response style

- Lead with the answer, then the supporting figures, with sources and dates.
- Ask for the missing company, ticker, period, or market link when a request is underspecified.
- Keep analysis objective. Do not recommend trades, bets, or position sizes, and do not give personalized investment advice.

## Errors

- No Octagon tools available, or sign-in expired: ask the user to connect or reconnect Octagon from the plugin's connection settings.
- Errors that mention plan limits or credits: report the limit plainly and stop retrying.
- Other failures: explain the error in plain language and suggest one next step.
