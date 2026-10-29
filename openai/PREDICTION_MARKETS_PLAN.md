# Octagon Prediction Markets: a second OpenAI plugin built on the prediction-markets agent

**Goal:** publish a second listing in the OpenAI plugin directory, **solely about prediction markets**, for research analysts who use them as data: event probabilities, their drivers, their history, and how they compare with independent estimates. The already-published Octagon plugin is re-oriented to **public markets only** (§0). The new plugin's entire tool surface is the Octagon prediction-markets agent and its history tool. Octagon does not place, route, or recommend trades, and the listing, skills, and tool text say so consistently. Nothing is forked: both plugins share one server codebase, one packaging tool, one skill catalog, and one login system.

**Builds on:** [SUBMISSION_PLAN.md](SUBMISSION_PLAN.md) (the packaging tool and the `octagon-ai` package, which becomes the next version of the published public-markets plugin). Everything below assumes that tooling and the server PR #18 are merged. Written 2026-10-29.

**Shape of the work:**
- `octagon-remote-mcp`: one additive PR, about 120 lines. A `ToolSet` value object, a handler factory that replaces two copy-pasted handlers, one new MCP path.
- `octagon-claude-plugin`: one additive PR, about 150 lines. Build **profiles**, an `includeSkills` allowlist, and `extends` for transform configs. Plus one content directory, and the §0.1 config edits that remove prediction markets from the public-markets package.
- Infra: one new hostname (decision in §2), no new repos.

---

## 0. Two plugins, two orientations

Octagon already has a published, well-downloaded listing in the ChatGPT directory (Finance category, plugin id `plugin_asdk_app_6abed7c438a481919d1338b2b5bee550`). The split is:

| | **Published plugin (keep, re-orient)** | **New plugin (this plan)** |
|---|---|---|
| Orientation | **Public markets**: companies, SEC filings, earnings calls, financial statements, market data, analyst estimates | **Prediction markets only**: event odds, drivers, probability history, mispricings |
| Package | `octagon-ai` (PR #1), uploaded as a **new version of the existing listing**, not as a new plugin | `octagon-prediction-markets` (profile, §4) |
| Listing name | Unchanged. It is live and recognized; renaming a successful listing throws away recall | `Octagon Prediction Markets` |
| MCP URL | `https://mcp.octagonai.co/mcp` (published, permanent) | `…/prediction-markets/mcp` on the host chosen in §2 |
| Skills shipped | Everything except prediction markets | Prediction markets only |
| Audience | Investment professionals, equity analysts | Research analysts, economists, policy and risk teams, journalists |

Rule: **no prediction-market content remains in the public-markets listing, and no public-markets content enters the prediction-markets listing.** Shared tools are allowed (see the decision below); shared copy is not.

### 0.1 Changes to the published plugin's package (`openai/`, default profile)

All config and overlay-skill edits; no code. They are merged with PR #1 but **uploaded to the live listing only after the prediction-markets plugin is published** (§6, step 8). Until then the published plugin keeps its current prediction-market workflow, so users are never pointed at a plugin they cannot install.

| Where | Today | Change |
|---|---|---|
| `plugin.config.json` → `interface.capabilities` | 5 entries, the last is "Research prediction markets" | Drop it |
| `interface.defaultPrompt[2]` | "What is driving the odds on the next Fed rate decision?" | Replace with a public-markets prompt, e.g. "Compare Apple's and Microsoft's revenue growth over the last three fiscal years." |
| `interface.longDescription` | Sentence 1 says "public companies and prediction markets"; bullet 5 is prediction markets; the limits sentence mentions "bets" | Sentence 1 → "cited research on public companies"; remove bullet 5; limits sentence → "does not place trades, move money, or provide personalized investment advice" |
| `description` (package) | Mentions "prediction-market analysis" | Remove the clause |
| `mcp.tools` | Lists all 4 tools | Keep as is **if** the tool surface stays (decision §0.2); the review rule only checks that named tools exist |
| `review.test_cases.positive[3]` (P4) | FOMC odds case using the prediction tools | Replace with a public-markets case, e.g. analyst price-target consensus for a ticker via `octagon-agent` |
| `review.test_cases.negative[0]` (N1) | "Buy 100 shares of NVDA for me and put $50 on the Fed rate-cut market." | "Buy 100 shares of NVDA for me." |
| `transform.config.json` → `excludeSkills` | `octagon-api-smoke-test`, `octagon-setup` | Add `prediction-markets-analysis` |
| `transform.config.json` → `skillEdits.prediction-markets-analysis` | Lives in the base config | **Move** to the profile's transform config (§4.5). The catalog rejects edits that target an excluded skill, and the profile is now the only consumer |
| `openai/skills/get-started/SKILL.md` | Lists prediction markets under "What Octagon can do" and in the suggested asks | Remove those lines |
| `openai/skills/octagon-research-router/SKILL.md` | Routes prediction-market requests to `prediction-markets-analysis` and lists the two prediction tools | Remove the routing row and the two tool rows; add one line: "For prediction-market research, suggest the Octagon Prediction Markets plugin." |
| `openai/skills/octagon-status/SKILL.md` | Lists all four tools | List the two public-markets tools (plus the prediction tools only while §0.2 keeps them on `/mcp`) |

Regression guard for this split: a profile-level forbidden pattern in the **default** profile, `\\b(?:prediction[- ]market|kalshi|polymarket)\\b` (flags `i`), scoped to overlay skills and listing text, so prediction-market copy cannot creep back into the public-markets package. (Catalog skills such as `sec-8k-analysis` may mention prediction markets in passing in their references; if the guard trips there, narrow it to `openai/skills/` and the manifest rather than weakening the rule.)

### 0.2 Decision: does the published plugin keep the prediction tools on `/mcp`?

`/mcp` is the published plugin's permanent origin and path, **and** it is what the Claude plugin, Cursor, and every other client use. Removing `octagon-prediction-markets-agent` and `prediction_markets_history` from it would change every client, and OpenAI applies tool removals on the next scan of a live listing.

| Option | What it means | Recommendation |
|---|---|---|
| **Keep the tools on `/mcp`; separate by listing and skills only** | Both prediction tools remain scannable on the public-markets plugin, but nothing in its copy, prompts, skills, or test cases mentions them. The model will still call them if a user asks | **Do this for launch.** Zero risk to a successful live listing and to other clients |
| Move the published plugin to `/public-markets/mcp` (a `publicMarkets` ToolSet: `octagon-agent` + `octagon-deep-research-agent`) | OpenAI allows a **path** change through the normal new-version flow (origin changes need a new plugin). The new path gets its own scan and review; `/mcp` stays untouched for other clients | Optional **phase 2**, after the predictions plugin is live, if reviewers or analytics show the overlap matters. The ToolSet work in §3 makes this a two-line addition |

### 0.3 Uploading PR #1 against the live listing

PR #1's package must be uploaded to the **existing** plugin ("Upload plugin to make changes"), never as "Upload new". Two checks before that upload:
- The portal rejects an update whose package `name` differs from the existing plugin's (`plugin_name_mismatch`). Download the live plugin's release ZIP from its **…** menu and read its manifest name; set `openai/plugin.config.json` → `name` to match (today it is `octagon-ai`, which was chosen before the live listing was known).
- A new version must carry a different `version` from the published one (`plugin_version_unchanged`).

---

## 1. Why the design looks like this

OpenAI's rules that force the shape (all verified in the main plan's sources):

| Rule | Consequence |
|---|---|
| One plugin = one connected MCP server URL, permanent after publishing | The predictions plugin needs its **own MCP URL** |
| The tool scan exposes everything served at that URL | That URL must serve **only** the prediction-markets tools |
| Domain-verification token lives at `/.well-known/openai-apps-challenge` on the **host**, one token per plugin; "use an allowed parent origin or a distinct hostname rather than replacing its token" | A second plugin on the same host needs a **different challenge base** (§2) |
| Names must not be generic; subtitle ≤30, display name ≤30; **directory discovery is by direct link or search by name only** | `octagon-prediction-markets` / "Octagon Prediction Markets": the name must contain the words people search for |

Facts about the server that make it cheap (read from `octagon-remote-mcp@648530f`):

| Fact | Consequence |
|---|---|
| `getServer(agentNames?)` already registers a subset of agents; `/deep-research/mcp` is exactly this pattern | A `/prediction-markets/mcp` path is precedent, not invention |
| `registerPredictionMarketsHistoryTool` is only registered when **all** agents are registered | The subset concept needs to be "agents + optional history tool", not just an agent list |
| `mcpHandler` and `deepResearchHandler` are ~80-line duplicates differing in three strings and one `if` | Adding a third copy is the wrong move. Extract a factory and define all three handlers with it |
| `verifyBearerToken` checks that `aud` **exists**; it never compares it to the resource | A new hostname or path needs no auth-server or token code changes on this server |
| Protected-resource metadata and `WWW-Authenticate` derive from `HOST_URL` (one host per deployment) | A new hostname means a second deployment of the same code, not a code change |
| Annotations map is checked against registered tools **exactly** (test in PR #18) | New toolset reuses the same map; no new annotations needed |

Facts about the packaging tool (`octagon-claude-plugin` PR #1):

| Fact | Consequence |
|---|---|
| `layout()` hardcodes `openai/plugin.config.json`, `openai/transform.config.json`, `openai/skills`, `openai/assets` | Needs a **profile** indirection; the default profile stays where it is |
| Staging dir is `out/openai/<pluginName>`, archive is `<name>-openai-<version>.zip` | Two profiles with different names already get separate output; only `build-report.json` would collide |
| `SkillCatalog` takes `exclude`; per-skill `skillEdits` must target an included source skill or the build fails | A 1-skill plugin wants an `includeSkills` **allowlist**, and inherited edits for non-included skills must be dropped, not fail |
| Per-skill compliance edits for `prediction-markets-analysis` are strict, and the base config now excludes that skill (§0.1) | The edits **move** to the profile; `extends` still supplies the global substitutions and guards, so nothing is duplicated |

---

## 1.5 Positioning: an analyst's data source, not a betting aid

Everything user-facing follows one frame: **a prediction market is a dataset of crowd-sourced probabilities about real-world events, and this plugin helps analysts read it.**

| | In scope (what the plugin does) | Out of scope (what it never does) |
|---|---|---|
| Questions | What does the market believe will happen, how confident is it, what moved that belief, where and by how much does it diverge from an independent estimate (a potential mispricing), how have similar events resolved before | Which side to take, how much to stake, when to enter or exit, expected payout or profit |
| Outputs | Event briefs, driver and catalyst analysis, probability-history analysis, mispricing analysis (market vs model, with uncertainty and track record), calibration and base-rate context, cited sources | Trade recommendations, position sizing, a mispricing turned into an instruction to act |
| Users | Research analysts, economists, strategists, policy and risk teams, journalists, forecasters | Bettors looking for picks |
| Platforms | Kalshi today (the agent's input is a market link); Polymarket when the agent supports it | Any order placement, account linking to a trading venue, or balance access |

Vocabulary rules, enforced by the forbidden-text guard (§4.5):

| Say | Not |
|---|---|
| market-implied probability, model probability, mispricing, divergence, over/underpriced relative to the model | opportunity, edge to capture, "cheap"/"expensive" as a cue to act |
| probability history, moves, drivers, catalysts | entry, exit, timing, signal to trade |
| resolution criteria, base rate, calibration, track record | odds to beat, payout, stake |
| "the market implies 62%; the model estimates 48%, a 14-point mispricing on the YES side" | "YES is overpriced, sell it" |

Mispricing is a finding, not an instruction. The analysis states the size and direction of the gap, how confident each side is, and how such gaps have resolved historically; it stops there.

This frame is also the answer to two OpenAI review questions: it is not a gambling product (it holds no funds and routes no wagers), and it is not a duplicate of the published Octagon plugin (that one is public-markets research and, after §0.1, contains no prediction-market content at all; this one is event-probability analysis with its own workflows).

---

## 2. The one decision: which challenge base

The MCP origin is permanent, so decide this before the first upload. Server code is identical under both options; only `HOST_URL` and infra differ.

| | **Option A: distinct hostname** | **Option B: same host, parent-domain verification** |
|---|---|---|
| MCP URL | `https://predictions.octagonai.co/prediction-markets/mcp` | `https://mcp.octagonai.co/prediction-markets/mcp` |
| Verification | Token at `predictions.octagonai.co/.well-known/openai-apps-challenge` | Token at `https://octagonai.co/.well-known/openai-apps-challenge` (the website repo, `public/.well-known/`) |
| Infra | Second Render service from the same repo/branch, same env vars except `HOST_URL` and `OPENAI_APPS_CHALLENGE`; CNAME `predictions` → Render | None |
| Certainty | **Certain**: matches the documented "distinct hostname" path | Depends on the portal offering `octagonai.co` as an eligible parent origin; also the apex 308-redirects to `www`, which the fetch may not follow |
| Cost | A second small service | Zero |
| Isolation | Separate logs, metrics, env, challenge token | Shared |

**Recommendation:** open the portal, start a second plugin draft pointed at `https://mcp.octagonai.co/prediction-markets/mcp`, and look at which challenge base it offers. If it offers `octagonai.co`, take Option B. If it only offers `mcp.octagonai.co` (already used by the published plugin), take Option A. Nothing in the code depends on the answer.

---

## 3. Server: `octagon-remote-mcp` (one PR)

### 3.1 Footprint

```
src/
├── mcp/
│   ├── toolsets.ts          NEW · ToolSet value object + named presets
│   ├── handler.ts           NEW · createMcpHandler() factory
│   ├── server.ts            EDIT · getServer() accepts a ToolSet (existing overloads preserved)
│   ├── index.ts             EDIT · three one-line handler definitions replace two 80-line copies
│   ├── toolsets.test.ts     NEW
│   └── handler.test.ts      NEW
├── oauth.ts                 EDIT · OAUTH_PATHS += "/prediction-markets/mcp"
├── index.ts                 EDIT · +3 routes (POST/GET/DELETE), +3 API-key variants for parity
└── annotations.ts           unchanged · map already covers both tools
```

### 3.2 `ToolSet` (value object)

```ts
// src/mcp/toolsets.ts
export class ToolSet {
  private constructor(
    readonly name: string,
    readonly agents: readonly AgentName[],
    readonly includeHistory: boolean,
  ) { Object.freeze(this); }

  /** Everything: all agents plus the history tool. Today's `/mcp`. */
  static readonly full = new ToolSet("full", Object.values(AgentName), true);
  /** Today's `/deep-research/mcp`. */
  static readonly deepResearch = new ToolSet("deep-research", [AgentName.DEEP_RESEARCH_AGENT], false);
  /** The predictions plugin. */
  static readonly predictionMarkets = new ToolSet("prediction-markets",
    [AgentName.PREDICTION_MARKETS_AGENT], true);

  /** Backward-compatible mapping of the old `agentNames?` argument. */
  static fromLegacy(agentNames?: AgentName[]): ToolSet {
    return agentNames && agentNames.length > 0
      ? new ToolSet("custom", agentNames, false)
      : ToolSet.full;
  }
}
```

`fromLegacy` reproduces today's exact semantics, including the quirk that an empty array means "all". That's what keeps `getServer()` and `getServer(agentNames)` byte-identical in behavior.

### 3.3 `getServer()`: additive overload

```ts
export function getServer(): McpServer;                       // unchanged
export function getServer(agentNames: AgentName[]): McpServer; // unchanged
export function getServer(toolset: ToolSet): McpServer;        // new
```

Body change is one normalization line (`const toolset = arg instanceof ToolSet ? arg : ToolSet.fromLegacy(arg)`) and the registration block reads `toolset.agents` / `toolset.includeHistory` instead of the `if (agentNames && agentNames.length > 0)` branch. Public-key behavior (cache tool only) is untouched.

### 3.4 `createMcpHandler()`: factory replacing the duplicates

```ts
// src/mcp/handler.ts
type HandlerSpec = {
  label: string;                 // "MCP" | "Deep Research" | "Prediction Markets" → log lines
  toolset: ToolSet;
  publicKeyDenial?: string;      // exact 403 message, or undefined to allow public keys
};
export function createMcpHandler(spec: HandlerSpec): RequestHandler
```

Then in `src/mcp/index.ts`:

```ts
export const mcpHandler = createMcpHandler({ label: "MCP", toolset: ToolSet.full });
export const deepResearchHandler = createMcpHandler({
  label: "Deep Research", toolset: ToolSet.deepResearch,
  publicKeyDenial: "Public API keys cannot access deep research MCP endpoint.",
});
export const predictionMarketsHandler = createMcpHandler({
  label: "Prediction Markets", toolset: ToolSet.predictionMarkets,
  publicKeyDenial: "Public API keys cannot access prediction markets MCP endpoint.",
});
```

This is the only non-additive edit in the plan, and it's a pure extraction: the factory body is the existing handler body with the three strings and the toolset parameterized. The existing log and error strings are passed through verbatim so log-based alerting doesn't change. Verified by `handler.test.ts` (§3.6).

### 3.5 Routes and metadata

```ts
// src/index.ts — beside the existing deep-research block
app.post("/:apiKey/prediction-markets/mcp", apiKeyMiddleware, predictionMarketsHandler);
app.get("/:apiKey/prediction-markets/mcp", rcpNotAllowed);
app.delete("/:apiKey/prediction-markets/mcp", rcpNotAllowed);
app.post("/prediction-markets/mcp", oauthMiddleware, predictionMarketsHandler);
app.get("/prediction-markets/mcp", rcpNotAllowed);
app.delete("/prediction-markets/mcp", rcpNotAllowed);
```

Route order matters (most specific first); the new block goes **before** the generic `/:apiKey/mcp` routes, exactly where the deep-research block sits. `OAUTH_PATHS` gains `"/prediction-markets/mcp"` so its RFC 9728 document is served and `WWW-Authenticate` points at it. The existing `oauth.test.ts` "each resource names itself" test covers the new path automatically.

### 3.5a Tool description

The prediction-markets agent's description ("…compare market vs model probabilities, and find potential mispricings") already matches the §1.5 frame: it describes analysis, not action. No change.

### 3.6 Tests (bun, in-memory MCP client, same style as `annotations.test.ts`)

| Test | Asserts |
|---|---|
| `toolsets.test.ts` | `fromLegacy()` maps `undefined`, `[]`, `[DEEP]` exactly as today; presets are frozen; `predictionMarkets` lists exactly `octagon-prediction-markets-agent` + `prediction_markets_history` |
| `handler.test.ts` | Tool lists per toolset through `getServer(ToolSet.x)`: `full` = 4 tools (unchanged set), `deepResearch` = 1, `predictionMarkets` = 2; public-key context on a denying handler → 403 with the exact legacy message; annotations present on both prediction tools |
| existing `annotations.test.ts` | Still passes: the map is checked against the full registration |
| existing `oauth.test.ts` | Now iterates three paths |

**Non-regression:** `/mcp` and `/deep-research/mcp` serve the same tool names, schemas, and handlers as before; the two handler definitions are the extraction of their own previous bodies; no change to auth, config, or client code.

### 3.7 Deploy

Merge and deploy as usual; the new path is live but unlisted. Then, per §2:
- **Option A:** create the second Render service (same repo, branch `main`, same env), set `HOST_URL=https://predictions.octagonai.co`, add the custom domain and CNAME. Leave `OPENAI_APPS_CHALLENGE` unset until the portal issues a token.
- **Option B:** nothing; the token goes into the website repo's `public/.well-known/openai-apps-challenge` when issued.

---

## 4. Packaging: `octagon-claude-plugin` (one PR)

### 4.1 Footprint

```
openai/
├── plugin.config.json, transform.config.json, skills/, assets/   unchanged · the default profile
├── profiles/
│   └── prediction-markets/                     NEW · the whole second plugin, content only
│       ├── plugin.config.json
│       ├── transform.config.json               {"extends": "../../transform.config.json", "includeSkills": [...], ...}
│       ├── assets/{logo,icon}.png              same mark, or a variant
│       └── skills/                             analyst workflows, each research-only by construction (§4.5)
│           ├── get-started/SKILL.md            onboarding for analysts: what the data is, what the plugin won't do
│           ├── event-brief/SKILL.md            structured brief on one market: criteria, base rates, drivers, catalysts
│           ├── probability-history/SKILL.md    reads the history tool: moves, regimes, what explains each move
│           ├── mispricing-analysis/SKILL.md    market vs model gap with uncertainty and track record
│           └── octagon-status/SKILL.md         lists the 2 tools
tools/openai-plugin/
├── cli.mjs                                     EDIT · --profile <name>
└── lib/
    ├── config/
    │   ├── Profile.mjs                         NEW · resolves a profile's four input paths
    │   └── TransformConfig.mjs                 EDIT · `extends` + `includeSkills` (both optional)
    ├── catalog/SkillCatalog.mjs                EDIT · optional `include` allowlist
    ├── createBuild.mjs                         EDIT · takes a Profile instead of fixed paths
    └── BuildPipeline.mjs                       EDIT · report file named per plugin
tests/openai-plugin/
├── profile.test.mjs                            NEW
├── transforms.test.mjs                         EDIT · extends/merge cases
├── catalog.test.mjs                            EDIT · include semantics
└── pipeline.test.mjs                           EDIT · parametrized over both profiles
```

### 4.2 `Profile` (value object)

```js
export class Profile {
  /** @param {{ name: string, root: string }} */
  constructor({ name, root })            // frozen
  static default(openaiRoot)             // name "default", root = openai/
  static named(openaiRoot, name)         // root = openai/profiles/<name>/, must exist
  get pluginConfig()  get transformConfig()  get skills()  get assets()
}
```

`createBuild({ repoRoot, profile })` replaces the `layout()` path constants with `profile.*`. `layout()` keeps `repoRoot`, `sourceSkills`, `openaiRoot`, `defaultOut`. Protected paths are unchanged (every top-level repo entry except `out/`), so profiles can't write outside `out/` either.

### 4.3 `TransformConfig`: `extends` and `includeSkills`

- `extends` (optional, relative path): load the parent first, then merge:
  - `removeFiles`, `sections`, `substitutions`, `forbiddenPatterns`: **concatenate** (parent first, so the child can override by order)
  - `excludeSkills`: **child wins** if present
  - `includeSkills`: **child only** (an allowlist in a parent makes no sense)
  - `skillEdits`: **union by skill name**; a child entry for the same skill replaces the parent's
- `includeSkills` (optional): when present, only these source skills are considered; `excludeSkills` is still applied on top. Overlay skills are always included.
- Cycle and missing-file guards; both reported through the existing `ConfigError`.

The one semantic the catalog needs: with `includeSkills` set, **inherited** `skillEdits` targeting a non-included skill are dropped rather than failing the build. Edits **declared in the profile itself** stay strict. This keeps "an upstream change can't silently skip a compliance rewrite" for everything the profile ships, while not forcing a 1-skill profile to list 60 exclusions. `TransformConfig.editedSkills()` returns only the surviving set, so `SkillCatalog`'s existing consistency check needs no change.

### 4.4 `SkillCatalog`: `include`

Constructor gains `include?: readonly string[]`. `build()` filters `sourceNames` by `include` before `exclude`. Consistency check adds: every included name must exist. Four lines.

### 4.5 Profile content

**`profiles/prediction-markets/transform.config.json`**
```json
{
  "extends": "../../transform.config.json",
  "includeSkills": ["prediction-markets-analysis"],
  "excludeSkills": [],
  "forbiddenPatterns": [
    { "pattern": "\\b(?:place|placing|make|making) (?:a )?(?:bet|wager)s?\\b", "flags": "i", "reason": "bet placement is out of scope" },
    { "pattern": "\\b(?:buy|sell|short|long) (?:yes|no)\\b", "flags": "i", "reason": "no side recommendations" },
    { "pattern": "\\b(?:entry|exit) (?:point|price|timing)s?\\b|\\bstake size\\b|\\bpayout\\b", "flags": "i", "reason": "trade-execution vocabulary; findings stop at the analysis" }
  ]
}
```
It inherits the base's neutralization substitutions, the `## Prerequisites` rewrite, and the base forbidden patterns. The strict `prediction-markets-analysis` edits (recommendation framework and position sizing removed, buy/sell cues rewritten) **live here**, under this file's own `skillEdits`, moved out of the base config because the base now excludes the skill (§0.1). Mispricing analysis in that skill stays as it is: it is the research. The profile's four overlay skills are written fresh against the §1.5 frame; `octagon-status` overrides the catalog version.

The patterns are narrow by design (phrases, not single words) so ordinary prose such as "edge case" never trips them. If a build hit looks legitimate, reword the text; don't loosen the guard.

**Overlay skills (analyst workflows).** Each skill states its deliverable, the tool calls, and the frame. Sketch:

| Skill | Deliverable | Tools | Frame notes |
|---|---|---|---|
| `get-started` | What prediction-market data is, who the plugin is for, three starter asks, what it will not do, how to connect, plan requirement | — | The "will not do" list is explicit: no orders, no stakes, no side picks, no personalized advice |
| `event-brief` | One-page analyst brief for a market link: what resolves it and when; current market-implied probability with timestamp; base rates from similar past events; the three to five drivers with sources; catalyst calendar; what would change the picture | agent (cached first, fresh on request) | Probabilities are reported as the market's belief, never as a price to act on |
| `probability-history` | Probability-over-time analysis for an event ticker: trend, largest moves and their dates, regime changes, volatility, and the news or catalysts that explain each move | history (+ agent for explanations) | Analytical language: "moved from 41% to 58% after the CPI print"; no "entry points" |
| `mispricing-analysis` | Side-by-side of market-implied and model probabilities: size and direction of the mispricing, the uncertainty around both estimates, which sources the model weighs differently, and how gaps of this size have resolved historically on similar markets | agent | Reports the mispricing as a finding with its confidence and track record; never tells the user what to do about it |

**`profiles/prediction-markets/plugin.config.json`** (key values)

| Field | Value |
|---|---|
| `name` | `octagon-prediction-markets` |
| `keywords` | prediction-markets, kalshi, odds, event-probabilities, forecasting, mispricing, research |
| `version` | `1.0.0` |
| `mcp.serverName` / `mcp.url` | `octagon-predictions` / per §2 |
| `mcp.tools` | `["octagon-prediction-markets-agent", "prediction_markets_history"]` |
| `interface.displayName` | `Octagon Prediction Markets` (26). Chosen for directory search: the listing is found by name, so the name carries the search term |
| `interface.shortDescription` | `Odds, drivers & mispricings` (27). Adds search terms the name lacks instead of repeating it; no third-party brand (§4.7.3) |
| `interface.category` | `Finance` or `Research`, whichever the dashboard offers; prefer the one that does not sit next to betting apps |
| `interface.capabilities` | Brief a prediction-market event · Analyze odds history · Identify mispricings between market and model probabilities · Surface drivers and catalysts with sources |
| `interface.defaultPrompt` | "Write an event brief for the next Fed rate decision market." · "How have the odds on a rate cut moved this month, and why?" · "Is this Kalshi market mispriced relative to the model? <link>" |
| `interface.longDescription` | Draft: *"Octagon Prediction Markets turns prediction markets into a research dataset. Give it a market and it returns a cited analyst brief: what resolves the event, what the market currently implies, how that probability has moved and why, how similar events have resolved before, and whether the market is mispriced relative to an independent model estimate, with the size of the gap and the confidence behind it.\n\nBuilt for analysts, economists, strategists, policy and risk teams, and journalists who treat event probabilities as data.\n\nCovers Kalshi markets across economics, politics, science and technology, climate, and entertainment.\n\nOctagon is a research tool. It does not place, route, or recommend bets or trades, hold funds, or connect to any trading account, and it does not give personalized financial advice. Requires an Octagon account (sign up at octagonai.co); generating new reports requires a plan that includes report generation, and cached reports are available on all plans."* Keywords to work into the first two sentences for search and model routing: prediction markets, Kalshi, odds, event probabilities, forecasts, mispricing |
| URLs, brand colors, author | Same as the published plugin, except `websiteURL`, which points at the plugin landing page with UTM parameters (§4.7.3) |
| `review.test_cases` | **Positive (5):** event brief for a Fed decision market (cached); probability history for a given event ticker with explanations of the two largest moves; mispricing analysis for a given market link (expected: market and model probabilities, the gap, confidence, historical resolution of similar gaps, and no instruction to act); "what changed this week" for a market, combining history and brief; a market with no cached report (expected: states it can generate one, that it takes minutes, and asks before doing so). **Negative (3):** "Put $50 on YES for me" (declines; it cannot place or route wagers; offers the brief); "Which side should I bet and how much? Just tell me" (no side or stake; explains it provides analysis, not recommendations, and offers the mispricing analysis instead); "What's the weather in Chicago tomorrow?" (tools not invoked) |
| `review.commerce` | `false` |
| `publication.countries` | `["US"]` |

### 4.6 CLI and tests

- `npm run build:openai -- --profile prediction-markets`; `validate:openai` likewise. Default profile unchanged, so PR #1's scripts and docs stay valid. Add `build:openai:predictions` / `validate:openai:predictions` script keys for convenience.
- `BuildPipeline` writes `out/<name>.build-report.json` (today `out/build-report.json`; nothing reads it, and `out/` is gitignored).
- `profile.test.mjs`: default resolves to `openai/`; named resolves to `openai/profiles/<name>/`; unknown name is a `ConfigError`.
- `transforms.test.mjs` additions: `extends` concatenation order; child `excludeSkills` wins; `skillEdits` union; inherited edit for a non-included skill is dropped, a profile-declared one still fails strictly; cycle detection.
- `pipeline.test.mjs`: runs both profiles. For `prediction-markets` asserts: 6 skills (`prediction-markets-analysis`, `get-started`, `event-brief`, `probability-history`, `mispricing-analysis`, `octagon-status`), `mcp.tools` has exactly 2 entries, `.mcp.json` URL matches §2, 0 errors, reproducible hash, source untouched, **and** that the default profile's output is byte-identical to the build that contains the §0.1 edits (its hash is pinned in the test for this PR, then unpinned once merged), so the profile machinery itself changes nothing about the public-markets package.
- `npm-pack.test.mjs` already excludes `openai/`, so profiles never reach the npm tarball.

---

## 4.7 Discovery and SEO sweep

Goal: installs and Octagon sign-ups from people searching for prediction-market tooling. Three surfaces, in order of leverage: (1) the OpenAI directory itself, (2) ChatGPT's in-conversation routing, (3) Google and AI search sending people to a page that installs the plugin. Data below is US Google, monthly, pulled 2026-10-29 (DataForSEO), plus live SERPs.

### 4.7.1 What people search for

| Cluster | Query | Volume | Note |
|---|---|---|---|
| Category | prediction market(s) | 49,500 | Head term; informational |
| | what is prediction market | 6,600 | |
| | prediction market app(s) | 2,400 / 1,300 | CPC $42: commercial intent, mostly venue-shopping |
| | how does prediction market work | 1,600 | |
| Brand + category | kalshi prediction market | 8,100 | |
| | polymarket prediction market | 5,400 | |
| | kalshi vs polymarket / polymarket vs kalshi | 6,600 / 5,400 | octagonai.co already ranks #44 for the latter |
| Analyst intent | kalshi odds | 2,400 | The closest high-volume term to our product |
| | polymarket odds | 1,000 | |
| | fed rate cut odds | 880 | Maps directly to the FOMC starter prompt |
| | event probability | 590 | |
| | prediction market arbitrage / news | 480 / 480 | Arbitrage is bettor-adjacent; news fits |
| | superforecasting / forecasting tools | 1,900 / 320 | Adjacent analyst audience |
| | kalshi research / kalshi data / polymarket data | 260 / 210 / 210 | Low volume, exact intent |
| | kalshi api / polymarket api / prediction market api | 6,600 / 4,400 / 110 | Developer intent; site already has both API guides |
| ChatGPT distribution | chatgpt apps | 550,000 | Directory brand term, unwinnable head; its long tail matters |
| | codex plugins | 1,900 | New and uncontested |
| | chatgpt plugins / chatgpt app store / chatgpt connectors / chatgpt mcp | 1,300 / 1,300 / 720 / 720 | |
| | chatgpt prediction markets, kalshi chatgpt, polymarket chatgpt | n/a–30 | Too new for Ads volume, but the SERP is news (NYT, July 2026: Kalshi odds shown in ChatGPT). Rising intent with no product page ranking |

Terms to **avoid** targeting even though they're large: `kalshi betting` (27,100), `kalshi bets`, `promo code` / `referral code` / `sign up bonus` (14,800–18,100). They're bettor intent, off-frame (§1.5), and the plugin guidelines prohibit promotional listing content.

### 4.7.2 Who ranks today

- **"prediction market ai tool":** Polifly ("edge detection, copy trading, daily picks"), AlphaScope, Nick.ai, Kalshi's own AI category page, and the GitHub list `aarora4/Awesome-Prediction-Market-Tools` at #3. Every product result is a betting aid. **The analyst position is empty.**
- **"chatgpt prediction markets":** NYT, Kalshi's OpenAI tag page, a LinkedIn post, a YouTube "find mispriced Polymarket bets" video, and a blog about wiring a custom connector. **No plugin or app page ranks.**
- **"best prediction market tools":** Forbes, DayTrading, listicles, `predictionmarket.tools`. octagonai.co has `/answers/best-prediction-market-tools-in-2026/` and isn't on page 1.
- **octagonai.co's own strength:** it ranks (positions 15–75) for dozens of event queries through `/markets/...` pages (iPhone 18 release, Anthropic IPO date, 2038 World Cup host, FL-7 district). That's a large stream of people already looking at a specific market. Today none of those pages offer a way to analyze the market in ChatGPT.

### 4.7.3 In the directory (name search only)

OpenAI's docs say listings are found by direct link or by **searching the name**. Everything else on the listing page converts; only the name finds.

| Field | Value | Why |
|---|---|---|
| `displayName` | `Octagon Prediction Markets` | Contains the 49,500/mo head term verbatim |
| `shortDescription` | `Odds, drivers & mispricings` | Adds analyst terms the name lacks; no brand names (third-party brands in a title or subtitle read as an unofficial connector) |
| `longDescription`, sentence 1 | *"Octagon Prediction Markets turns Kalshi prediction markets into a research dataset: current odds, what moved them, and where the market-implied probability diverges from an independent model."* | First sentence carries: prediction markets, Kalshi, odds, probability, model. It is also what the directory card truncates to |
| `longDescription`, sentence 2 | *"Built for analysts, economists, strategists, policy and risk teams, and journalists who treat event probabilities as data."* | Audience terms for people scanning for fit |
| `capabilities` | Brief a prediction-market event · Analyze odds history · Identify mispricings between market and model probabilities · Surface drivers and catalysts with sources | "odds" and "mispricings" are the two words searchers use that the name doesn't |
| `defaultPrompt` | "Write an event brief for the next Fed rate decision market." · "How have the odds on a rate cut moved this month, and why?" · "Is this Kalshi market mispriced relative to the model? <link>" | Each mirrors a searched phrase (fed rate cut odds, kalshi odds, mispricing) |
| `websiteURL` | `https://www.octagonai.co/chatgpt/prediction-markets/?utm_source=openai_directory&utm_medium=plugin&utm_campaign=prediction-markets` | The listing's only outbound link; it should land on the plugin page (§4.7.5), not the homepage. Query strings pass the URL rule |
| `keywords` (manifest) | prediction-markets, kalshi, odds, event-probabilities, forecasting, mispricing, research | Not shown in the directory today; free to include |

### 4.7.4 Inside ChatGPT (model routing)

Once installed, the model decides when to call the plugin from the **tool descriptions** (server) and **skill descriptions** (package). Trigger phrases to cover in those texts, each once, naturally: "prediction market", "Kalshi", "odds", "probability that", "will X happen", "chance of", "market link", "event brief", "mispriced". The agent's description already covers Kalshi, prices, and mispricings; the four profile skills add the rest through their `description:` lines. No server change needed.

### 4.7.5 On the web: pages

| # | Page | Target queries | Action |
|---|---|---|---|
| 1 | **`/chatgpt/prediction-markets/`** (new, the plugin landing page) | chatgpt prediction markets · kalshi chatgpt · polymarket chatgpt · prediction market chatgpt plugin · chatgpt apps prediction markets · codex plugins | Title: *"Prediction Markets in ChatGPT: Octagon plugin for Kalshi odds, drivers and mispricings"*. H1 the same without "Octagon plugin for". Above the fold: one-line value prop, the directory deep link as the primary button, three example prompts as copyable chips, a screenshot or 20-second clip of an event brief. Below: who it's for, what it does and doesn't do (the §1.5 table in prose), how to install in ChatGPT and in Codex, FAQ (6 questions: is this betting, does it place trades, which markets, what does it cost, what plan do I need, how is this different from Kalshi's own odds). Schema: `SoftwareApplication` (applicationCategory "FinanceApplication", operatingSystem "ChatGPT, Codex", offers free with account) + `FAQPage` via the existing `Faq` component + breadcrumb. Markdown twin via the existing `[...path].md.ts` route, and an entry in `llms.txt` |
| 2 | `/reports/chatgpt-integration/` (exists; dev-mode instructions) | chatgpt integration octagon | Keep, but lead with the directory listing for both plugins and move developer-mode steps under "Manual setup". Link to #1 |
| 3 | `/connected-apps/` ChatGPT card (exists) | | Point at #1; mention both plugins by name |
| 4 | **Every `/markets/...` page** (exists; the site's largest ranking surface) | all event long-tail | Add one CTA block: *"Analyze this market in ChatGPT"* → directory deep link, plus a copy-prompt button pre-filled with *"Write an event brief for <market title>: <market URL>"*. This turns existing rankings into installs. Implement once in `MarketPage.astro` |
| 5 | `/answers/*` prediction-market cluster (about 40 pages exist) | the cluster's current queries | Add the same CTA block (component, not per-page edits) under the answer body on pages tagged prediction markets |
| 6 | New answers (5) | kalshi odds (2,400) · fed rate cut odds (880) · event probability (590) · superforecasting (1,900) · kalshi research / data (470 combined) | *How to read Kalshi odds as probabilities (and what moves them)* · *Fed rate cut odds: how to read the FOMC prediction market* · *What is event probability and how analysts use it* · *Superforecasting with prediction markets: a practical workflow* · *Kalshi research and data tools for analysts* (where Octagon is one entry, honestly ranked among others) |
| 7 | `/answers/best-prediction-market-tools-in-2026/` (exists) | best prediction market tools | Add an "AI research assistants" subsection that lists the plugin with its directory link, alongside competitors; the page currently has no ChatGPT mention |
| 8 | `/answers/kalshi-api-guide/`, `/answers/polymarket-api-guide/` (exist) | kalshi api (6,600) · polymarket api (4,400) | One paragraph: "If you want the analysis without writing code, the ChatGPT plugin…" → #1. Developer traffic is adjacent, not core; keep it to one paragraph |
| 9 | `/news/*` (exists; prediction-market news) | prediction market news (480) | CTA block on news articles tied to a market; same component as #4 |
| 10 | Octagon docs | | A "ChatGPT and Codex plugins" page listing both plugins, their tool surfaces, and the directory links |

Internal linking rule: every page in #2–#10 links to #1 with the anchor text "prediction markets in ChatGPT" or "Octagon Prediction Markets plugin". #1 links back to the markets index, the answers cluster, and pricing.

### 4.7.6 Off-site

| Channel | Action |
|---|---|
| `aarora4/Awesome-Prediction-Market-Tools` (GitHub, ranks #3 for "prediction market ai tool") | Submit a PR adding the plugin under AI agents / analytics, with the directory link |
| `predictionmarket.tools` (ranks for "best prediction market analytics tools") | Request a listing |
| OpenAI directory link | Post the deep link in the Kalshi and Polymarket subreddits and Discords **only** as an analyst tool (the §1.5 framing); these communities punish anything that smells like a betting-tips pitch |
| Press angle | The NYT story (Kalshi odds in ChatGPT) created the frame "prediction markets inside ChatGPT". Pitch the next step: analyst-grade research on those odds, from a company that doesn't take bets. Target the reporters who covered that story |
| Product Hunt / Hacker News | Launch after approval, with #1 as the landing page |
| Kalshi | Ask to be listed as a research tool on Kalshi's ecosystem or tools page, if one exists; they rank for every brand query |

### 4.7.7 Measurement

- UTM on `websiteURL` (§4.7.3) and on every CTA block (`utm_source=octagonai&utm_medium=cta&utm_campaign=prediction-markets-plugin&utm_content=<page-type>`), so sign-ups attribute to directory vs site vs market pages.
- Search Console: a saved filter for the §4.7.1 analyst-intent queries and for the `/chatgpt/` path; review weekly for the first two months.
- Directory: install counts and the review's "discovery" notes, if the dashboard exposes them.
- Sign-up funnel: new accounts whose first session includes the plugin's OAuth client ID (the login server can tag these), so "signups from the plugin" is a real number rather than a UTM proxy.

### 4.7.8 Guardrails

- No promotional language anywhere on the listing: no "free trial", pricing, bonuses, or comparisons ("better than Polymarket's odds"). Plan requirements are stated factually.
- No third-party brand in `displayName` or `shortDescription`. Kalshi appears in the description and skills as the data source, which it is.
- Target bettor queries only with informational content that stays in frame; never with the plugin landing page.
- Everything added to the site is a component or a config entry: the CTA block is one Astro component included in `MarketPage.astro`, the answers layout, and the news layout, so it can be changed or removed in one place.

### 4.7.9 Order of work

1. Directory copy (§4.7.3) and skill descriptions (§4.7.4): part of the packaging PR; zero extra cost.
2. CTA component on market, answers, and news pages (#4, #5, #9): highest leverage per hour because those pages already rank.
3. Plugin landing page (#1) with schema, markdown twin, llms.txt entry; retarget `/reports/chatgpt-integration/` and `/connected-apps/` to it.
4. Five new answers (#6) and the two edits (#7, #8).
5. Off-site listings and the press angle, after the plugin is approved and the deep link exists.
6. Measurement wiring before launch day, so the first week's data is clean.

Items 2–4 are website PRs in `octagonai.co` and can start before the plugin is approved; the deep link is a placeholder until then.

---

## 5. Risks specific to this plugin

| Risk | Why it's higher here | Mitigation |
|---|---|---|
| Classified as gambling | Every market it analyzes is a venue where other people wager, and the product names mispricings | The product holds no funds, places no orders, and connects to no trading account; a mispricing is reported as a research finding with confidence and track record, never as an instruction; the §1.5 frame runs through the name, description, prompts, skills, and the forbidden-text guard; two negative cases demonstrate refusal of wagers and side picks; no Kalshi affiliate or sign-up links; submit after the published plugin's re-oriented version is approved (§6), so each listing is reviewed against copy that belongs only to it. If a reviewer still objects, the appeal text is §1.5 verbatim |
| "Purpose and originality" (duplicate of the published plugin) | Same publisher, same server, and (under §0.2's launch option) two tools scannable on both | After §0.1 the two listings share no copy, no prompts, no skills, and no test cases: the published plugin is public markets, this one is prediction markets. Three of its six skills exist only here. Read the guideline section before upload; if a reviewer still objects, phase 2 of §0.2 removes the tool overlap too |
| Plan gating | Report generation needs Plus/Pro/Enterprise and costs credits; cached reports are free | Error messages are informational with a plans link (guideline-compliant); reviewer account must have the plan; `longDescription` states the requirement plainly |
| Wrong MCP origin locked in | Permanent after publish | §2 decided before the first upload; pinned in `plugin.config.json` and asserted by `pipeline.test.mjs` |
| Reviewer can't reproduce a fresh report (minutes-long) | Timeouts | Positive cases lead with cached reports; the fresh-report case uses a market known to be cached or small; measure p95 before recording |
| Agent output phrases a mispricing as advice | The agent's own report text may say things like "consider buying YES" | The guard runs on shipped skill text only; for tool **output**, the overlay skills instruct the model to keep the finding (direction, size, confidence) and drop any action phrasing before presenting it |
| Drift between profiles | Two configs touching the same skills | Each compliance edit exists in exactly one config (global rules in the base, prediction-market edits in the profile); the pipeline test pins the default profile's output |

---

## 6. Sequencing

| Step | What | Gate |
|---|---|---|
| 0 | §0.1 edits to the public-markets package merged (PR #2); the live listing is **not** updated yet | The re-oriented package builds clean and waits for step 8 |
| 1 | Server PR (§3) | `bun test` green; `/mcp` and `/deep-research/mcp` tool lists unchanged; merged and deployed |
| 2 | §2 decision in the portal (start a draft, look at the challenge base offered) | Origin chosen |
| 3 | Packaging PR (§4) with the profile content | `test:openai` green for both profiles; default profile output byte-identical to the §0.1 build; `validate --profile prediction-markets --online` 0 errors |
| 4 | Infra per §2 (Option A: Render service + CNAME; Option B: website file) | `/.well-known/openai-apps-challenge` serves the token on the chosen base |
| 5 | Auth sanity: DCR + token exchange against the new resource URL from a scratch client | Login works for the new path |
| 6 | ChatGPT dev-mode run of the 8 cases, demo video, set `demo_recording_url` | All cases behave as specified |
| 7 | Upload the prediction-markets plugin, scan, review details, Ken submits, approval, publish | The prediction-markets listing is live and installable |
| 8 | Upload the re-oriented public-markets package as the live listing's next version (§0.3) | Users following the referral land on a published plugin |

No commits or deploys happen without explicit go-ahead. Both PRs are authored by the human owner, without tool attribution.

---

## 7. Later options (not in v1)

- **Free tier without sign-in.** `prediction_markets_cache` already serves cached reports to public-key callers. OpenAI supports tools declaring both `noauth` and `oauth2` security schemes with `_meta["mcp/www_authenticate"]` on the upgrade path, so cached reports could work before login and fresh reports after. Needs per-tool security schemes and a token-aware handler; a separate PR.
- **Polymarket.** When the agent supports it, the skill and listing text update through the profile config only.
- **Analyst exports.** A `weekly-digest` skill (a table of tracked markets with current probability, week-over-week change, and the top driver per market) fits the frame and needs no server work; it's a candidate for 1.1 once reviewers have seen v1.
- **Same `ToolSet` for the stdio server.** `octagon-mcp-server` could expose a `--toolset` flag using the same presets, for parity. Optional.
