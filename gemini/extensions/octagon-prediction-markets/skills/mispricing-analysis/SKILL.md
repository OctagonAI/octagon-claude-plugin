---
name: mispricing-analysis
description: Compare a prediction market's implied probability with Octagon's research-adjusted model estimate and report the mispricing, its size and direction, the confidence behind each estimate, and how similar gaps have resolved historically. Use when the user asks whether a market is mispriced, how the market compares to the model, or whether the odds look right.
---

# Mispricing Analysis

Report where the market-implied probability and the model's probability disagree, and what that disagreement is worth as evidence. The mispricing is the finding; the user decides what, if anything, to do with it.

## Inputs

- A Kalshi or Polymarket market link, a Kalshi ticker, or a Polymarket event slug. If the user names an event without one, ask the agent to find candidate markets and confirm which one they mean.

## Workflow

1. Call `octagon-prediction-markets-agent` with the market reference the user gave (link, Kalshi ticker, or Polymarket event slug) and `cache: true`, which returns a cached report only. If none exists, explain that generating one takes minutes and uses report credits, and call again with `cache: false` only after the user agrees. The same applies when the user wants a fresh report over a cached one: state the cost, then refresh once they agree.
2. From the report, extract the market-implied probability (with timestamp), the model probability, and the reasoning the model gives. The model probability is market-anchored: it starts from the contract's own price and is adjusted by research evidence, so it is correlated with the market, not an independent opinion. When the report carries `model_probability_source` and `evidence_grade`, report them: `recalibrated` means research evidence moved the estimate away from the price, and `evidence_grade` caps how far it was allowed to move (at most ±20pp for A, ±12pp for B, ±7pp for C, ±3pp for D; a cap is a limit, not the distance actually moved, so read the gap itself for the size); a `recalibrated` row graded A or B is the only kind that can carry a sizable evidence-driven gap; `market_baseline` is the price re-expressed and carries no signal; `ladder_model` compares rungs within a threshold ladder, not the ladder against the market; `unmodeled`, `out_of_scope`, or `determined` are not forecasts.
3. If the user asks whether the gap is new, get the event's history: `prediction_markets_history` for a Kalshi event ticker (the event-specific URL segment, such as `kxfeddecision-26jun`; a series-page link has none, so ask or take it from the report; a market deeplink ends in a market ticker instead, which is the event ticker plus an outcome suffix (`kxoaianth-40-oai` → `KXOAIANTH-40`): strip the suffix, or take the event ticker from the agent's report, and keep the selected outcome for the analysis), or ask the agent for a Polymarket event's history. Compare historical gaps only when the history includes time-aligned model probabilities; otherwise report the market's movement only and say that historical gap data is unavailable. Describe the current gap as today's gap only when its probability timestamps show it was captured today; a cached report may be older.
4. Decide what the source allows you to say, then present the analysis in the structure below:
   - `recalibrated` (and `ladder_model`, within its ladder): report the gap as an evidence-driven mispricing, with the grade and the cap.
   - `market_baseline`: the model value is the market price re-expressed, so there is no evidence-driven gap to report; present the market-implied probability, say the report carries no independent read on it, and give the drivers and Trust Score instead.
   - `unmodeled`, `out_of_scope`, or `determined`: do not report a model probability or a mispricing at all; present the market-implied probability (or the settled outcome) and say the event is not modelled.
   - No source field in the report: present the gap with the caveat that the estimate is market-anchored.

## Output structure

1. **The two probabilities**: market-implied and model, side by side, with the timestamp of each, and the model's source and evidence grade. Omit the model probability for `unmodeled`, `out_of_scope`, and `determined` rows.
2. **The mispricing**: size in probability points and direction ("the market implies 14 points more than the model on YES"). Only for `recalibrated` (or `ladder_model`, rung against rung) rows; for `market_baseline` say that the model tracks the price and no gap is claimed.
3. **Why they disagree**: the sources or factors the model weighs differently from the crowd, with citations, and the provenance of the estimate (source and evidence grade) so the reader knows whether the gap reflects evidence or the anchor.
4. **Confidence**: how certain each estimate is. Note the market's volume and open interest, its Trust Score and label (a low score means the price deserves less weight as evidence), and the model's stated confidence or track record on this market type.
5. **Historical context**: how gaps of this size on similar markets have tended to resolve, when the report provides it.
6. **What would close the gap**: the developments that would move the market toward the model, or the model toward the market.

## Framing rules

- Use "mispricing", "divergence", and "market-implied versus model probability". Do not describe the gap as an opportunity or as something to capture.
- Never recommend a side, an amount, or timing. If the user asks what to do, say that the plugin provides analysis rather than recommendations, and restate the finding with its confidence.
- Where the agent's report phrases the gap as advice, keep the finding and remove the advice wording.
