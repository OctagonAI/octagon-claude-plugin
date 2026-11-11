---
name: voice-tracker
description: Track what a named podcast host or guest has said over time, episode by episode, with citations, and note where their view held or changed. Use when the user names a person and asks what they have said, how their view evolved, or where they appeared recently.
---

# Voice Tracker

Follow one person across episodes: what they said, when, on which show, and whether their view held or moved.

## Inputs

- The person's name, with their role when the user gives it ("as a guest", "the host of"). The role helps the tool filter; pass it through.
- A window in words. Default to the last 90 days for a person, since guests appear less often than topics recur, and say so.
- Optional: a topic to focus on ("on rates", "on AI").

## Workflow

1. Call `octagon-podcasts-agent` once:

   ```
   What has David Rosenberg said as a guest since September 2026?
   ```

   ```
   What has the host of Odd Lots said about housing since July 2026?
   ```

2. If the tool reports no coverage, say the person did not appear in the indexed episodes for that window (give the most recent indexed date the tool reports), and offer a wider window. Do not summarize what the person has said elsewhere from memory.
3. If the tool returns episodes but attributes statements to "a guest on <show>" rather than the person, the episode did not identify the speaker clearly. Report it that way; do not upgrade the attribution.

## Output structure

1. **Who and when**: the person, the window, the number of appearances found.
2. **Appearances, chronological**: for each: date, show, episode title, what they said on the topic with the `[n]` markers the tool attached. Short quotes, under 20 words, only when the tool gives them.
3. **Through-line**: one or two sentences on whether the view held or changed across the appearances, cited to the episodes that show it.
4. **Sources**: the tool's `Sources:` list, unchanged.

## Framing rules

- Report the person's statements as their statements. Do not endorse, grade, or extrapolate them.
- Where the tool is uncertain who spoke, say so. The transcripts carry no speaker labels; attribution comes from the episode's listed hosts and guests, title and description.
- If the user asks whether to follow the person's view, say the plugin reports views and does not advise.

## When not to use

- The views of many people on a topic: `topic-views`.
- A show's recent episodes regardless of who spoke: `show-recap`.
- A company executive's remarks on an earnings call: the Octagon AI plugin.
