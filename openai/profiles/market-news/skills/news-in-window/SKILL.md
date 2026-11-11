---
name: news-in-window
description: Retrieve general market headlines, or news for a ticker, within a specific date range, for example around an earnings date or an event. Use when the user asks what was reported between two dates, what the news was on a given day, or for coverage around an event.
---

# News in a Window

List what was published in a date range, for the market or for one ticker.

## Inputs

- A date range (two dates, or one date for that day).
- Optional ticker; without one, general market headlines.

## Workflow

1. Call `octagon-news-agent` once with explicit dates:

   ```
   Retrieve stock news for NVDA from 2026-08-25 to 2026-08-29.
   ```

   ```
   Retrieve general market news from 2026-10-01 to 2026-10-03.
   ```

## Output structure

1. **Window**: the dates and the scope.
2. **Articles by day**: date, source, title, one-line summary.
3. **What the coverage focused on**: two or three sentences pointing at the articles.

## Framing rules

- Report the coverage; do not assert what caused what unless an article states it, and attribute it then.
- No recommendations.

## When not to use

- The latest items without a window: `ticker-news`.
- What the company itself said: `press-releases`.
