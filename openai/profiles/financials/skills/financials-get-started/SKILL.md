---
name: financials-get-started
description: Introduce Octagon Financials, explain what it covers and how to connect, and suggest first requests. Use when the user is new to the plugin, asks what it can do with financial statements, or needs help connecting their Octagon account.
---

# Get Started with Octagon Financials

Built for analysts, students and operators who need the numbers from the statements, by period, with the source attached. Ask for a statement, a growth series, a ratio, a health score or a segment breakdown and get it as reported.

## What the plugin does

- **Income statement, balance sheet, cash flow**.
- **Year-over-year growth series**.
- **Ratios and financial health scores**.
- **Analyst estimates**.
- **Revenue by segment and geography**.

## Coverage

- Statements: income statement, balance sheet and cash flow statement by fiscal year or quarter.
- Derived: year-over-year growth, ratios, Altman Z and Piotroski scores, financial ratings and grades.
- Forward and structural: analyst revenue and EPS estimates, revenue by product and by geography, ESG ratings and sector benchmarks.

## Connecting

1. The first time an Octagon tool runs, the user is asked to sign in to their Octagon account.
2. If Octagon tools are unavailable, or sign-in has expired, ask the user to connect or reconnect Octagon from the plugin's connection settings, then retry.
3. Never ask the user to paste passwords, access tokens, or other credentials into the conversation.
4. Each request uses one Octagon credit; say so when the user asks for many things at once.

## How the tool works

The plugin has one tool, `octagon-financials-agent`. It takes a plain-language request and answers from financial statements only.

- Name the company, the statement or metric, the period type (annual or quarterly) and how many periods.
- One statement or metric per call; a peer comparison is one call naming both companies.
- Figures come with the period and currency; keep both in the answer.

## Suggested first requests

Offer two or three of these, adapted to what the user mentioned:

- "Retrieve Apple's income statements for the last five fiscal years."
- "What are Microsoft's Altman Z-Score and Piotroski Score?"
- "Break down Tesla's revenue by geographic segment."
- "Compare the operating margins of AMD and NVDA over the last three years."

## How to answer

- State the period, currency and source for every figure.
- Report as-reported numbers; label any derived figure as derived and show the inputs.
- Do not turn a ratio or score into a buy, sell or hold; if asked, say the plugin reports data and suggest a licensed advisor.

## What the plugin does not do

State these plainly when relevant, and name the plugin that does:

- The filing text the numbers come from: the **Octagon SEC Filings** plugin.
- Stock prices, market cap and price targets: the **Octagon Market Data** plugin.
- Management's commentary on the numbers: the **Octagon Earnings Calls** plugin.
- Everything at once, across sources: the **Octagon AI** plugin.
- It does not give investment advice. When asked what to buy, sell or hold, offer the data and suggest a licensed advisor.
