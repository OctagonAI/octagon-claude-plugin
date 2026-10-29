---
name: probability-history
description: Analyze how a prediction market's probability has moved over time, including the largest moves, regime changes, and the events that explain each move. Use when the user asks how the odds have changed, what moved a market, or wants a history of a Kalshi market's probability.
---

# Probability History

Turn a market's price history into an explanation: when the probability moved, by how much, and what caused it.

## Inputs

- An event ticker, or a Kalshi market link (the ticker is the last path segment of the URL).
- A window. Default to the last 30 days when the user does not say.

## Workflow

1. Call `prediction_markets_history` with the event ticker and the window (`captured_from`, `captured_to`). Page with `cursor` when the response is truncated. Set `include_analysis` to true when the user wants more than the probability series.
2. Compute from the series: start and end probability, net change, the largest moves (by size), and any regime change, meaning a sustained shift rather than a spike that reverted.
3. For each large move, identify the explanation: a data release, announcement, ruling, poll, or news event on or just before that date. Use `octagon-prediction-markets-agent` with the market link when the history alone does not explain a move.
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
