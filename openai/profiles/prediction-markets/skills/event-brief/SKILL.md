---
name: event-brief
description: Write a cited analyst brief on one prediction-market event, covering resolution criteria, the current market-implied probability, base rates, drivers, and the catalyst calendar. Use when the user asks what a prediction market says, shares a Kalshi or Polymarket link, or asks for research on the odds of an event.
---

# Event Brief

Deliver a one-page brief that an analyst could forward: what the market measures, what it currently believes, why, and what could change that.

## Inputs

- A Kalshi or Polymarket market link, a Kalshi ticker, or a Polymarket event slug. If the user names an event without one, ask the agent to find candidate markets on either venue and confirm which one they mean.
- Optional: the user's angle (policy, macro, sector, newsroom), which decides which drivers to lead with.

## Workflow

1. Call `octagon-prediction-markets-agent` with the market link and `cache: true`, which returns a cached report only and never generates one. If no cached report exists, tell the user that generating a report takes several minutes and uses report credits, and call again with `cache: false` only after they agree.
2. If the user wants recent movement in context, fold the trend into the brief. For a Kalshi event, `prediction_markets_history` takes the event ticker, the event-specific segment of the market URL such as `kxfeddecision-26jun` in `…/kxfeddecision/fed-meeting/kxfeddecision-26jun`; a link that ends at the series page (`…/fed-meeting`) has no event ticker, so ask which event the user means or take the ticker from the agent's report. For a Polymarket event, ask the agent for the event's history.
3. Write the brief in the structure below. Every driver, base rate, and catalyst carries a source.

## Brief structure

1. **Market**: title, platform, link, resolution criteria, resolution date, and any rule detail that matters more than the headline.
2. **Current read**: market-implied probability with timestamp; volume and open interest as a reliability note (thin markets produce noisier prices).
3. **Base rates**: how similar events have resolved historically, and what that implies.
4. **Drivers**: the three to five factors behind the current probability, each with a source and a direction.
5. **Catalyst calendar**: dated upcoming events that could move the market, with the direction each would push.
6. **Model view**: the model's probability and the gap to the market, with the confidence behind it.
7. **Trust Score**: the market's 0–100 score and label from the report, and the pillar or screen behind it, so the reader knows how much weight the price deserves.
8. **What would change the picture**: the two or three developments that would most alter the probability.

## Framing rules

- The probability is the market's belief. Write "the market implies 62%", not "YES is cheap at 62".
- A gap between market and model is a finding. Report its size, direction, and confidence; do not turn it into a recommendation.
- Keep the agent's wording within this frame. If the report text suggests an action, keep the underlying finding and drop the action phrasing.
- Do not add or suggest wagers, sides, or amounts.
