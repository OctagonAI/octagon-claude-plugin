# Octagon on World Monitor: Submission Plan

Status 2026-11-17. Build status: O1, O2, O6 in octagon-remote-mcp PR #31; O5 in octagon-claude-plugin (this PR) under `worldmonitor/` with `npm run catalog:worldmonitor`, `check:worldmonitor`, `ts:worldmonitor`. Target: `koala73/worldmonitor` (90.8k stars, AGPL-3.0, TypeScript) and its hosted app at worldmonitor.app. Source of truth for the Octagon side: `OctagonAI/octagon-claude-plugin` main `9068258`, `OctagonAI/octagon-remote-mcp` main `1aad45e`.

---

## 0. What World Monitor accepts, and what it does not

World Monitor has no plugin marketplace and no connector registry. Everything I say below comes from reading the repo and the live site; the three intake paths that exist are:

| Path | What it is | Where it lives | Fit for Octagon |
|---|---|---|---|
| **A. Quick Connect MCP presets** | A curated catalog of third-party MCP servers. A user picks one in the "Connect MCP" modal, pastes an API key, and gets a live dashboard panel that calls one tool on a refresh interval. Exa, Tavily, Perigon, Pyth, Alpha Vantage, LunarCrush, Cloudflare Radar, Stripe, Datadog are in it today. | `src/services/mcp-store.ts` (`MCP_PRESETS`), rendered by `src/components/McpConnectModal.ts` and `McpDataPanel.ts`, proxied by `api/mcp-proxy.ts` | **Primary.** This is the exact semantic for "an external MCP server as a data source". Our ChatGPT plugins are MCP endpoints, so each one maps to a preset. |
| **B. Source attribution ledger** | Every outbound host the code touches needs a curated row in `shared/source-attribution-manifest.json`; the public page worldmonitor.app/sources is generated from it (1,347 providers today). Not a separate submission; a hard requirement of A. | `scripts/source-attribution.mjs`, `npm run sources:check`, `npm run sources:generate` | **Required with A.** Gets "Octagon AI" listed on the public sources page with provider, kind, license posture. |
| **C. First-party data source / map layer** | Octagon data wired into World Monitor's own pipeline: proto service, Railway seeder, Redis, panel. Requirements: freely accessible (no paid-only API for core use), permissive license or public data, daily updates, geo-locatable. | `CONTRIBUTING.md#adding-data-sources`, `.agents/skills/add-data-source/SKILL.md` | **Stretch.** Heavy, maintainer-gated, and Octagon's data is per-request agent output, not a bulk feed. Two narrow candidates are worth it (section 6). |

What does not exist and should not be attempted: an "apps" directory, a ChatGPT-style plugin upload, or a way to ship our skills into their UI. World Monitor publishes *its own* skills and MCP server for agents; it does not host other people's skill packages. The `.codex-plugin` ZIPs stay where they are; here we submit the **endpoints behind them**.

---

## 1. The preset contract we have to satisfy

```ts
export interface McpPreset {
  name: string;            // shown in the catalog
  icon: string;            // one emoji
  description: string;     // one line
  serverUrl: string;       // https only, public host, unique across the catalog
  authNote?: string;       // "Requires Authorization: Bearer <VAR> (free tier at example.com)"
  apiKeyHeader?: string;   // header template; when present the modal shows one "API KEY" field
  defaultTool?: string;    // the tool a new panel calls
  defaultArgs?: Record<string, unknown>;
  defaultTitle?: string;   // the new panel's title
}
```

Three facts about how presets run decide our design:

1. **Auth is a header, not OAuth.** The panel stores the user's headers and `api/mcp-proxy.ts` forwards them verbatim to `serverUrl`. The modal's single-field mode comes from `apiKeyHeader`, e.g. `Authorization: Bearer {key}`. There is no OAuth flow for presets.
2. **Panels poll.** `McpPanelSpec.refreshIntervalMs` is clamped to a minimum of 60 s (`MIN_MCP_REFRESH_INTERVAL_MS`). Each refresh is a `tools/call`. For Octagon that is a credit per refresh, so the defaults we ship must be cheap and the copy must say so.
3. **A weekly liveness probe** (`.github/workflows/mcp-preset-liveness.yml`, `tests/mcp-presets.test.mjs` with `LIVE_MCP_TESTS=1`) POSTs to every `serverUrl` unauthenticated. Keyed presets pass on HTTP 200, 401 or 403; open presets need 200; redirects fail. Our endpoints answer 401 with a `WWW-Authenticate` challenge, which passes as a keyed preset.

Static tests also require: `https`, unique `serverUrl`, no private hosts, parseable URL, and no known-dead URLs.

### 1.1 The one blocker on our side

Octagon's hosted MCP authenticates API keys **in the URL path** (`https://mcp.octagonai.co/<key>/sec/mcp`) and reserves `Authorization: Bearer` for OAuth JWTs (`oauthMiddleware` → `verifyBearerToken`, which does `jwtVerify` against `login.octagonai.co`). A World Monitor preset has a fixed `serverUrl` and sends the key as a header, so today an Octagon key sent as a bearer fails with `invalid_token`.

Fix in `octagon-remote-mcp` (small, backward compatible):

```ts
// src/middleware.ts — oauthMiddleware
const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
if (!token) { /* unchanged 401 + challenge */ }

if (looksLikeApiKey(token)) {            // /^(sk|pk)_[A-Za-z0-9]+$/ and not three dot-separated JWT segments
  return authenticateApiKey(token, request, response, next);   // same validation apiKeyMiddleware does: getClient(key).models.list()
}
// else: existing JWT path
```

- `authenticateApiKey` is the body of today's `apiKeyMiddleware` lifted into a shared function so both paths validate identically, set `authType` (`ApiKey` / `PublicKey`) and `mcpToken`, and keep `publicKeyDenial` working on the scoped endpoints.
- A rejected key returns **403**, not 401, matching the path variant's existing behaviour so clients do not fall into OAuth discovery.
- Optionally also honour `X-Octagon-Key: <key>` for clients that cannot set `Authorization`. World Monitor's template handles either; `Authorization: Bearer {key}` is the catalog's convention and what we ship.
- Tests: bearer JWT still works; bearer `sk_` validates; bearer `pk_` is denied where `publicKeyDenial` is set; garbage bearer → 401 `invalid_token`; `tools/list` on `/sec/mcp` with a bearer key returns one tool.
- Deploy: manual Render deploy of `srv-d12uqi95pdvs73d5vrtg`, then probe every endpoint with a bearer key.

Without this, the World Monitor PR cannot be tested end to end and should not be opened.

### 1.2 Security note to put in the PR and in our docs

The user's Octagon key passes through `worldmonitor.app/api/mcp-proxy` (that is how every preset works; the proxy logs header *names*, never values). We recommend in our copy that users create a dedicated key for World Monitor and revoke it from the Octagon dashboard if they stop using it. Public keys (`pk_`) are refused on the deep-research and podcasts endpoints by design; the preset copy says "secret key".

---

## 2. Which plugins become presets

Each ChatGPT plugin already has a scoped endpoint with exactly the tools the preset needs. Mapping:

| ChatGPT plugin | Preset name | `serverUrl` | `defaultTool` | `defaultArgs.prompt` (cheap, timely, no advice) | `defaultTitle` |
|---|---|---|---|---|---|
| octagon-ai | Octagon AI | `https://mcp.octagonai.co/public-markets/mcp` | `octagon-agent` | "Top three market-moving company headlines today, each with source and time." | Octagon Research |
| octagon-prediction-markets | Octagon Prediction Markets | `https://mcp.octagonai.co/prediction-markets/mcp` | `octagon-prediction-markets-agent` | `{ prompt: "Fed decision markets: current probabilities", cache: true }` | Prediction Markets |
| octagon-podcasts | Octagon Podcasts | `https://mcp.octagonai.co/podcasts/mcp` | `octagon-podcasts-agent` | "Which companies were discussed most on finance podcasts this week?" | Podcast Signals |
| octagon-sec-filings | Octagon SEC Filings | `https://mcp.octagonai.co/sec/mcp` | `octagon-sec-agent` | "Material 8-K filings in the last 24 hours, with filer and item." | SEC Filings |
| octagon-earnings-calls | Octagon Earnings Calls | `https://mcp.octagonai.co/earnings-calls/mcp` | `octagon-transcripts-agent` | "Guidance changes from earnings calls held yesterday." | Earnings Calls |
| octagon-stock-data | Octagon Stock Data | `https://mcp.octagonai.co/market-data/mcp` | `octagon-stock-data-agent` | "S&P 500 sector performance today." | Stock Data |
| octagon-financials | Octagon Financials | `https://mcp.octagonai.co/financials/mcp` | `octagon-financials-agent` | "Companies reporting this week: consensus revenue and EPS estimates." | Financials |
| octagon-crypto | Octagon Crypto | `https://mcp.octagonai.co/crypto/mcp` | `octagon-crypto-agent` | "BTC, ETH, SOL price and 24h change." | Crypto |
| octagon-holdings | Octagon 13F Holdings | `https://mcp.octagonai.co/holdings/mcp` | `octagon-holdings-agent` | "Latest 13F filings in the past week and their largest new positions." | 13F Holdings |
| octagon-market-news | Octagon Market News | `https://mcp.octagonai.co/news/mcp` | `octagon-news-agent` | "Press releases and news in the last 6 hours for NVDA, AAPL, MSFT." | Market News |

Notes on the choices:

- **Octagon AI uses `/public-markets/mcp`, not `/mcp`.** The full endpoint also exposes deep research (expensive, minutes) and the prediction-markets tools; a dashboard panel polling deep research would be a billing accident. `/public-markets/mcp` serves the orchestrator and deep research only, so set `defaultTool` to the orchestrator and leave deep research for users who choose it.
- **Prediction Markets passes `cache: true`.** That is the free, instant read of an existing report and the discovery list. A panel that refreshed with `cache: false` would generate a 3-credit report every minute.
- **Default prompts are window-bounded** ("today", "last 24 hours", "this week") so the panel's output changes between refreshes and the credit buys something. None asks for a recommendation; World Monitor's own copy standards and ours agree on that.
- **Specialists fit the panel model better than the umbrella.** `McpDataPanel` pins one tool per panel. A one-tool endpoint means the user never has to pick, and the server's `instructions` already describe the scope.

### 2.1 Curation risk and the fallback

The maintainer's comment on `MCP_PRESETS` says adding a preset is "a curation decision, not a capability change." Ten entries from one vendor in a catalog of 23 will read as a land grab. Plan for it:

- **PR 1 ships three**: Octagon AI, Octagon Prediction Markets, Octagon Podcasts. These are the ones with no overlap in the catalog (nobody else offers cited podcast synthesis or Kalshi model probabilities) and the two live ChatGPT listings.
- **PR 2 proposes the seven specialists** as a follow-up once PR 1 is merged, framed around the panel model: one tool per panel, each default prompt a distinct dashboard tile. If the maintainer prefers fewer, offer `Octagon Stock Data`, `Octagon SEC Filings`, `Octagon Crypto` and drop the rest; all ten remain reachable by typing the URL, since the proxy has no allowlist.
- Open the **new-source issue first** (`.github/ISSUE_TEMPLATE/new_data_source.yml`: type "API integration", variant "Finance" and "All variants") so the curation conversation happens before the code.

---

## 3. The attribution ledger entry

`npm run sources:check` fails on any new host in `src/` without a manifest row. One host covers all ten presets: `mcp.octagonai.co`.

Row shape, from the Alpha Vantage precedent:

```json
{
  "host": "mcp.octagonai.co",
  "provider": "Octagon AI",
  "kind": "structured",
  "observed": true,
  "license": "Octagon Terms of Service (https://www.octagonai.co/terms-of-service/); per-request agent output, user-keyed, not redistributed by World Monitor",
  "attribution": "Credit Octagon AI and link to https://www.octagonai.co/. Answers carry their own upstream citations (SEC, transcripts, market data providers).",
  "status": "terms-review",
  "references": [{ "path": "src/services/mcp-store.ts" }]
}
```

- `status` starts as `terms-review` like every third-party API; the maintainer flips it to `reviewed`. We can shorten that by linking a short statement on octagonai.co confirming that World Monitor users may display Octagon answers in their own dashboards under their own key.
- Display name: add `mcp.octagonai.co → "Octagon AI"` to `PROVIDER_OVERRIDES` in `scripts/source-attribution.mjs` and bump `PROVIDER_IDENTITY_REVIEW` to the recomputed digest, exactly as the script's comment requires. Then `npm run sources:generate` regenerates `docs/source-attribution.mdx` and the sources page shows Octagon AI under Finance & Economics.
- Ordering rule from `CONTRIBUTING.md`: the manifest row and the preset land in the **same commit**; a row cannot precede the code that introduces its host.

---

## 4. Octagon-side deliverables (before the World Monitor PR)

| # | Repo | Change | Done when |
|---|---|---|---|
| O1 | octagon-remote-mcp | Bearer API-key fallback in `oauthMiddleware` (section 1.1), shared validator, tests, `X-Octagon-Key` optional | A `POST https://mcp.octagonai.co/sec/mcp` with `Authorization: Bearer sk_…`, an `initialize` then `tools/list` JSON-RPC body (what `scripts/probe-worldmonitor.mjs` sends) returns `octagon-sec-agent`; tests green; deployed |
| O2 | octagon-remote-mcp | Fix the stale "74 finance and business podcasts" count in the podcasts preset `instructions` (PR #28 removed it from the tool description only) | Live `initialize` on `/podcasts/mcp` carries no hard-coded show count |
| O3 | octagonai.co | Page `/docs/world-monitor/` (or a section on the integrations page): what the presets do, credits per refresh, create a dedicated key, revoke, link to World Monitor's MCP panel docs | Public URL usable in `authNote` and in the WM PR |
| O4 | octagonai.co | One-paragraph redistribution statement for the ledger (section 3) | Linked from the manifest `license` field |
| O5 | octagon-claude-plugin | Add the ten preset entries as data in `openai/profiles/*/plugin.config.json` under a new `worldmonitor` block (`defaultTool`, `defaultArgs`, `defaultTitle`, `icon`), and a `cli.mjs worldmonitor` command that emits the `MCP_PRESETS` snippet and the manifest row from the profiles | Generated snippet equals what we paste into the WM PR; drift is checkable with `--check` like the Grok/Gemini/Kimi catalogs |
| O6 | scratchpad → octagon-remote-mcp/scripts | A `probe-worldmonitor.mjs` that reproduces WM's liveness probe and then a keyed `tools/call` with each preset's `defaultArgs`, reporting latency and credits | Every default prompt answers in under 30 s with citations; run before each WM PR |

O5 keeps World Monitor in the same "profiles are the source of truth" model as the other four vendors. If a default prompt changes, it changes once.

---

## 5. The World Monitor PR, step by step

World Monitor's contribution flow is specific; follow it literally or CI rejects the PR.

1. **Fork and remotes** (their `CONTRIBUTING.md` wants `origin` = upstream, `fork` = ours, `pushDefault fork`):
   ```bash
   git clone https://github.com/OctagonAI/worldmonitor.git && cd worldmonitor
   git remote rename origin fork
   git remote add origin https://github.com/koala73/worldmonitor.git
   git config remote.pushDefault fork
   git fetch origin main
   git switch -c feature/octagon-mcp-presets origin/main
   ```
   Node 24 (`.nvmrc`), `npm install`.
2. **Open the issue** from the new-source template (section 2.1). Reference it in the PR.
3. **Edit `src/services/mcp-store.ts`**: paste the three (PR 1) preset objects from O5's generator after the Alpha Vantage entry, finance presets grouped together.
4. **Ledger**: `npm run sources:check` (expect `missing manifest entry for mcp.octagonai.co`), add the row, `PROVIDER_OVERRIDES` + digest bump, `npm run sources:generate`. Commit the manifest, the regenerated `docs/source-attribution.mdx`, and the preset in one commit.
5. **Docs**: the preset catalog is not documented per entry today; do not add a docs page unless asked. Mention in the PR body where the Octagon docs live (O3).
6. **Tests**:
   ```bash
   npm run typecheck
   node --test tests/mcp-presets.test.mjs
   LIVE_MCP_TESTS=1 node --test tests/mcp-presets.test.mjs   # our endpoints: 401 → pass as keyed
   npm run test:data
   ```
7. **Manual check** on `npm run dev` and `npm run dev:finance`: Connect MCP → Octagon preset → paste a key → panel renders the default prompt with citations; change the refresh interval; edit the prompt; confirm the key is not echoed anywhere in logs.
8. **PR template**: tick "New data source / feed" and "Config / Settings"; "Tested on worldmonitor.app variant" and the finance variant; "No API keys or secrets committed"; typecheck. Documentation Alignment and Bundle budget sections: N/A (presets are data, no bundle growth). Screenshots: the connect modal with the Octagon card and one rendered panel.
9. **PR body**: what Octagon is (one paragraph), why each preset is distinct from existing catalog entries, credits model and the `cache: true` default, the security note (dedicated key), link to the issue, link to O3.
10. **Expect** the `contributor-trust` workflow to label a first-time PR from `agodoy21` with a `trust:*` label; it is informational and gates nothing. Expect CodeRabbit-style review comments from maintainers on copy length and emoji choice; keep descriptions to one line.
11. **After merge**: the next weekly liveness run probes every preset's `serverUrl`. Add each preset endpoint (not just the origin) to our own uptime monitoring with the same semantics (unauthenticated POST must return 401 directly within 10 s) so a 500 on one scoped path never lands us in their auto-filed "MCP preset liveness" issue.

Trademark and license hygiene: we touch AGPL code only inside their repo; nothing from Octagon's proprietary code moves there. Never describe Octagon as "integrated with" or "partnered with" World Monitor in marketing without the maintainer's agreement; "available as a Quick Connect preset" is accurate.

---

## 6. Stretch: Octagon as a first-party data source

Only two Octagon datasets are feed-shaped enough to pass World Monitor's requirements (free tier, daily updates, geo-locatable or at least country-taggable), and both land on panels World Monitor already has:

| Candidate | Why it fits | What it would take |
|---|---|---|
| **Prediction-market model probabilities** | WM already seeds Kalshi and Polymarket (`scripts/_prediction-upstream.mjs`, 38 Kalshi references) and scores events by country. Octagon's recalibrated model probability and evidence grade add a "market vs model" column the panel does not have. | Proto field additions in `proto/worldmonitor/prediction/v1/`, a seeder calling `octagon-prediction-markets-agent` with `cache: true` on the events WM already tracks, Redis `seed-meta`, health key, manifest row for `api.octagonai.co`. Credits: cached reads are free, so the seeder costs nothing unless it generates. |
| **Most-discussed companies on finance podcasts** | A daily "podcast attention" ranking is a sentiment signal with no equivalent in the catalog; WM's finance variant has a market composite it could sit beside. | Daily seeder (`most-discussed` style prompt), small proto, a finance-variant panel. One credit per day. |

Both need a maintainer who wants them. Raise them in the PR 1 issue as "would you take these?" and only build on a yes. A no leaves presets as the integration, which is already the semantic the project uses for every other vendor.

---

## 7. Sequence and owners

| Week | Work | Owner |
|---|---|---|
| 1 | O1 server change, tests, deploy; O2; O6 probe | Andres |
| 1 | O3 docs page and O4 statement drafted; Ken reviews copy | Andres, Ken |
| 2 | O5 generator in the plugin repo; preset copy frozen for all ten | Andres |
| 2 | Open the WM new-source issue; fork; PR 1 (three presets + ledger row) | Andres |
| 3 | Respond to review; merge; verify the sources page and first liveness run | Andres |
| 3+ | PR 2 (seven specialists) if PR 1's reception supports it; otherwise the reduced set | Andres |
| later | Section 6 only on a maintainer yes | TBD |

---

## 8. Risks

- **Maintainer declines multiple presets.** Mitigated by the three-first sequencing and the fact that the proxy has no allowlist: every endpoint works by URL regardless.
- **Billing surprises.** A user sets a 60 s refresh on a 1-credit tool and burns 1,440 credits a day. Mitigate with window-bounded defaults, `cache: true` on PM, the docs page, and a sensible `refreshIntervalMs` suggestion in the PR (WM applies its own default; ask what it is in review and request 15 minutes for Octagon if it is lower).
- **Key exposure through a third-party proxy.** Inherent to WM's design; documented, dedicated-key guidance, `pk_` keys unusable on sensitive endpoints.
- **Liveness probe false alarms.** Our 401 passes today; if O1 ever changes the unauthenticated response to 403 or a redirect, keyed presets still pass on 403, but a redirect fails. Keep the unauthenticated POST a direct 401.
- **Terms review stalls.** `status: terms-review` is the default for every commercial API in their ledger; it does not block the listing, only the badge.

---

## 9. Reference

- World Monitor: `src/services/mcp-store.ts`, `src/components/McpConnectModal.ts`, `api/mcp-proxy.ts`, `tests/mcp-presets.test.mjs`, `.github/workflows/mcp-preset-liveness.yml`, `scripts/report-mcp-preset-liveness.mjs`, `shared/source-attribution-manifest.json`, `scripts/source-attribution.mjs`, `CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/new_data_source.yml`, `.github/pull_request_template.md`, `.agents/skills/add-data-source/SKILL.md`
- Sources page: https://www.worldmonitor.app/sources/ · Developer portal: https://www.worldmonitor.app/developers.md · MCP quickstart: https://www.worldmonitor.app/docs/mcp-quickstart
- Octagon: `octagon-remote-mcp/src/middleware.ts`, `src/auth.ts`, `src/mcp/toolsets.ts`, `src/index.ts`; plugin profiles under `octagon-claude-plugin/openai/profiles/`; strategy in `docs/CHATGPT_PLUGIN_STRATEGY.md`
