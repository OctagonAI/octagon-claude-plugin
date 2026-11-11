---
name: most-discussed
description: Rank the companies, tickers or themes that podcasts discussed most in a period, with mention counts when available and the episodes behind the top entries. Use when the user asks what was talked about most, which companies dominated podcast discussion, or what the hot topics were, without naming one.
---

# Most Discussed

Tell the user what podcasts talked about most in a period, as a ranking with the episodes behind it.

## Inputs

- A period in words. Default to the last 30 days and say so.
- Optional: a show or kind of show, and whether the user wants companies, tickers or themes. Default to companies and themes.

Do not use this skill when the user names a company or topic; that is `topic-views`. A "most discussed" question is one that asks for the ranking itself.

## Workflow

1. Call `octagon-podcasts-agent` once, phrased as a ranking question with no company in it:

   ```
   Which companies were discussed most on podcasts in September 2026?
   ```

   ```
   What were the most discussed themes on macro podcasts in August 2026?
   ```

2. Read how the tool ranked. When the index has mention counts, the answer leads with counts per company or theme. When it does not, the tool ranks from the newest episodes in the window; in that case say the ranking reflects the most recent episodes rather than a count across the whole period.
3. If the tool reports no coverage for the period, relay the most recent indexed episode date and offer a period that ends there.

## Output structure

1. **Period and scope**: one line, including whether the ranking is count-based or based on the newest episodes.
2. **Ranking**: the top five to ten entries. For each: the company or theme, the count when given, and one line on what was said about it, with the `[n]` markers the tool attached.
3. **What stands out**: one or two sentences on a surprising entry or a shift, cited.
4. **Sources**: the tool's `Sources:` list, unchanged.

## Framing rules

- A high mention count means podcasts talked about it a lot. It is not a signal to act on, and the answer must not present it as one.
- Attribute the one-line summaries to shows and dates; do not state them as market facts.
- Keep quotes under 20 words.

## When not to use

- Views on a named company or topic: `topic-views`.
- A thematic summary of a period rather than a ranking: `podcast-catch-up`.
- Market data, prices or filings for the companies named: the Octagon AI plugin.
