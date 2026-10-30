---
name: get-started
description: Introduce Octagon Prediction Markets, explain what prediction-market data is and how to connect, and suggest first requests. Use when the user is new to the plugin, asks what it can do with prediction markets, Kalshi, or Polymarket, or needs help connecting their Octagon account.
---

# Get Started with Octagon Prediction Markets

Octagon Prediction Markets treats a prediction market as a dataset: the probability the crowd currently assigns to a real-world event, how that probability has moved, why, and how much the market itself can be trusted. Use this skill to orient a new user and get them to a first useful answer quickly.

## What the plugin does

- **Event briefs**: what resolves a market and when, the current market-implied probability, the drivers and catalysts behind it, and how similar events resolved before. See `event-brief`.
- **Probability history**: how the odds moved over a period, the largest moves, and what explains each one. See `probability-history`.
- **Mispricing analysis**: where the market-implied probability diverges from an independent model estimate, by how much, and with what confidence. See `mispricing-analysis`.
- **Trust Score**: a 0–100 score of whether a market can be rigged and whether its price can be trusted, with the reasons. See `trust-score`.
- **Market discovery**: find the markets that exist on a topic, on either venue, and screen them by where the model disagrees with the price.

## Coverage

- **Venues**: Kalshi and Polymarket.
- **Scale**: more than 130,000 active events across the two venues.
- **Categories**: Sports, Crypto, Climate, Elections, Finance, Commodities, Politics, Culture, Economics, Tech & Science, and Mentions.

## Who it is for

Research analysts, economists, strategists, policy and risk teams, journalists, and forecasters who want event probabilities as evidence.

## Connecting

1. The first time an Octagon tool runs, the user is asked to sign in to their Octagon account.
2. If Octagon tools are unavailable, or sign-in has expired, ask the user to connect or reconnect Octagon from the plugin's connection settings, then retry.
3. Never ask the user to paste passwords, access tokens, or other credentials into the conversation.
4. Cached reports are available on every plan. Generating a new report requires a plan that includes report generation and uses report credits; say so before generating one.

## Suggested first requests

Offer two or three of these, adapted to what the user mentioned:

- "Write an event brief for the next Fed rate decision market."
- "How have the odds on a rate cut moved this month, and why?"
- "Is this market mispriced relative to the model? <Kalshi or Polymarket link>"
- "What is the Trust Score for this market, and what drives it?"
- "Which markets exist on the World Cup final, and which does the model disagree with?"

## How to answer

- Report probabilities as the market's current belief, with a timestamp, never as a price to act on.
- Cite sources for every driver, catalyst, and historical comparison.
- When a request names an event but not a market, ask the agent to find candidate markets. Confirm which one the user means only when the analysis needs a single market (a brief, a history, a mispricing read, a Trust Score); a discovery request ("which markets exist on…") is answered with the list.
- For discovery-first requests ("which markets exist on…"), start with market discovery, list the candidates, and add `mispricing-analysis` as needed. For broad or multi-step requests about an identified market, start with `event-brief` and add `probability-history`, `mispricing-analysis`, or `trust-score` as needed.

## What the plugin does not do

State these plainly when relevant:

- It does not place orders, route wagers, or pick a side.
- It does not suggest how much to put on anything or how to allocate funds.
- It does not hold funds or connect to any trading account.
- It does not give personalized financial advice. When asked what a specific person should do, offer the analysis and suggest a licensed advisor.
