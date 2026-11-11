---
name: press-releases
description: Retrieve a company's press releases, optionally within a date range, with dates and titles. Use when the user asks what a company announced, for its recent releases, or for announcements around an event.
---

# Press Releases

List a company's own press releases.

## Inputs

- One ticker.
- Optional date range; default to the latest releases. Optional count; default 10.

## Workflow

1. Call `octagon-news-agent` once:

   ```
   Retrieve Apple's press releases from the last 30 days.
   ```

## Output structure

1. **Releases**: date, title, one-line summary, link when returned, newest first.

## Framing rules

- A press release is the company's statement; say so when summarizing claims in it.
- No recommendations.

## When not to use

- Third-party coverage: `ticker-news`.
- The filing behind an announcement (an 8-K, for example): the Octagon SEC Filings plugin.
