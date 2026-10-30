---
name: mispricing-analysis
description: Compare a prediction market's implied probability with Octagon's independent model estimate and report the mispricing, its size and direction, the confidence behind each estimate, and how similar gaps have resolved historically. Use when the user asks whether a market is mispriced, how the market compares to the model, or whether the odds look right.
---

# Mispricing Analysis

Report where the market-implied probability and the model's probability disagree, and what that disagreement is worth as evidence. The mispricing is the finding; the user decides what, if anything, to do with it.

## Inputs

- A Kalshi or Polymarket market link, a Kalshi ticker, or a Polymarket event slug. If the user names an event without one, ask the agent to find candidate markets and confirm which one they mean.

## Workflow

1. Call `octagon-prediction-markets-agent` with the market reference the user gave (link, Kalshi ticker, or Polymarket event slug) and `cache: true`, which returns a cached report only. If none exists, explain that generating one takes minutes and uses report credits, and call again with `cache: false` only after the user agrees. The same applies when the user wants a fresh report over a cached one: state the cost, then refresh once they agree.
2. From the report, extract the market-implied probability (with timestamp), the model probability, and the reasoning the model gives.
3. If the user asks whether the gap is new, get the event's history: `prediction_markets_history` for a Kalshi event ticker (the event-specific URL segment, such as `kxfeddecision-26jun`; a series-page link has none, so ask or take it from the report), or ask the agent for a Polymarket event's history, and compare the latest available gap with recent levels. Describe it as today's gap only when the probability timestamps show it was captured today; a cached report may be older.
4. Present the analysis in the structure below.

## Output structure

1. **The two probabilities**: market-implied and model, side by side, with the timestamp of each.
2. **The mispricing**: size in probability points and direction ("the market implies 14 points more than the model on YES").
3. **Why they disagree**: the sources or factors the model weighs differently from the crowd, with citations.
4. **Confidence**: how certain each estimate is. Note the market's volume and open interest, its Trust Score and label (a low score means the price deserves less weight as evidence), and the model's stated confidence or track record on this market type.
5. **Historical context**: how gaps of this size on similar markets have tended to resolve, when the report provides it.
6. **What would close the gap**: the developments that would move the market toward the model, or the model toward the market.

## Framing rules

- Use "mispricing", "divergence", and "market-implied versus model probability". Do not describe the gap as an opportunity or as something to capture.
- Never recommend a side, an amount, or timing. If the user asks what to do, say that the plugin provides analysis rather than recommendations, and restate the finding with its confidence.
- Where the agent's report phrases the gap as advice, keep the finding and remove the advice wording.
