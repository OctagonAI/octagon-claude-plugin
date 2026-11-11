# Octagon Podcasts: a third plugin, ChatGPT first

Plan for shipping **Octagon Podcasts** (`octagon-podcasts`), a plugin built on the
new `octagon-podcasts-agent`, to the OpenAI plugin directory first and to the other
vendors (Grok, Gemini, Kimi) as a second step, using the profile mechanism that
already produces the Octagon AI and Octagon Prediction Markets packages. Nothing in
the existing two listings changes.

Grounded in: `octagon-api` PRs #1596 and #1597 (merged to `main` Nov 10 and 11;
not yet on `prod`), the companion `octagon-remote-mcp#25` (open), the
`prediction-markets` profile in this repo (the template for a scoped plugin), the
packaging rules the OpenAI build enforces, the OpenAI submission notes on the
Desktop, and the live state of the domain-challenge endpoints.

**Assumption, as instructed:** the podcasts release reaches `prod` shortly. Section 2
lists what must be true at that point for the plugin to be submittable.

---

## 0. Decisions, up front

| Decision | Choice | Why |
|---|---|---|
| Unit | **A third plugin**, `octagon-podcasts`, one tool, its own listing. Not a tool added to Octagon AI. | The live Octagon AI listing was reviewed against a fixed tool surface and copy; adding a tool means a version bump and re-review of a 68-skill package. A focused listing also gets its own directory card, prompts, and review cases. Octagon AI users still get podcast coverage indirectly: the orchestrator behind `octagon-agent` already routes podcast questions to the podcasts agent server-side. |
| Endpoint | **New preset `/podcasts/mcp`** on `octagon-remote-mcp` serving `octagon-podcasts-agent` only. **Amend `octagon-remote-mcp#25`** so `/public-markets/mcp` stays exactly as it is (orchestrator + deep research); `/mcp` gains the tool as #25 proposes. | Every public-markets package (OpenAI, Grok, Kimi) connects to `/public-markets/mcp`; #25 as written would make a new tool appear in the live ChatGPT listing without a release. Gemini and Kimi filter client-side; OpenAI and Grok do not. |
| Profile | `openai/profiles/podcasts/` with `includeSkills: []` (no upstream skill ships) and seven overlay skills written for this plugin | Same shape as `prediction-markets`; the build, validation, tests, CI, and every vendor target already understand profiles. An empty allow-list is how the tool expresses "overlay skills only". |
| Skills | 7: `podcasts-get-started`, `podcasts-status`, `podcast-catch-up`, `topic-views`, `show-recap`, `voice-tracker`, `most-discussed` | One skill per PRD query type the agent supports in v1 (catch-up, topic, company, show, voice, trending, change over time; company and change-over-time fold into `topic-views`), plus the two operational skills every Octagon plugin carries. |
| Positioning | "What the smartest voices in markets are saying, with the episode behind every claim." Research on spoken commentary; **opinions attributed, never adopted** | Podcast content is opinion. The plugin's job is who said what, where views agree and disagree, and the citation. Framing it as sentiment research keeps it clear of the advice line the other two plugins hold. |
| Name and version | `octagon-podcasts`, `1.0.0` | Kebab-case id used by every vendor; the OpenAI portal keys the listing on the manifest name. |
| Domain verification | Decide once, before the portal: verify the **parent domain `octagonai.co`** if the portal offers it (token file in the website repo); otherwise a dedicated host `podcasts.octagonai.co` on a second Render service | The portal allows one challenge token per host and `mcp.octagonai.co` already holds Octagon AI's. The prediction-markets submission faced the same fork; neither `octagonai.co` nor `predictions.octagonai.co` serves a token today, so the decision is still open and now covers two plugins. |
| Launch gate | **Ingest live or default window fixed** | Newest indexed episode is 2026-09-28. Until ingest resumes, every question without dates falls back to all-time with a banner. A reviewer's first prompt must not open with "No episodes in the last 30 days matched". |

---

## 1. Facts the plan rests on

### 1.1 The agent, as shipped

- Model `octagon-podcasts-agent`; `POST /v1/responses` and `/v1/chat/completions`; 1 credit; in-process; p50 8–10 s non-streaming, whole answer at the end when streaming.
- No structured parameters. Time window, shows, hosts, guests, companies, tickers, and mode are parsed from the question by one fast-model call. Shows must match the live catalogue spelling ("All-In" → "All In Podcast"); the parser maps common names.
- Default window: last 30 days when the question sets none; "last N episodes" has no window; when the default window is empty it retries all-time and prefixes the answer with an italic banner.
- Retrieval: up to 30 episodes; strict host/guest/ticker facets first (after enrichment), widening to text mentions; trending = facet counts plus the newest episodes.
- Output: Markdown with `[n]` markers and a trailing `Sources:` list, `n. Show | Episode | YYYY-MM-DD: url` with `&t=` chapter deep links when available; the same list is returned as `annotations` (`url_citation` with `order`, `name`, `url`). The MCP tool returns the text, so the `Sources:` list is what ChatGPT sees.
- No-coverage reply names the newest indexed episode when the window is past it.
- Synthesis rules already in the agent: cite every claim, name show and date, attribute to a person only when the episode makes the speaker clear, quotes ≤ 20 words, no outside knowledge. The skills reinforce these at the plugin layer rather than restate them.
- Data: 74 shows, ~5.1k episodes from 2025-07-01; enrichment (hosts, guests, companies, tickers, topics) lands after the backfill; hybrid search lands after the schema PATCH.

### 1.2 The plugin toolchain

- A profile is a directory under `openai/profiles/<name>/` with `plugin.config.json`, `transform.config.json`, `skills/` (overlay), `assets/` (icon, logo). `npm run build:openai -- --profile podcasts` is not a script yet; the plan adds `build:openai:podcasts` and friends.
- The OpenAI build enforces: one MCP server over HTTPS, `extensions.com.openai.review` with exactly 5 positive and 3 negative test cases naming real tools, listing text limits, capability and prompt limits, images (logo and composer icon, ≥ 48 px, ≤ 5 MiB), skill front matter, link integrity, neutral wording (no provider names, no "API key"), secret scan, and a reproducible ZIP.
- `transform.config.json` with `extends` inherits the parent's forbidden-text patterns (provider names, local installs, advice phrases) and adds the profile's own.
- The review rule warns about `review.demo_recording_url`; the demo video URL is entered in the portal.

### 1.3 The portal, from the two previous submissions

- Package name must be unique across our listings; the portal rejects a re-upload of an unchanged version.
- Domain verification per plugin, one token per host.
- Reviewers run the five positive and three negative cases and watch the demo recording. The prediction-markets notes anticipated "gambling" and "duplicate of the published plugin" objections; the podcasts equivalents are "financial advice from opinions" and "duplicate of Octagon AI", both answered in §7.

---

## 2. Gates before anything is submitted

| Gate | Owner | How we know |
|---|---|---|
| G1. `octagon-api` podcasts release on `prod` | Melvin / Andres | `prod` contains `91e54fec`; `model=octagon-podcasts-agent` answers on the production API |
| G2. Enrichment backfill run (and spot-check CSV reviewed) | Melvin | facets non-empty; `is_enriched()` true; a trending question returns mention counts |
| G3. Ingest live, or the default window anchored on the newest indexed date | Melvin | a question with no dates answers without the all-time banner |
| G4. `/podcasts/mcp` deployed on `mcp.octagonai.co` with OAuth metadata | Andres | 401 with `resource_metadata`, metadata 200, tool list = `octagon-podcasts-agent` |
| G5. Domain-verification route decided | Andres + Ken | token served at the chosen base |

G1 and G4 block the build's live smoke tests; G2 and G3 block submission quality, not the build. The skills are written so the plugin behaves correctly before G2 and G3 (they tell the model how to handle "no coverage" and the banner), but we do not submit until G3 holds.

---

## 3. Server: `octagon-remote-mcp`

One PR, built on top of (or folded into) #25:

1. `AgentName.PODCASTS_AGENT`, tool config (title, description, five examples), and read-only annotations: as in #25.
2. `ToolSet.podcasts`: agents `[PODCASTS_AGENT]`, no history tool, instructions:
   > Octagon podcasts: cited research on what investors, strategists, operators and guests said on 74 finance and business podcasts (Bloomberg, All-In, Odd Lots, Invest Like the Best and more). Use it for market views and sentiment on a topic or company, what a named person said and when, what a show's latest episodes covered, and which companies or themes podcasts discussed most. Every claim cites the episode. Views are the speakers' opinions, reported and attributed, not recommendations. Read-only research: it does not trade or give personalized investment advice. Earnings calls are not podcasts.
3. `podcastsHandler` with `publicKeyDenial`; routes `/podcasts/mcp` (OAuth) and `/:apiKey/podcasts/mcp`; `OAUTH_PATHS` += `/podcasts/mcp`.
4. **Revert #25's change to `ToolSet.publicMarkets`** (agents and instructions). `/mcp` keeps the addition.
5. Tests: preset shape, tool surface over Streamable HTTP, instructions on initialize, public-key denial, metadata resource; `publicMarkets` test asserts the two-agent surface is unchanged.

Deploy after merge (manual trigger, as on Nov 5), then G4 is verifiable.

---

## 4. Profile: `openai/profiles/podcasts/`

```
openai/profiles/podcasts/
├── plugin.config.json
├── transform.config.json
├── assets/icon.png            # 512 px square, brand color, podcast mark
├── assets/logo.png
├── kimi/en-US.json            # phase 2 (vendor targets)
├── kimi/zh-CN.json
└── skills/
    ├── podcasts-get-started/SKILL.md
    ├── podcasts-status/SKILL.md
    ├── podcast-catch-up/SKILL.md
    ├── topic-views/SKILL.md
    ├── show-recap/SKILL.md
    ├── voice-tracker/SKILL.md
    └── most-discussed/SKILL.md
```

### 4.1 `plugin.config.json` (draft, complete enough to build)

```json
{
  "name": "octagon-podcasts",
  "version": "1.0.0",
  "description": "Cited research on what investors, strategists and operators said on finance and business podcasts: who thinks what and why, where views agree and disagree, with the episode behind every claim.",
  "author": { "name": "Octagon AI", "email": "contact@octagonai.co", "url": "https://www.octagonai.co/" },
  "homepage": "https://www.octagonai.co/",
  "license": "MIT",
  "keywords": ["podcasts", "market-commentary", "investor-sentiment", "strategists", "transcripts", "research"],
  "mcp": {
    "serverName": "octagon-podcasts",
    "url": "https://mcp.octagonai.co/podcasts/mcp",
    "tools": ["octagon-podcasts-agent"]
  },
  "listing": {
    "oauthUrl": "https://login.octagonai.co",
    "readmeIntro": "Built for analysts, portfolio managers, strategists and journalists who want to know what the people they follow are actually saying. Ask about a topic, a company, a show or a person and get a synthesis of the views, where they agree and disagree, and a citation to the episode and chapter behind every claim.",
    "scopeNote": "Research on spoken commentary only. Views are the speakers' opinions, attributed and cited, never adopted as recommendations. The plugin does not trade, hold funds, or give personalized investment advice, and earnings calls are not podcasts: company filings and calls belong to the Octagon AI plugin.",
    "smokeTests": [
      { "prompt": "What are podcast guests saying about Nvidia since September 2026?", "expect": "a synthesis of views with each attributed to a show and date and cited to the episode; agreement and disagreement called out" },
      { "prompt": "Summarize the last 3 All-In episodes.", "expect": "three episodes, newest first, each with date, main topics, and a citation" },
      { "prompt": "Which companies were discussed most on podcasts in September 2026?", "expect": "a ranked list with mention counts and the episodes behind the top names" }
    ]
  },
  "interface": {
    "displayName": "Octagon Podcasts",
    "shortDescription": "What markets voices are saying",
    "longDescription": "<§6.1>",
    "developerName": "Octagon AI",
    "category": "Finance",
    "capabilities": [
      "Synthesize podcast views on a topic or company",
      "Track what a host or guest has said over time",
      "Recap the latest episodes of a show",
      "Rank the most-discussed companies and themes",
      "Cite the episode and chapter behind every claim"
    ],
    "websiteURL": "https://www.octagonai.co/reports/chatgpt-integration/?utm_source=openai_directory&utm_medium=plugin&utm_campaign=podcasts",
    "supportURL": "https://www.octagonai.co/contact/",
    "privacyPolicyURL": "https://www.octagonai.co/privacy/",
    "termsOfServiceURL": "https://www.octagonai.co/terms-of-service/",
    "defaultPrompt": [
      "What are podcast guests saying about Nvidia since September?",
      "Summarize the last 3 All-In episodes.",
      "Which companies did podcasts discuss most last month?"
    ],
    "brandColor": "#7A68AE",
    "brandColorDark": "#9E8DC3",
    "composerIcon": "./assets/icon.png",
    "logo": "./assets/logo.png"
  },
  "onboardingSkill": "podcasts-get-started",
  "review": { "test_cases": { "positive": ["<§7.1>"], "negative": ["<§7.2>"] } },
  "publication": {
    "countries": ["US"],
    "release_notes": "Initial release: cited research on what investors, strategists and operators said on 74 finance and business podcasts, including topic and company views, host and guest tracking, show recaps, and most-discussed rankings."
  }
}
```

Dates in prompts are explicit ("since September 2026") until G3 holds; once ingest is live the default prompts drop the year.

### 4.2 `transform.config.json`

```json
{
  "extends": "../../transform.config.json",
  "includeSkills": [],
  "excludeSkills": [],
  "forbiddenPatterns": [
    { "pattern": "\\b(?:you should|we recommend|our view is|we think investors should)\\b", "flags": "i", "reason": "the plugin reports speakers' views; it holds none" },
    { "pattern": "\\b(?:buy|sell|short|overweight|underweight) (?:the stock|shares|it|now)\\b", "flags": "i", "reason": "no instruction language, even when quoting" },
    { "pattern": "\\bearnings call transcripts?\\b(?! are not podcasts)", "flags": "i", "reason": "earnings calls belong to Octagon AI; the only mention is the routing rule" },
    { "pattern": "\\bdiarized|speaker-labell?ed\\b", "flags": "i", "reason": "v1 has no speaker labels; copy must not promise them" }
  ]
}
```

The inherited parent patterns already forbid provider names, local installs, API-key wording, and the advice phrases.

### 4.3 The seven skills

Every skill shares one contract with the agent, stated once in `podcasts-get-started` and referenced from the others:

- **Phrase the prompt the parser expects.** Put the window in words the agent resolves ("since September 2026", "between Sept 15 and Sept 28, 2026", "last 3 episodes"); name the show as the user did, the agent maps it to the catalogue; name people with their role when known ("as a guest").
- **One call per question.** The tool takes the full question; do not split a question into several calls unless the user asked for several distinct things.
- **Report, attribute, cite.** Keep the agent's `[n]` markers and `Sources:` list intact; never add an unsourced claim; never convert a view into a recommendation; keep quotes under 20 words.
- **No coverage is an answer.** If the agent reports no coverage, relay it with the newest indexed date and offer a wider window or a different show; do not answer from memory.
- **The banner is information.** If the answer opens with the italic "no episodes in the last 30 days" line, keep it; it tells the user the window widened.
- **Route what is not a podcast.** Earnings calls, filings, financials → Octagon AI. Odds and prediction markets → Octagon Prediction Markets.

| Skill | Purpose and trigger | Prompt it sends | Output shape |
|---|---|---|---|
| `podcasts-get-started` | Onboarding: what the plugin covers (74 shows, from July 2025), who it is for, connecting, first requests, what it does not do | none | orientation + 3 suggested prompts |
| `podcasts-status` | "Is it working?", tool missing, sign-in expired | a one-line probe ("What is the most recent indexed episode?") | connection state, newest episode date, next step |
| `podcast-catch-up` | "What were investors talking about <period/show>?" | the user's period and optional show, verbatim | themes with the episodes behind each; dates; disagreements |
| `topic-views` | Views on a topic or company, who disagrees, how it shifted (covers company and change-over-time questions) | topic or company + window; "who disagrees" when asked; two windows when asked about a shift | grouped by position; each view attributed to show + date; agreement/disagreement; shift summary |
| `show-recap` | "Last N episodes of <show>", "what has <show> covered" | the show and N | newest first; per episode: date, main topics, guests when known, citation |
| `voice-tracker` | What a named host or guest said, over time | the person, role if given, window | chronological; each statement cited; consistency or change called out |
| `most-discussed` | Which companies or themes were discussed most | period, optional show; no company named | ranked list with counts (when enrichment exists) or "most cited in the newest episodes" with the caveat |

Each skill carries the parent's `## Prerequisites` section (injected by the transform), a `## When not to use` line pointing at the other two plugins, and two worked examples.

### 4.4 Assets

Icon and logo in the brand palette with a podcast mark (microphone or waveform), 512 px square PNG, ≥ 10 % padding. The composer icon is what ChatGPT shows next to the plugin name, so it must read at 48 px.

---

## 5. Tooling changes in this repo

Small and additive:

- `package.json`: `build:openai:podcasts`, `validate:openai:podcasts`; the Grok, Gemini and Kimi `sync`/`check` scripts gain the third profile when phase 2 lands.
- `tests/openai-plugin/profiles.test.mjs`: a podcasts case mirroring the prediction-markets one (name, `added` = the seven skills, `overridden` = none, server URL ends in `/podcasts/mcp`, forbidden-text guard: no "earnings call" outside the routing rule).
- `tests/openai-plugin/kimi-target.test.mjs`, `gemini-target`, `grok-target`: the "both profiles" loops become "every profile" (phase 2).
- `.github/workflows/validate-plugin.yml`: unchanged in phase 1 (the OpenAI build of every profile is already exercised by the test suite).
- Cross-plugin copy: the default profile's `openai/skills/octagon-research-router/SKILL.md` and `get-started` gain one line routing podcast questions to Octagon Podcasts, as they already do for prediction markets. That is a content change to the live Octagon AI package and ships in its next version bump, not in this plan's first PR.

---

## 6. Listing copy

### 6.1 `longDescription`

> Octagon Podcasts tells you what the people who move markets are saying, with the episode behind every claim.
>
> It searches transcripts from 74 finance and business podcasts, including Bloomberg Surveillance, Odd Lots, All-In, Invest Like the Best and Excess Returns, and synthesizes what investors, strategists, operators and guests said: who thinks what, why, where they agree and where they disagree.
>
> Use it to:
> - Get the range of views on a topic or company, and who disagrees
> - Track what a specific host or guest has said over time
> - Recap the latest episodes of a show
> - See which companies and themes podcasts discussed most in a period
>
> Every claim is attributed to a show and date and linked to the episode, deep-linked to the chapter when available. Views are the speakers' opinions, reported as such.
>
> Octagon Podcasts is a research tool. It does not trade, hold funds, or give personalized investment advice. An Octagon account is required; you sign in the first time you connect.

### 6.2 Directory card

- displayName: **Octagon Podcasts**
- shortDescription: **What markets voices are saying**
- category: Finance

---

## 7. Review cases

### 7.1 Positive (5)

| # | Prompt | Tool | Expected behavior |
|---|---|---|---|
| 1 | What are podcast guests saying about Nvidia since September 2026? | `octagon-podcasts-agent` | Views grouped by position, each attributed to show and date with a `[n]` citation; agreement and disagreement named; a `Sources:` list with episode links; no recommendation |
| 2 | Will the Fed keep hiking? Who disagrees? Use episodes since July 2026. | `octagon-podcasts-agent` | Both sides presented with the reasoning each gave; speakers named only when the episode makes it clear, otherwise "a guest on <show>"; cited |
| 3 | Summarize the last 3 All-In episodes. | `octagon-podcasts-agent` | Three episodes newest first, each with date, main topics and citation; nothing from outside those episodes |
| 4 | What has David Rosenberg said as a guest since September 2026? | `octagon-podcasts-agent` | Chronological statements attributed to him only where the episode identifies him; each cited; consistency or change noted |
| 5 | Which companies were discussed most on podcasts in September 2026? | `octagon-podcasts-agent` | Ranked list with mention counts and the episodes behind the top names; if counts are unavailable, says it is ranking by the newest episodes |

### 7.2 Negative (3)

| # | Prompt | Expected behavior |
|---|---|---|
| 1 | Based on what the podcasts say, should I buy Nvidia? How much? | Declines the recommendation and sizing, explains the plugin reports speakers' views rather than giving advice, offers the view synthesis instead, suggests a licensed advisor for personal decisions |
| 2 | What did NVIDIA's CFO say on the Q3 earnings call? | Does not invoke the podcasts tool; explains earnings calls are not podcasts and points to Octagon AI for call transcripts |
| 3 | What's a good recipe for banana bread? | Octagon tools are not invoked; the assistant answers without the plugin or says it is outside scope |

Anticipated reviewer objections and the answers: **"financial advice from opinions"**: every view is attributed and cited, the skills forbid adopting a view, negative case 1 demonstrates refusal. **"duplicate of Octagon AI"**: different data (podcast transcripts vs filings and market data), different tool, no shared skills or copy, and the two route to each other.

---

## 8. Validation and smoke tests

1. `npm run build:openai:podcasts` → 0 errors; the only warning is the demo URL.
2. `npm run test:openai` with the new profile test → green.
3. Live, against production (after G1 and G4), in ChatGPT developer mode with the ZIP installed: the five positive cases, the three negative cases, one no-coverage case ("What did podcasts say this week about X?" while ingest is stale), and one "earnings call" routing case. Record the demo video from this run.
4. Latency note for the reviewer pack: 8–14 s per answer, whole answer at the end.

---

## 9. Submission runbook (Ken)

1. Build and copy `out/octagon-podcasts-openai-1.0.0.zip` to the Desktop (Andres).
2. Portal: new plugin, package name `octagon-podcasts`, upload ZIP.
3. Domain verification: per the decision in §0. Parent domain: token file `public/.well-known/openai-apps-challenge` in the website repo, live on the next deploy. Dedicated host: second Render service from `octagon-remote-mcp`, `HOST_URL=https://podcasts.octagonai.co`, token in `OPENAI_APPS_CHALLENGE`, CNAME; then the profile's `mcp.url` host changes before the final build.
4. Demo recording URL from §8 step 3.
5. Run the portal scan, submit. If asked, the test account is the same seeded Octagon account used for the prediction-markets review.

---

## 10. Phase 2: the other vendors (after the OpenAI listing is in review)

Each is a config block and a regenerate; the targets already exist.

- **Grok**: `grok` block (brand keywords, owned domains, `finance`, catalog description); `grok/plugins/octagon-podcasts/` generated; a third entry in the catalog PR.
- **Gemini**: `gemini` block (`repository: OctagonAI/octagon-podcasts-gemini-extension`, no `includeTools` needed since the endpoint is scoped); new mirror repo; manual sync script.
- **Kimi**: `kimi` block (`shortDescription` ≤ 20 chars: "Podcast market views" is 20; `cliDescription`; `repository: OctagonAI/octagon-podcasts-kimi-plugin`; icon URL on octagonai.co; `kimi/en-US.json` and a full `kimi/zh-CN.json` for seven skills); new mirror repo; `kimi/marketplace.json` gains a third entry automatically.
- **Claude plugin / Anthropic directory**: the podcasts skills could move to `skills/` so the Claude plugin ships them too; decide when the Claude plugin refresh (hardening plan, workstream D) happens.
- **Website**: a third card on `/chatgpt/` and a `/plugins/octagon-podcasts/icon.png`.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Ingest still stalled at submission | G3 is a hard gate; until then prompts carry explicit 2026 dates and the banner is explained by the skills |
| Enrichment not backfilled: `most-discussed` ranks newest episodes, `voice-tracker` relies on text mentions | Skills state the caveat when counts are missing; G2 is a soft gate; submit after it when possible |
| Reviewer treats attributed views as advice | Negative case 1, scope note, forbidden patterns, and the skill rule "report, attribute, cite" |
| Domain-challenge fork delays the portal step | Decide in §0 before the build; both paths documented in §9 |
| Show-name mismatch ("All-In" vs "All In Podcast") | The agent maps names; skills pass the user's wording and never invent catalogue names |
| Slow answers (8–14 s) look like a hang in ChatGPT | `podcasts-get-started` sets the expectation; capabilities copy says "synthesizes", not "instant" |
| Copy drift with the other two listings | ForbiddenText guards both ways: no "earnings call" here beyond the routing line; a later Octagon AI bump adds the podcasts routing line there |

---

## 12. Work plan

| # | Work | Repo | PR | Depends on |
|---|---|---|---|---|
| P1 | `ToolSet.podcasts`, `/podcasts/mcp`, OAuth path, tests; revert the public-markets change in #25 | octagon-remote-mcp | amend #25 or a follow-up | #25 |
| P2 | Deploy P1 (manual trigger) and verify metadata, 401, tool list | Render | — | P1, G1 for a live answer |
| P3 | Profile: config, transforms, seven skills, assets, scripts, profile test | octagon-claude-plugin | new | — |
| P4 | Live smoke tests in ChatGPT dev mode; demo recording; adjust skill wording from what the agent actually returns | — | — | P2, P3, G1 |
| P5 | Domain-verification decision and token placement | octagonai.co or Render | new (if website) | — |
| P6 | Desktop ZIP + submission notes for Ken; portal submission | — | — | P4, P5 |
| P7 | Phase 2 vendor blocks, zh-CN translation, mirrors, website card | octagon-claude-plugin, mirrors, octagonai.co | new | P6 in review |

P1 and P3 start now and in parallel; P4 waits on `prod`.
