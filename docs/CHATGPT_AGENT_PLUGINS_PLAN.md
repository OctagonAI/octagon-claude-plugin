# Single-agent plugins for ChatGPT: SEC, earnings calls, market data, financials, crypto, holdings, news

Plan for turning each Octagon specialist agent into its own ChatGPT plugin, built
with the profile mechanism that already produces Octagon AI, Octagon Prediction
Markets, and Octagon Podcasts, without changing those three listings.

Grounded in: the `AGENT_REGISTRY` in `octagon-api` (seventeen models; seven public-market
specialists behind the orchestrator), the public agent pages in `octagon-api-docs`, the
69-skill upstream catalog and the data agent each skill declares, the three existing
profiles and their build rules, the OpenAI submission notes from the two previous
reviews, and the `octagon-remote-mcp` tool model (one MCP tool per Octagon model,
`prompt` in, Markdown out).

---

## Status (2026-11-11)

Built in `feat/agent-plugins` (this repo) and `octagon-remote-mcp#27`: the fence rule, `--profile all`, all seven profiles (65 upstream skills allocated, 31 overlay skills written), seven scoped endpoints, and tests. One change from the first draft, recorded in §4.3: the audit showed that most upstream skills declare several agents in their `Data Sources` line and mention the deep-research and scraper agents in a setup file the build already strips, so the fence is applied **after** the transform retargets every tool reference to the plugin's agent, rather than excluding every multi-source skill. The four `*-analyst-master` skills ship in their domain plugin because each references only that domain's skills.

Still open: the parent-domain challenge token (gate 1), live smoke tests and latency measurement (gates 3 and 4, need `prod`), podcast-specific and per-plugin icons, and the Octagon AI routing hints.

## 0. Decisions, up front

| Decision | Choice | Why |
|---|---|---|
| Unit | **One plugin per specialist agent, one tool each.** Seven candidates; **ship in three waves**, two plugins first | A single-tool plugin is the simplest thing a reviewer can evaluate and the clearest thing a user can pick from a directory. Waves let the directory's reaction to a second and third Octagon listing shape the rest before seven are in flight. |
| Endpoint | **One scoped preset per plugin** on `octagon-remote-mcp` (`/sec/mcp`, `/earnings-calls/mcp`, …), each serving exactly its agent | Same reasoning as Prediction Markets and Podcasts: the tool surface a listing is reviewed with must be the only surface its endpoint ever serves. `/mcp` and `/public-markets/mcp` do not change. |
| Tool, not orchestrator | Each plugin's skills call the **specialist tool directly** (`octagon-sec-agent`, not `octagon-agent`) | That is the point of the plugin: no planning or routing hop, one data source, predictable scope. The build retargets the tool name in the shipped skills (§4.2), so the upstream catalog stays as it is for the Claude plugin and Octagon AI. |
| Skill allocation | **A skill ships in a single-agent plugin only if every data source it declares is that plugin's agent.** Cross-agent skills (the four `*-analyst-master` skills, `ratings-snapshot`, `balance-sheet-growth`) stay in Octagon AI only | Enforced by a new build rule, not by memory (§4.3). A skill that silently needs a second agent would fail in the plugin and look like a product bug. |
| Where there are no skills | Crypto (1 upstream skill), Holdings (0), News (0) get **new skill sets written for them**, 5 to 7 each, like Podcasts did | Skills are the plugin's instructions to the model; a tool without skills is an API, not a plugin. |
| Names | Octagon SEC Filings, Octagon Earnings Calls, Octagon Market Data, Octagon Financials, Octagon Crypto, Octagon 13F Holdings, Octagon Market News | Distinct package names and display names (`octagon-sec-filings`, …). The portal keys on the name; the directory shows the display name. |
| Positioning against Octagon AI | Octagon AI is the all-in-one research analyst. A specialist is **the fast lane for one job**: no routing, one source, a focused skill set | Both cost 1 credit per request today, so the specialist's edge is latency and precision, which is also what the reviewer will test. |
| Domain verification | **Verify the parent domain `octagonai.co` once** before wave 1 | The portal allows one challenge token per host and `mcp.octagonai.co` already holds one. Seven plugins means seven hosts otherwise. This decision has been open since the prediction-markets submission; this plan cannot start without it. |
| Directory posture | Each listing has its own tool, skills, prompts, review cases, and copy, and **points at its siblings by name** for out-of-scope requests | "Duplicate of the published plugin" is the objection the reviewers raised last time; the defense is that nothing is shared and the plugins route to each other. If the directory still pushes back on count (§9), fold into two bundles. |

---

## 1. Facts

### 1.1 The agents

| Model | What it answers (public docs) | Credits | Skills in catalog today |
|---|---|---|---|
| `octagon-sec-agent` | 10-K, 10-Q, 20-F, S-1, 8-K and amendments for 8,000+ filers since 2018; MD&A, footnotes, risk factors, quantitative extraction | 1 | 16 (`sec-*`) |
| `octagon-transcripts-agent` | Earnings call transcripts since 2018; guidance, executive statements, analyst questions, narrative change | 1 | 14 (`earnings-*`) |
| `octagon-stock-data-agent` | Prices, indices, volumes, technicals, market caps, sector and industry performance, P/E by sector and industry, ratings and grades, price targets, ETF and fund quotes, commodities, forex | 1 | 19 (`stock-*`, `sector-*`, `industry-*`, `price-target-*`, `*-market-cap`, `commodities-*`, `forex-list`, `stock-grades`, `historical-financial-ratings`) |
| `octagon-financials-agent` | Statements, growth, ratios, health scores, analyst estimates, segment revenue, ESG | 1 | 14 (`income-*`, `balance-sheet`, `cash-flow-*`, `financial-*`, `revenue-*`, `analyst-estimates`, `esg-*`) |
| `octagon-crypto-agent` | Crypto lists, historical and real-time quotes, batch quotes, crypto news | 1 | 1 (`commodities-quote` mentions it; nothing crypto-specific) |
| `octagon-holdings-agent` | Form 13F filings, holder analytics and performance, industry breakdowns, positions by symbol, ETF composition, insider trades | 1 | 0 |
| `octagon-news-agent` | General, press-release, stock, crypto and forex news with ticker and date filters | 1 | 0 |

Not in scope: the six private-markets models (companies, funding, funds, deals, investors, debts), `octagon-metrics-agent` (no public page), deep research (already part of Octagon AI).

### 1.2 How the current skills call tools

Every upstream skill instructs the model to call `octagon-agent` with a natural-language
prompt and shows an MCP call block with `"toolName": "octagon-agent"`. Most also carry a
`**Data Sources:**` line naming the specialist(s) that actually answer. That line is
the allocation key for this plan.

### 1.3 What the three existing profiles already prove

- A profile can ship only upstream skills (Octagon AI), only overlay skills (Podcasts), or a mix (Prediction Markets).
- The transform layer can rewrite skill text per profile (substitutions, section injection, per-skill edits) and fail the build when an edit no longer matches its source.
- Forbidden-text patterns are per profile and inherit from the parent.
- The OpenAI build checks one server, 5+3 review cases naming real tools, listing limits, images, links, neutral wording, secrets, and ZIP reproducibility.

---

## 2. The portfolio

| Wave | Plugin | Package name | Tool | Skills | Why this wave |
|---|---|---|---|---|---|
| 1 | Octagon SEC Filings | `octagon-sec-filings` | `octagon-sec-agent` | 15 upstream `sec-*` (all but `sec-analyst-master`) + `sec-get-started`, `sec-status` | Largest catalog, clearest intent ("read the 10-K"), already corrected in the Kimi review pass |
| 1 | Octagon Earnings Calls | `octagon-earnings-calls` | `octagon-transcripts-agent` | 13 upstream `earnings-*` (all but `earnings-analyst-master`) + `earnings-get-started`, `earnings-status` | Second-largest catalog; the podcasts plugin's "earnings calls are not podcasts" rule now has a destination |
| 2 | Octagon Market Data | `octagon-market-data` | `octagon-stock-data-agent` | 18 upstream (prices, indices, sector/industry, P/E, targets, grades, market caps, commodities, forex) + 2 overlay; `market-analyst-master` only if its audit passes | Broadest everyday use; quotes and performance are what casual users try first |
| 2 | Octagon Crypto | `octagon-crypto` | `octagon-crypto-agent` | 6 new: `crypto-get-started`, `crypto-status`, `crypto-quote`, `crypto-price-history`, `crypto-compare`, `crypto-news` | Distinct audience and vocabulary; the directory's Finance category is thin on crypto research tools |
| 3 | Octagon Financials | `octagon-financials` | `octagon-financials-agent` | 13 upstream (statements, growth, ratios, health, estimates, segments, ESG) + 2 overlay; `financial-analyst-master` only if its audit passes | Overlaps most with how people already use Octagon AI; ship after the fast lanes prove the pattern |
| 3 | Octagon 13F Holdings | `octagon-holdings` | `octagon-holdings-agent` | 7 new: `holdings-get-started`, `holdings-status`, `latest-13f-filings`, `holder-portfolio`, `symbol-ownership`, `holder-performance`, `insider-trades` | Specialist audience; needs new skills |
| 3 | Octagon Market News | `octagon-market-news` | `octagon-news-agent` | 6 new: `news-get-started`, `news-status`, `ticker-news`, `press-releases`, `crypto-forex-news`, `news-in-window` | Lowest differentiation against ChatGPT's own browsing; ship last and watch usage |

Skills that never ship in a single-agent plugin, because they declare two agents or none that matches: `sec-analyst-master`, `earnings-analyst-master`, `market-analyst-master`, `financial-analyst-master` (unless the audit in §4.3 clears them), `ratings-snapshot` (financials + stock data), `balance-sheet-growth` (declares companies + financials; fix the declaration upstream first), `octagon-research-router`, `get-started`, `octagon-status` (Octagon AI's own).

---

## 3. Server: `octagon-remote-mcp`

One PR per wave, same shape as `/podcasts/mcp`:

1. `AgentName` gains the wave's models; `agentConfig` gains a tool entry per model with title, description, and five examples taken from the public agent page; `TOOL_ANNOTATIONS` marks each read-only.
2. One `ToolSet` preset per plugin (`secFilings`, `earningsCalls`, `marketData`, `crypto`, `holdings`, `marketNews`, `financials`), each with one agent, no history tool, and routing instructions that state the domain, the citation rule, "read-only research", and the sibling to use for adjacent questions.
3. One handler and route pair per preset: `/sec/mcp`, `/earnings-calls/mcp`, `/market-data/mcp`, `/crypto/mcp`, `/holdings/mcp`, `/news/mcp`, `/financials/mcp`, plus `/:apiKey/<path>` variants; `publicKeyDenial` on each; `OAUTH_PATHS` extended so RFC 9728 metadata exists per resource.
4. **`/mcp` and `/public-markets/mcp` do not change.** The Claude plugin, API users, and the three live listings keep their tool lists. Whether `/mcp` should later expose the specialists is a separate decision for the Claude plugin refresh.
5. Tests per preset: shape, tool surface over Streamable HTTP, instructions on initialize, public-key denial; a table-driven test keeps this at a few lines per plugin.

Deploy is manual on this service; after each wave, verify metadata, the 401 header, and the tool list on each new path.

---

## 4. Tooling in this repo

### 4.1 Profiles

`openai/profiles/<plugin>/` per plugin: `plugin.config.json`, `transform.config.json`, `assets/`, `skills/` holding only that plugin's overlay skills (get-started, status, and any new domain skills). Upstream skills are selected with `includeSkills`, listed explicitly per profile so the allocation is reviewable in one place.

### 4.2 Retargeting the tool in shipped skills

Upstream skills say "Use the `octagon-agent` tool" and show `"toolName": "octagon-agent"`. Each single-agent profile adds two substitutions in `transform.config.json`:

```json
"substitutions": [
  { "find": "Use the `octagon-agent` tool", "replace": "Use the `octagon-sec-agent` tool" },
  { "pattern": "\"toolName\": \"octagon-agent\"", "replace": "\"toolName\": \"octagon-sec-agent\"" }
]
```

The transform layer is strict: if an upstream skill stops matching, the build fails, so a retarget can never silently lapse.

### 4.3 A new rule: `SkillToolRule` (the allocation fence)

Runs for every profile whose `mcp.tools` has exactly one tool, after the transform. For each shipped skill file:

- every `octagon-…-agent` mention must be the plugin's tool, except under a routing heading ("When not to use", "What the plugin does not do"), where naming a sibling is the point;
- every MCP call block's `toolName` must be the plugin's tool;
- a backticked reference to a catalog skill the package does not ship is a warning.

How the transform gets the upstream skills there (§4.2, per profile): the "Use the `octagon-agent` tool" sentence and the call block are retargeted, every `**Data Sources:**` line is rewritten to the plugin's agent, and any remaining agent name is replaced by the plugin's tool. In a single-agent plugin the only tool is the plugin's agent, so retargeting is the correct semantics: the specialist answers or says it cannot. The deep-research and scraper mentions live in `references/mcp-setup.md`, which the parent transform already removes.

The audit (run the fence with the masters included) showed every `*-analyst-master` references only its own domain's skills, so all four ship in their domain plugin. `ratings-snapshot` and `historical-financial-ratings` ship with Financials, which the financial master references.

### 4.4 Forbidden text per profile

Each profile fences its domain: SEC Filings forbids "earnings call transcript" outside the routing hint; Earnings Calls forbids "10-K"/"10-Q" outside the hint; Market Data forbids "balance sheet"/"income statement"; Financials forbids "stock price"/"quote"; Crypto forbids "stock"/"SEC filing"; the parent's advice and provider patterns inherit everywhere. Fences are regexes with a short reason, like the podcasts profile's.

### 4.5 Scripts and CI

Seven more profiles make per-profile scripts unmanageable. Two tooling changes before wave 1:

- `cli.mjs` accepts `--profile all` for `build`, `sync`, `check`, `entry`, `about`, `catalog`: it iterates `Profile.all()` and exits non-zero if any profile fails. `package.json` keeps one script per target (`build:openai`, `check:kimi`, …) and drops the per-profile variants.
- `tests/openai-plugin/profiles.test.mjs` gains a table-driven case: for every profile, the build is clean and reproducible, `mcp.tools` has one tool, every shipped skill passes `SkillToolRule`, and the review cases name only that tool.

The publish workflows' matrices (Gemini, Kimi) are generated from `Profile.all()` by the same `about` command rather than hand-listed, when those vendors are added (§8).

### 4.6 Cross-plugin hints in Octagon AI

Octagon AI's `octagon-research-router` and `get-started` already point to Prediction Markets. They gain one line per launched specialist ("for a single filing question, the Octagon SEC Filings plugin is faster"). That is a content change to the live package and ships in Octagon AI's next version bump, one wave behind.

---

## 5. What each profile carries

Common to all: `author`, `homepage`, `license`, `listing.oauthUrl`, the policy URLs, brand colors, `publication.countries: ["US"]`. Distinct per plugin:

| Plugin | shortDescription | Capabilities (5) | Default prompts (3) |
|---|---|---|---|
| SEC Filings | Read the filing, cited | Analyze 10-K, 10-Q and 8-K filings · Extract risk factors and MD&A · Review footnotes and covenants · Compare filings year over year · Analyze S-1 and proxy statements | "Summarize the risk factors in Apple's latest 10-K." · "What changed in Microsoft's MD&A between the last two 10-Ks?" · "Extract the debt covenants from Tesla's latest 10-Q." |
| Earnings Calls | Guidance, Q&A, sentiment | Extract guidance and revenue outlook · Summarize analyst Q&A · Track management commentary by topic · Gauge call sentiment · Review product pipeline and capital allocation | "What guidance did NVIDIA give on its last earnings call?" · "What did analysts push back on during Netflix's latest call?" · "How has Amazon's commentary on AWS changed over the last four calls?" |
| Market Data | Prices, performance, valuation | Get quotes and price history · Compare performance across periods · Sector and industry P/E and performance · Analyst price targets and grades · Commodity and forex quotes | "How has NVDA performed over 1, 3 and 12 months?" · "Compare the P/E of the semiconductor industry with the sector." · "What is the consensus price target for AAPL?" |
| Crypto | Crypto quotes and history | Real-time crypto quotes · Historical price charts · Compare assets over a period · Batch quotes for a watchlist · Crypto news | "What is ETH trading at right now?" · "Chart BTC's daily closes for 2025." · "Compare BTC, ETH and SOL over the last 90 days." |
| Financials | Statements, growth, ratios | Income statement, balance sheet, cash flow · Year-over-year growth · Ratios and health scores · Analyst estimates · Revenue by segment and geography | "Pull Apple's last five fiscal-year income statements." · "What are Microsoft's Altman Z and Piotroski scores?" · "Break down Tesla's revenue by geography." |
| 13F Holdings | Who owns what, by quarter | Latest 13F filings · A fund's portfolio and performance · Institutional positions in a stock · Industry exposure by holder · Insider trades | "Which institutions added to NVDA last quarter?" · "Show Berkshire's latest 13F portfolio by industry." · "What insider trades were filed for AAPL this month?" |
| Market News | Headlines, press releases | Ticker news · Company press releases · Crypto and forex news · News in a date range · General market headlines | "What's the latest news on TSLA?" · "List Apple's press releases from the last 30 days." · "What moved BTC in the news this week?" |

`longDescription` per plugin follows the Podcasts template: what it reads, four "use it to" bullets, the citation sentence, the research-only sentence, the account sentence. `shortDescription` stays under the listing limit the build enforces.

---

## 6. Review cases, one template

Positive (5): one per headline capability, each naming the plugin's single tool, each with an expected behavior that mentions the source (filing and date, call and quarter, price and timestamp, 13F quarter, article and date).

Negative (3), the same three roles every time:

1. **Advice refusal**: "Based on the 10-K, should I buy Apple?" → analysis offered, no recommendation, licensed-advisor sentence.
2. **Sibling routing**: a question that belongs to a sibling ("What did the CEO say on the call?" asked of SEC Filings; "What's AAPL's stock price?" asked of Financials) → tool not invoked, sibling named.
3. **Unrelated**: no Octagon tool invoked.

The sibling-routing negative case is also the reviewer-facing proof that the listings are not duplicates: each one declines the others' work by name.

---

## 7. Gates

| Gate | Needed for | Owner |
|---|---|---|
| Parent-domain verification token live at `octagonai.co/.well-known/openai-apps-challenge` | the portal step of every plugin | Andres (website PR), Ken (portal) |
| `SkillToolRule` and `--profile all` merged | wave 1 build | Andres |
| Wave 1 server preset deployed (`/sec/mcp`, `/earnings-calls/mcp`) | live smoke tests | Andres |
| Latency measured: specialist vs. Octagon AI on the same five prompts | the "fast lane" claim in the copy | Andres, before wave 1 submission |
| Wave 1 in review for 2 weeks without a duplication objection | wave 2 | Ken reports |

---

## 8. Other vendors, after each wave

Each plugin becomes a Grok, Gemini, and Kimi package by adding the vendor blocks to its profile; the targets already exist. Kimi needs a `zh-CN` translation of every shipped skill (15 for SEC, 13 for Earnings Calls, 18 for Market Data), which is the one real cost; schedule translation per wave, not per plugin. Mirror repos follow the naming already in use (`OctagonAI/<package>-gemini-extension`, `OctagonAI/<package>-kimi-plugin`), synced by the manual scripts until the publish App exists.

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| The directory treats several Octagon listings as fragmentation and rejects or merges them | Distinct tools, skills, prompts, cases, and copy; sibling routing in every negative case; waves with a two-week observation gate. Fallback: two bundles, "Octagon Filings & Calls" (`/documents/mcp`: SEC + transcripts) and "Octagon Markets Data" (`/markets/mcp`: stock data + financials + crypto + news + holdings), built from the same profiles by merging `includeSkills`. |
| A specialist is not faster than Octagon AI in practice | Measure before wave 1 (gate 4); if the gap is small, drop "fast lane" from the copy and lead with focus and predictability. |
| An upstream skill needs two agents but declares one | `SkillToolRule` catches declared sources; a live smoke test per shipped skill catches undeclared ones before submission. Fix upstream, or exclude. |
| New skill sets (Crypto, Holdings, News) ship thin | Write them from the public agent pages' example queries, one skill per documented capability, with the same contract the Podcasts skills use. |
| Seven more review cycles and demo videos for Ken | One template, one recording per plugin from the same five prompts; wave pacing. |
| Domain verification stays undecided | This plan does not start until the parent-domain token is live; everything else can be built but not submitted. |
| Credit confusion: users expect a specialist to be cheaper | Copy says "1 credit per request", the same as Octagon AI; the plugin's value is scope and speed, not price. |

---

## 10. Work plan

| # | Work | Repo | Wave |
|---|---|---|---|
| A1 | Parent-domain challenge token on octagonai.co | octagonai.co | 0 |
| A2 | `SkillToolRule`, `--profile all`, table-driven profile test, per-domain forbidden patterns | octagon-claude-plugin | 0 |
| A3 | Audit run: which `*-master` skills and `ratings-snapshot`/`balance-sheet-growth` pass the fence; upstream `Data Sources:` fixes where the declaration is wrong | octagon-claude-plugin | 0 |
| B1 | Server presets `/sec/mcp`, `/earnings-calls/mcp` + tool configs + tests; deploy | octagon-remote-mcp | 1 |
| B2 | Profiles `sec-filings`, `earnings-calls`: configs, retargeting substitutions, four overlay skills, assets, review cases | octagon-claude-plugin | 1 |
| B3 | Latency measurement; live smoke tests; demo recordings; Desktop ZIPs and notes for Ken | — | 1 |
| C1 | Server presets `/market-data/mcp`, `/crypto/mcp`; deploy | octagon-remote-mcp | 2 |
| C2 | Profiles `market-data` (18 upstream + 2 overlay) and `crypto` (6 new skills) | octagon-claude-plugin | 2 |
| D1 | Server presets `/financials/mcp`, `/holdings/mcp`, `/news/mcp`; deploy | octagon-remote-mcp | 3 |
| D2 | Profiles `financials` (13 + 2), `holdings` (7 new), `market-news` (6 new) | octagon-claude-plugin | 3 |
| E | Octagon AI router and get-started hints per launched specialist (with its next version bump); vendor blocks and translations per wave | octagon-claude-plugin | after each wave |

Wave 0 is about a week of tooling and one website PR. Wave 1 is two profiles with no new domain skills, so it is mostly configuration, retargeting, and copy; the time goes to live testing and the recordings. Waves 2 and 3 carry the new skill writing.
