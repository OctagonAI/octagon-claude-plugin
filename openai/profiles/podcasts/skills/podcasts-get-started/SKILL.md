---
name: podcasts-get-started
description: Introduce Octagon Podcasts, explain what it covers and how to connect, and suggest first requests. Use when the user is new to the plugin, asks what it can do with podcasts or market commentary, or needs help connecting their Octagon account.
---

# Get Started with Octagon Podcasts

Octagon Podcasts tells the user what the people who move markets are saying, with the episode behind every claim. It searches transcripts from 74 finance and business podcasts and synthesizes what investors, strategists, operators and guests said: who thinks what, why, and where they agree and disagree. Use this skill to orient a new user and get them to a first useful answer quickly.

## What the plugin does

- **Topic and company views**: the range of views on a topic or company, who holds each one, and who disagrees. See `topic-views`.
- **Catch-up**: what podcasts discussed in a period, optionally on one show. See `podcast-catch-up`.
- **Show recaps**: the latest episodes of a named show, newest first. See `show-recap`.
- **Voice tracking**: what a named host or guest has said over time. See `voice-tracker`.
- **Most discussed**: which companies and themes podcasts talked about most. See `most-discussed`.

## Coverage

- **Shows**: 74 finance and business podcasts, including Bloomberg Surveillance, Odd Lots, All-In, Invest Like the Best and Excess Returns.
- **Depth**: full transcripts, from July 2025 onward, searched by topic, company, show, host, guest and date.
- **Citations**: every claim names the show and date and links to the episode, deep-linked to the chapter when the episode has chapters.

## Who it is for

Analysts, portfolio managers, strategists, economists and journalists who want to know what the people they follow are actually saying, with a source they can check.

## Connecting

1. The first time an Octagon tool runs, the user is asked to sign in to their Octagon account.
2. If Octagon tools are unavailable, or sign-in has expired, ask the user to connect or reconnect Octagon from the plugin's connection settings, then retry.
3. Never ask the user to paste passwords, access tokens, or other credentials into the conversation.
4. Each answer uses one Octagon credit and takes about ten seconds; tell the user that when they ask several questions at once.

## How the tool works

The plugin has one tool, `octagon-podcasts-agent`. It takes the user's question as plain text and reads the time window, shows, people, companies and tickers from it. Phrase prompts the way the tool reads them:

- **Window in words**: "since September 2026", "between September 15 and September 28, 2026", "in August 2026", "the last 3 episodes". Without a window the tool uses the last 30 days.
- **Shows as the user named them**: the tool maps common names ("All-In") to its catalogue; do not invent catalogue spellings.
- **People with their role when known**: "as a guest", "the host".
- **One call per question**: pass the whole question; split it only when the user asked for several distinct things.

## Suggested first requests

Offer two or three of these, adapted to what the user mentioned:

- "What are podcast guests saying about Nvidia since September 2026?"
- "Will the Fed keep hiking? Who disagrees? Use episodes since July 2026."
- "Summarize the last 3 All-In episodes."
- "What has David Rosenberg said as a guest since September 2026?"
- "Which companies did podcasts discuss most in September 2026?"

## How to answer

- Keep the tool's `[n]` markers and its trailing `Sources:` list exactly as returned; they are the citations.
- Report every view as the speaker's opinion: "a guest on Odd Lots argued", "the hosts of All-In agreed". Never adopt a view as the answer's own conclusion and never turn one into a recommendation.
- Name a person only when the tool attributes the view to them; otherwise say "a guest on <show>".
- If the answer opens with an italic line saying no episodes in the last 30 days matched, keep it: it tells the user the search widened to older episodes.
- If the tool reports no coverage, relay it with the most recent indexed episode date it gives, and offer a wider window or a different show. Do not answer from memory.

## What the plugin does not do

State these plainly when relevant:

- It does not give investment advice or tell the user what to buy, sell or hold; it reports what speakers said.
- It does not cover earnings calls, SEC filings, financial statements or market data. Those belong to the Octagon AI plugin.
- It does not cover prediction-market odds. Those belong to the Octagon Prediction Markets plugin.
- It does not label speakers inside a transcript; attribution comes from the episode's title, description and listed hosts and guests.
