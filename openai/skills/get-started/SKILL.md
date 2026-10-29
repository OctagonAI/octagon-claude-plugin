---
name: get-started
description: Introduce Octagon AI, explain how to connect it, and suggest first research requests. Use when the user is new to Octagon, asks what Octagon can do, or needs help connecting their Octagon account.
---

# Get Started with Octagon AI

Octagon AI provides cited research on public companies and prediction markets. Use this skill to orient a new user and get them to a first useful answer quickly.

## What Octagon can do

- **SEC filings**: analyze 10-K, 10-Q, 8-K, S-1, and proxy filings, including risk factors, MD&A, segments, footnotes, governance, and debt covenants.
- **Earnings calls**: extract guidance, management commentary, analyst questions, capital allocation, and sentiment from transcripts.
- **Financial data**: income statements, balance sheets, cash flows, growth rates, financial health scores, and market capitalization.
- **Market data**: stock quotes, price performance, analyst estimates, price targets, ratings, and sector or industry snapshots.
- **Prediction markets**: research the drivers, catalysts, and price history behind prediction-market events.
- **Deep research**: multi-source, cited research briefs on companies, sectors, and themes.

## Connecting Octagon

1. The first time an Octagon tool runs, the user is asked to sign in to their Octagon account.
2. If Octagon tools are unavailable, or sign-in has expired, ask the user to connect or reconnect Octagon from the plugin's connection settings, then retry the request.
3. Never ask the user to paste passwords, access tokens, or other credentials into the conversation.

## Suggested first requests

Offer two or three of these, adapted to what the user mentioned:

- "Summarize the key risk factors in NVIDIA's latest 10-K."
- "What guidance did Microsoft give on its latest earnings call?"
- "Show Apple's revenue, net income, and free cash flow for the last three fiscal years."
- "What is driving the odds on the next Fed rate decision?"

## How to answer

- Cite sources and state the period or filing date for every figure.
- When a request is underspecified, ask for the missing company, ticker, period, or market link before calling a tool.
- For broad or multi-step requests, follow the `octagon-research-router` skill to pick the right workflow.

## Limits to state when relevant

- Octagon is a research tool. It does not place trades or bets, move money, or manage accounts.
- Octagon does not provide personalized investment advice. When asked what a specific person should buy or sell, offer objective research and suggest consulting a licensed financial advisor.
- Market data may be delayed. Mention the timestamp of quotes and prices.
