---
name: ticker-news
description: Retrieve recent news articles about one stock, with dates and sources. Use when the user asks what is in the news about a company, for the latest headlines on a ticker, or what was reported in a window.
---

# Ticker News

List recent third-party news coverage of one stock.

## Inputs

- One ticker.
- Optional window; default to the latest items. Optional count; default 10.

## Workflow

1. Call `octagon-news-agent` once:

   ```
   What is the latest stock news for TSLA?
   ```

   ```
   Retrieve stock news for TSLA from 2026-10-01 to 2026-10-31.
   ```

## Output structure

1. **Articles**: date, source, title, one-line summary, link when returned, newest first.
2. **Themes** (when five or more items): the two or three recurring topics, each pointing at the articles.

## Framing rules

- Summarize what the articles report; attribute claims to their source.
- News is not a signal; no recommendations.

## When not to use

- The company's own announcements: `press-releases`.
- Crypto or forex coverage: `crypto-forex-news`.
