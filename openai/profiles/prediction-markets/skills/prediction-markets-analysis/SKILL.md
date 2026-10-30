---
name: prediction-markets-analysis
description: Research a prediction market on Kalshi or Polymarket with the Octagon prediction-markets agent. Returns a cited report with the market-implied and model probabilities, price drivers, catalysts, resolution history, and the market's Trust Score. Use when the user shares a Kalshi or Polymarket link, names an event with a market, or asks what the odds on something are and why.
---

# Prediction Markets Analysis

Use the Octagon prediction-markets agent to research one market, or to find the markets that exist for a topic. The agent covers both major venues and returns research with sources.

## Coverage

- **Venues**: Kalshi and Polymarket. The agent takes a Kalshi market URL or event ticker, or a Polymarket event URL or slug.
- **Scale**: more than 130,000 active events across the two venues, with new ones picked up continuously.
- **Categories**: Sports, Crypto, Climate, Elections, Finance, Commodities, Politics, Culture, Economics, Tech & Science, and Mentions. Sports is the largest by event count.
- **Trust Score**: every report carries the market's Octagon Trust Score, 0 to 100, with the reasons behind it. See `trust-score`.

## What the agent returns

| Section | Content |
|---------|---------|
| Market overview | Title, venue, resolution criteria and date, current market-implied probability with timestamp |
| Market vs. model | Octagon's independent probability next to the market's, and the size and direction of the gap |
| Price drivers | The factors behind the current probability, each with a source |
| Catalysts | Dated upcoming events that could move the probability |
| Resolution history | How similar events resolved before, as base-rate context |
| Trust Score | The 0–100 score, its label, and the pillar or screen behind it |
| Follow-up questions | Two or three prompts for going deeper |

## Workflow

1. **Resolve the market.** If the user gives a link or ticker, use it exactly. If they describe an event in words, ask the agent to search for candidate markets (it can list and filter markets by topic, category, and venue), then confirm which one they mean.
2. **Fetch the report.** Call `octagon-prediction-markets-agent` with the market reference and `cache: true`. This returns the cached report only and never generates one.
3. **Generate only with consent.** If no cached report exists, or the user asks for a fresh report over the cached one (cached probabilities may be old; check the timestamp), tell the user that generating one takes several minutes and uses report credits, and call again with `cache: false` only after they agree.
4. **Add history when asked.** For a Kalshi event, `prediction_markets_history` returns the probability series for an event ticker. For a Polymarket event, ask the agent for the event's history.
5. **Present the findings** in the report's structure, keeping every source.

## Example requests

- "Research this Kalshi market: https://kalshi.com/markets/kxfeddecision/fed-meeting/kxfeddecision-26jun"
- "Research this Polymarket market: https://polymarket.com/event/<event-slug>"
- "Which markets exist on the next FOMC decision, on either venue?"
- "What is the Trust Score for this market, and what drives it?"
- "Where does the model disagree most with the market in Crypto this week?"

## Framing

- Probabilities are the market's belief at a timestamp. Report them as such.
- A gap between market and model is a mispricing finding: state its size, direction, and confidence. Do not turn it into a recommendation.
- Do not suggest wagers, sides, amounts, or timing. If the report's text phrases a finding as advice, keep the finding and drop the advice wording.
- This is research, not investment advice.
