---
name: earnings-calls-get-started
description: Introduce Octagon Earnings Calls, explain what it covers and how to connect, and suggest first requests. Use when the user is new to the plugin, asks what it can do with earnings call transcripts, or needs help connecting their Octagon account.
---

# Get Started with Octagon Earnings Calls

Built for analysts, portfolio managers and journalists who need what management actually said on the call and what analysts pushed back on, with the call behind every claim. Ask about one call or a run of calls and get guidance, commentary, Q&A and tone, cited to the quarter.

## What the plugin does

- **Extract guidance and revenue outlook**.
- **Summarize analyst Q&A**.
- **Track management commentary by topic**.
- **Gauge call sentiment and tone**.
- **Review product pipeline and capital allocation**.

## Coverage

- Transcripts: prepared remarks and Q&A for more than 8,000 public companies, back to 2018, updated daily.
- Depth: guidance figures, named executive statements, analyst questions with attribution, and topic-by-topic commentary.
- Across calls: the same topic traced over several quarters to show how the narrative changed.

## Connecting

1. The first time an Octagon tool runs, the user is asked to sign in to their Octagon account.
2. If Octagon tools are unavailable, or sign-in has expired, ask the user to connect or reconnect Octagon from the plugin's connection settings, then retry.
3. Never ask the user to paste passwords, access tokens, or other credentials into the conversation.
4. Each request uses one Octagon credit; say so when the user asks for many things at once.

## How the tool works

The plugin has one tool, `octagon-transcripts-agent`. It takes a plain-language request and answers from earnings call transcripts only.

- Name the company, the quarter or 'latest', and the topic (guidance, margins, a product, capital allocation, a named analyst's question).
- One call per request unless the user asks about change over time; then name the range of quarters in one call.
- Executives are named in transcripts; analysts usually are too. Keep those attributions exactly as the tool returns them.

## Suggested first requests

Offer two or three of these, adapted to what the user mentioned:

- "What guidance did NVIDIA give on its latest earnings call?"
- "What did analysts push back on during Netflix's latest earnings call?"
- "How has Amazon's commentary on AWS changed over the last four earnings calls?"
- "Summarize management's remarks on capital allocation from Apple's latest call."

## How to answer

- Cite the call and quarter for every statement and figure. Keep the tool's source references.
- Distinguish guidance (a stated figure or range) from commentary (qualitative remarks).
- Report what was said; do not forecast from it or advise on the stock.

## What the plugin does not do

State these plainly when relevant, and name the plugin that does:

- The filing text behind the numbers (10-K, 10-Q, 8-K): the **Octagon SEC Filings** plugin.
- What investors and strategists said on podcasts: the **Octagon Podcasts** plugin.
- Stock prices and valuation: the **Octagon Stock Data** plugin.
- Everything at once, across sources: the **Octagon AI** plugin.
- It does not give investment advice. When asked what to buy, sell or hold, offer the data and suggest a licensed advisor.
