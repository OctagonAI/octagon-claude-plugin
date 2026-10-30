---
name: trust-score
description: "Explain and retrieve the Octagon Trust Score for a Kalshi or Polymarket market: a 0–100 score of whether the market can be rigged and whether its price can be trusted, with the pillars and screens behind it. Use when the user asks how trustworthy a market is, whether a market could be manipulated, what the Trust Score or Trust Index means, or why a market scored the way it did."
---

# Trust Score

The Octagon Trust Index gives every covered market a Trust Score from 0 to 100. It answers two questions: can anyone rig this market, and can you trust its price?

## How the score is built

| Axis | Pillars and components | What they measure |
|------|------------------------|-------------------|
| Integrity | Manipulation resistance, information fairness, settlement reliability | Whether someone controls the outcome, whether a small circle could know first, whether it will settle the way the rules say |
| Trade quality | Liquidity, move quality, rule clarity | Whether the price is deep enough to mean something, whether moves look organic, whether the resolution rules are unambiguous |

- Integrity sets the ceiling: a market whose subject controls the outcome stays capped no matter how liquid it is.
- Caps are named in the score's reasons, including a severe activity flag when unusual trading is detected.
- Labels are the engine's own words: Strong, Good, Caution, High Risk, Avoid.
- Scores recompute on a rolling cycle; the report shows the timestamp.

## Workflow

1. Get the market reference: a Kalshi or Polymarket link, a Kalshi ticker, or a Polymarket event slug. If the user describes an event in words, ask the agent to find candidate markets first.
2. Call `octagon-prediction-markets-agent` with `cache: true` and ask for the market's Trust Score with its breakdown. The agent reads the scorecard behind the market's report; a cached report already includes the headline score and label. If no cached report exists, tell the user that generating one takes several minutes and uses report credits, and call again with `cache: false` only after they agree.
3. Present the score, its label, the axis and pillar scores, and the specific screen or cap behind the verdict. Name the timestamp.

## Output structure

1. **Score and label**: "72, Good", with the as-of time.
2. **Integrity**: the three pillar scores and the one that limits the result, if any.
3. **Trade quality**: liquidity, move quality, and rule clarity.
4. **Caps and flags**: any cap applied and the reason.
5. **What it means for the analysis**: how much weight the market's price deserves as evidence.

## Framing

- The score describes the contract and the market around it, not the people trading it. It never certifies a market free of manipulation.
- A low score is a reason to weight the market's probability less, not a recommendation to trade against it.
- The Trust Index is research on observable market risk. It is not investment advice or a compliance product.
