---
name: show-recap
description: Recap the latest episodes of a named podcast, newest first, with each episode's date, main topics, guests when known, and a citation. Use when the user asks for the last N episodes of a show, what a show has covered recently, or a summary of a specific show's recent output.
---

# Show Recap

Give the user the recent run of one show: each episode, what it covered, who was on it when known, and the link.

## Inputs

- The show, as the user named it. The tool maps common names ("All-In", "Surveillance") to its catalogue; pass the user's wording and do not invent a catalogue spelling.
- How many episodes. Default to the last 3 when the user says "latest" or "recent" without a number; cap at 10.
- Optional: a topic to focus on within those episodes ("on AI capex").

## Workflow

1. Call `octagon-podcasts-agent` once:

   ```
   Summarize the last 3 All-In episodes.
   ```

   ```
   Summarize the last 5 Odd Lots episodes on housing.
   ```

   With a topic, the tool still returns the newest episodes and narrows the passages to the topic; an episode that did not touch the topic may appear with little to say about it, which is itself information.

2. If the tool does not recognize the show, ask the user to confirm the name, or run `podcasts-status` to see whether the index is reachable.
3. If the tool reports no coverage, relay the most recent indexed episode date; the show may not be in the catalogue.

## Output structure

1. **Show and count**: one line.
2. **Episodes, newest first**. For each: date, episode title, guests when the tool names them, the two to four main topics with the `[n]` markers the tool attached, and a one-line takeaway in the speakers' terms.
3. **Across the episodes**: one or two sentences on recurring themes or a change of focus, cited.
4. **Sources**: the tool's `Sources:` list, unchanged.

## Framing rules

- Describe what the episode discussed; do not evaluate the guests' calls.
- Attribute views to the show or to a named guest only when the tool does.
- Keep quotes under 20 words.

## When not to use

- A period across many shows: `podcast-catch-up`.
- A topic across shows: `topic-views`.
- What one person said across shows: `voice-tracker`.
- A company's earnings call: the Octagon AI plugin.
