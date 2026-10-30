---
name: probability-history
description: Analyze how a prediction market's probability has moved over time, including the largest moves, regime changes, and the events that explain each move. Use when the user asks how the odds have changed, what moved a market, or wants the probability history of a Kalshi or Polymarket market.
---

# Probability History

Turn a market's price history into an explanation: when the probability moved, by how much, and what caused it.

## Inputs

- A Kalshi event ticker or event-specific Kalshi link, or a Polymarket event link or slug. For Kalshi, the ticker is the event-specific segment of the URL, such as `kxfeddecision-26jun` in `…/kxfeddecision/fed-meeting/kxfeddecision-26jun`; a link that ends at the series page (`…/fed-meeting`) has no event ticker, so ask which event the user means or take the ticker from the agent's report.
- A window. Default to the last 30 days when the user does not say.

## Workflow

1. For a Kalshi event, call `prediction_markets_history` with the event ticker and the window (`captured_from`, `captured_to`). Page with `cursor` when the response is truncated. Set `include_analysis` to true when the user wants more than the probability series. For a Polymarket event, ask `octagon-prediction-markets-agent` for the event's history over the window.
2. Compute from the series: start and end probability, net change, the largest moves (by size), and any regime change, meaning a sustained shift rather than a spike that reverted.
3. For each large move, identify the explanation: a data release, announcement, ruling, poll, or news event on or just before that date. When the history alone does not explain a move, call `octagon-prediction-markets-agent` with the market link and `cache: true`; generate a new report (`cache: false`) only after telling the user it takes minutes and uses report credits and getting their agreement.
4. Present the analysis in the structure below.

## Output structure

1. **Summary**: "Moved from 41% to 58% over 30 days; most of the change came on two days."
2. **Largest moves**: a table with date, from, to, size, and the explanation with a source.
3. **Regimes**: periods where the probability settled at a new level, and what defined them.
4. **Volatility and reliability**: how noisy the series is, and whether volume and open interest support reading small moves as signal.
5. **What to watch**: the upcoming dated events most likely to produce the next move.

## Framing rules

- Describe moves in probability terms: "rose 17 points after the CPI print", never in trading terms.
- Attribute every explanation to a dated source. If a move has no clear cause, say so rather than inventing one.
- Do not characterize any level as a good or bad price, and do not suggest timing or sides.
