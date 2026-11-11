---
name: podcast-catch-up
description: Summarize what finance and business podcasts discussed in a period, optionally on one show, with the episodes behind each theme. Use when the user asks what investors were talking about, wants to catch up on a week or month, or asks what a show focused on over a period.
---

# Podcast Catch-Up

Give the user the themes of a period as podcasts covered them: what was discussed, by whom, where views split, and the episodes behind each theme.

## Inputs

- A period. Use the user's words and make them concrete when they are relative: "last week of September 2026", "between September 15 and September 28, 2026", "in August 2026". If the user gives no period, ask for one or default to the last 30 days and say so.
- Optional: one show, a kind of show ("macro podcasts", "wealth-management podcasts"), or a lens ("what mattered for rates").

## Workflow

1. Call `octagon-podcasts-agent` once with the period and any show or lens, in one sentence, for example:

   ```
   What were market podcasts discussing between September 15 and September 28, 2026?
   ```

   ```
   What were the main themes on Bloomberg Surveillance in September 2026?
   ```

2. If the tool reports no coverage for the period, relay the most recent indexed episode date it gives and offer a period that ends there. Do not fill the gap from memory.
3. If the answer opens with an italic line saying the last 30 days had no matches, keep the line; the user asked for a period the index does not cover yet.

## Output structure

1. **Period and scope**: the dates covered and the shows involved, in one line.
2. **Themes**: three to six, most discussed first. For each theme: what was said, who said it (show and date, person only when the tool names one), and where speakers disagreed. Keep the tool's `[n]` markers on every sentence that carries a view.
3. **Notable disagreements**: the one or two splits worth the user's attention, with both sides cited.
4. **Sources**: the tool's `Sources:` list, unchanged.

## Framing rules

- Themes are what podcasts discussed, not what happened in markets. Write "podcasts focused on", not "markets were driven by".
- Every view is attributed: "on Odd Lots (2026-09-22)", "a guest on Invest Like the Best". Never present a speaker's forecast as a fact.
- Do not add a conclusion of your own or recommend a position.
- Keep quotes short, under 20 words, in quotation marks.

## When not to use

- A question about one company or topic across shows: `topic-views`.
- The latest N episodes of one show rather than a period: `show-recap`.
- Which companies were mentioned most, as a ranking: `most-discussed`.
- Earnings calls, filings or financials: the Octagon AI plugin. Prediction-market odds: the Octagon Prediction Markets plugin.
