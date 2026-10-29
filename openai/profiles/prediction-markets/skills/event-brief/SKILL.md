---
name: event-brief
description: Write a cited analyst brief on one prediction-market event, covering resolution criteria, the current market-implied probability, base rates, drivers, and the catalyst calendar. Use when the user asks what a prediction market or Kalshi market says, shares a market link, or asks for research on the odds of an event.
---

# Event Brief

Deliver a one-page brief that an analyst could forward: what the market measures, what it currently believes, why, and what could change that.

## Inputs

- A Kalshi market link. If the user names an event without a link, ask for the link or offer to look up the market.
- Optional: the user's angle (policy, macro, sector, newsroom), which decides which drivers to lead with.

## Workflow

1. Call `octagon-prediction-markets-agent` with the market link. Use the cached report first. If none exists, tell the user that generating a report takes several minutes and uses report credits, and ask before calling with `cache: false`.
2. If the user wants recent movement in context, add `prediction_markets_history` for the event ticker (the last path segment of the market URL) and fold the trend into the brief.
3. Write the brief in the structure below. Every driver, base rate, and catalyst carries a source.

## Brief structure

1. **Market**: title, platform, link, resolution criteria, resolution date, and any rule detail that matters more than the headline.
2. **Current read**: market-implied probability with timestamp; volume and open interest as a reliability note (thin markets produce noisier prices).
3. **Base rates**: how similar events have resolved historically, and what that implies.
4. **Drivers**: the three to five factors behind the current probability, each with a source and a direction.
5. **Catalyst calendar**: dated upcoming events that could move the market, with the direction each would push.
6. **Model view**: the model's probability and the gap to the market, if the report includes one, with the confidence behind it.
7. **What would change the picture**: the two or three developments that would most alter the probability.

## Framing rules

- The probability is the market's belief. Write "the market implies 62%", not "YES is cheap at 62".
- A gap between market and model is a finding. Report its size, direction, and confidence; do not turn it into a recommendation.
- Keep the agent's wording within this frame. If the report text suggests an action, keep the underlying finding and drop the action phrasing.
- Do not add or suggest wagers, sides, or amounts.
