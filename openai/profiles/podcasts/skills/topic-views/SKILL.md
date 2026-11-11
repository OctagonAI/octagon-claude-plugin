---
name: topic-views
description: Synthesize what podcast guests and hosts said about a topic, company or ticker, who holds each view, who disagrees, and how the conversation shifted over time. Use when the user asks what podcasts are saying about something, who disagrees on a question, or how sentiment on a topic has changed.
---

# Topic and Company Views

Lay out the range of views on a topic or company as podcasts expressed them: the positions, the reasoning behind each, who holds them, and how the balance moved if the user asks about change.

## Inputs

- A topic ("24/7 trading", "Fed rate path", "AI capex") or a company, by name or ticker. The tool resolves company names to tickers itself; pass the name the user used.
- A window in words. Default to the last 30 days when the user sets none, and say so in the answer.
- Optional: "who disagrees", "how has this shifted", a show or kind of show to focus on.

## Workflow

1. Call `octagon-podcasts-agent` once with the topic or company, the window, and the angle, in one sentence:

   ```
   What are podcast guests saying about Nvidia since September 2026?
   ```

   ```
   Will the Fed keep hiking? Who disagrees? Use episodes since July 2026.
   ```

2. For a shift question, ask for the two periods in the same call, so the tool compares them:

   ```
   How has sentiment on 24/7 trading shifted between July 2026 and September 2026?
   ```

3. If the tool reports no coverage, relay the most recent indexed episode date and offer a wider window or the broader theme the company belongs to. Do not fill in from memory.

## Output structure

1. **The question in one line** and the window used.
2. **Positions**: group views by position (for example, "hikes continue", "pause", "cuts by year-end"). Under each: who holds it (show and date; the person only when the tool names one), the reasoning they gave, and the `[n]` markers the tool attached.
3. **Where they disagree**: the crux of the disagreement in one or two sentences, with both sides cited.
4. **Shift** (only when asked): what changed between the periods, which voices moved, and which did not.
5. **Sources**: the tool's `Sources:` list, unchanged.

## Framing rules

- Every view belongs to a speaker, never to the answer. Write "a guest on Odd Lots argued that", not "the outlook is".
- Do not score the views, pick a winner, or say what the user should do with them. If the user asks which view is right or what to buy, say the plugin reports views and does not advise, and offer to show the strongest reasoning on each side.
- Quote sparingly, under 20 words, in quotation marks, with the speaker and date.
- When the window widened (italic line at the top of the tool's answer), keep that line.

## When not to use

- A period summary across many topics: `podcast-catch-up`.
- One person's statements over time: `voice-tracker`.
- A ranking of what was discussed most: `most-discussed`.
- What a company said about itself on an earnings call, or its filings and financials: the Octagon AI plugin.
- The odds of an event: the Octagon Prediction Markets plugin.
