---
name: sec-filings-get-started
description: Introduce Octagon SEC Filings, explain what it covers and how to connect, and suggest first requests. Use when the user is new to the plugin, asks what it can do with SEC filings, or needs help connecting their Octagon account.
---

# Get Started with Octagon SEC Filings

Built for analysts, portfolio managers, credit teams and journalists who need what a filing actually says, with the filing behind every claim. Ask about a 10-K, a 10-Q, an 8-K, an S-1 or a proxy and get the extracted passages, figures and comparisons, cited to the filing and period.

## What the plugin does

- **Analyze 10-K, 10-Q and 8-K filings**.
- **Extract risk factors and MD&A**.
- **Review footnotes, covenants and segments**.
- **Compare filings year over year**.
- **Analyze S-1 and proxy statements**.

## Coverage

- Filings: 10-K, 10-Q, 20-F, S-1, 8-K, DEF 14A proxies and their amendments.
- Companies: more than 8,000 SEC filers, with history back to 2018 and daily updates.
- Depth: full filing text, so footnotes, covenants, segments and governance details are reachable, not only headline numbers.

## Connecting

1. The first time an Octagon tool runs, the user is asked to sign in to their Octagon account.
2. If Octagon tools are unavailable, or sign-in has expired, ask the user to connect or reconnect Octagon from the plugin's connection settings, then retry.
3. Never ask the user to paste passwords, access tokens, or other credentials into the conversation.
4. Each request uses one Octagon credit; say so when the user asks for many things at once.

## How the tool works

The plugin has one tool, `octagon-sec-agent`. It takes a plain-language request and answers from SEC filings only.

- Name the company (ticker or name), the filing type when it matters (10-K, 10-Q, 8-K, S-1, DEF 14A), the period (fiscal year or quarter), and the section or topic (risk factors, MD&A, footnotes, covenants, segments, compensation).
- One filing question per call; a comparison across two filings is one call that names both periods.
- The tool reads the filing itself. Figures come with the filing and period they were reported in; keep that attribution in the answer.

## Suggested first requests

Offer two or three of these, adapted to what the user mentioned:

- "Summarize the risk factors in Apple's latest 10-K."
- "What changed in Microsoft's MD&A between its last two 10-K filings?"
- "Extract the debt covenants disclosed in Tesla's latest 10-Q."
- "What did NVIDIA disclose in its 8-K filings this quarter?"

## How to answer

- Cite the filing and period for every figure and quotation. Keep the tool's source references.
- Quote filing language sparingly and mark it as a quotation; paraphrase the rest.
- Report what the company disclosed; do not grade the disclosure or advise on the stock.

## What the plugin does not do

State these plainly when relevant, and name the plugin that does:

- Earnings calls and management commentary: the **Octagon Earnings Calls** plugin.
- Stock prices, performance and valuation multiples: the **Octagon Market Data** plugin.
- Financial statements, ratios and estimates: the **Octagon Financials** plugin.
- Everything at once, across sources: the **Octagon AI** plugin.
- It does not give investment advice. When asked what to buy, sell or hold, offer the data and suggest a licensed advisor.
