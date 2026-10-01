# Octagon → OpenAI Plugin Directory: Submission Plan (rev 3, packaging implemented)

**Goal:** List Octagon in the OpenAI plugin directory (ChatGPT + Codex) under Ken's OpenAI org. We ship one validated, reproducible ZIP, built by **additive, object-oriented tooling that changes nothing about the existing Claude plugin, its npm package, or the hosted MCP server's current behavior.**

**Sources** (read 2026-10-01): [Submission](https://developers.openai.com/plugins/deploy/submission), [Claude→OpenAI guide](https://developers.openai.com/plugins/guides/submit-claude-plugin), [Guidelines](https://developers.openai.com/plugins/plugin-guidelines), [MCP review](https://developers.openai.com/plugins/deploy/app-review), [Auth](https://developers.openai.com/plugins/build/auth), [Errors](https://developers.openai.com/plugins/deploy/submission-errors).

**Status:**
- **Done (this repo, steps 1–6 of §9):** packaging tooling, OpenAI content, brand assets, and 65 tests. The package builds with 0 errors, and all non-regression invariants pass.
- **Remaining:**
  - hosted-server PRs (§6), which need the server repo (A7)
  - account prerequisites (§4)
  - the ChatGPT dev-mode run and demo video (§7)
  - portal submission (§8)

**Design constraints carried from rev 2:**
- The build lives in `tools/`, not `scripts/` (which ships to npm).
- OpenAI skills live in `openai/skills/`.
- No source skill is edited.
- No tool renames.
- Server changes are env-gated.
- Zero new dependencies.

---

## 1. TL;DR

1. **Path:** "With MCP" submission. Hosted server `https://mcp.octagonai.co/mcp` + skills, in one ZIP.
2. **Package:** generated into `out/` by `tools/openai-plugin/`, a small OOP pipeline. It is declaratively configured from `openai/`, read-only on the Claude source, and deterministic.
3. **Remaining blockers:**
   1. `/.well-known/openai-apps-challenge` returns 404 on `mcp.octagonai.co`.
   2. No tool annotations on any of the 4 tools.
   3. We need a password-only reviewer account (unconfirmed).
   4. The demo video doesn't exist yet.
   - *Resolved:* square icons are now packaged, and the support URL uses `/contact/`, since `/support/` returns 404. Add a `/support/` page later if you prefer.
4. **Repo footprint:** only new files, plus **3 new keys in `package.json` `scripts`** and **1 line in `.gitignore`**.
5. **Hosted server footprint:** three small PRs. The challenge route and the annotations are purely additive. Result minimization ships behind a default-off flag.

---

## 2. Verified facts (drive every design decision)

### 2.1 Claude plugin repo: `OctagonAI/octagon-claude-plugin` @ `a6f66a9` (v0.1.2)

| Fact | Consequence |
|---|---|
| `tests/plugin-manifest.test.js` pins the **exact** set of `skills/*/SKILL.md` (69 names) | Don't add, remove or rename anything under `skills/`. OpenAI-only skills go in `openai/skills/` |
| The same test requires `stock-quote`, `analyst-estimates`, `price-target-consensus` and `sec-10q-analysis` to contain `server": "octagon-claude-plugin"` | Source skills stay byte-identical. Rewrites happen only on copies |
| The test pins `.claude-plugin/mcp.json` → `https://mcp.octagonagents.com/mcp` | Leave the Claude MCP URL alone. The OpenAI URL is configured separately |
| The test pins `validate:plugin`, `validate:all` and the `files` entries | New `package.json` scripts get new keys. Existing keys are untouched |
| `package.json` `files` = `.claude-plugin, agents, dist, hooks, scripts, skills` | New code goes in `tools/` and `openai/`, which aren't listed, so the **npm tarball stays identical** |
| `npm test` runs two named test files only | New tests in `tests/openai-plugin/` don't change `npm test`. They run via `npm run test:openai` |
| `tsconfig.json` `include: ["src/**/*"]` | Tooling is **ESM `.mjs` + `// @ts-check` + JSDoc**, so `tsc` and the build are untouched |
| `engines.node >= 18`, CI on Node 20 | Use only `node:fs/promises`, `node:test`, `node:crypto`, global `fetch`. No `import.meta.dirname` |
| Every SKILL.md frontmatter is exactly `name:` + `description:`, single-line, LF | A strict minimal frontmatter codec is safe with **zero deps**. It fails loudly on anything else |
| 66 skills hold setup text under `## Prerequisites`, plus `references/mcp-setup.md` (npx/API key/Claude Desktop) | The transform targets are known and finite |
| `skills/octagon-analyst-master/` exists only as an empty, untracked local directory (it isn't in git) | Nothing to do. The catalog reports directories without a SKILL.md as `incomplete` and never ships them |
| `agents/` and `hooks/` are Claude-only (hooks block OpenAI submission) | Not copied to the OpenAI package. They stay in place for Claude |

### 2.2 Hosted MCP (live probe)

| Probe | Result |
|---|---|
| `POST https://mcp.octagonai.co/mcp`, no token | `401` + a correct `WWW-Authenticate: Bearer resource_metadata=…` ✅ |
| Protected-resource metadata | `resource: https://mcp.octagonai.co/mcp`, AS `https://login.octagonai.co` ✅ |
| `mcp.octagonagents.com` | Advertises `resource = mcp.octagonai.co` (a mismatch), so **submit the `octagonai.co` origin**. The origin is permanent once published |
| AS metadata | PKCE S256, DCR, `openid email profile offline_access`, `userinfo_endpoint`, `none` auth ✅. No RFC 9207 or CIMD (optional) |
| `/.well-known/openai-apps-challenge` | **404** |
| Source location | **Not in any local checkout.** `octagon-mcp-server` is the stdio build, and `octagonai.co` is the marketing site. **Action: identify the hosted service's repo and deploy target** |

### 2.3 Listing URLs
`www.octagonai.co/` 200 · `/privacy/` 200 · `/terms-of-service/` 200 · `/support/` **404** (`/contact/` 200).

---

## 3. Non-regression contract

Every invariant has an owning check. All of them were green when this was implemented (2026-10-01).

| # | Invariant | Enforced by | Status |
|---|---|---|---|
| I1 | Existing `npm test` passes unchanged | `npm test` (script untouched) | ✅ 22/22 |
| I2 | `claude plugin validate .` passes. `openai/` and `tools/` aren't Claude auto-discovery roots | `npm run validate:plugin` | ✅ |
| I3 | Nothing new ships in the npm package | `tests/openai-plugin/npm-pack.test.mjs`. Also checked by hand against `main`: same 354 files; only `package.json` differs (+3 script keys) | ✅ |
| I4 | The build never modifies source. Inside the repo, output may only go under `out/` | `PackageWriter` refuses any output dir that overlaps a top-level repo entry or contains the repo (`writer.test.mjs`) + `pipeline.test.mjs` (SHA-256 of `skills/`, `agents/`, `hooks/`, `.claude-plugin/`, `openai/` before and after) | ✅ |
| I5 | Modified tracked files: only `package.json` (+3 `scripts` keys) and `.gitignore` (+`out/`) | `git diff --stat` | ✅ |
| I6 | Builds are reproducible: byte-identical ZIP | `pipeline.test.mjs` builds twice and compares SHA-256 | ✅ |
| I7 | Hosted server: with new env vars unset, responses are byte-identical | Server PR tests (§6) | ⏳ server repo needed (A7) |
| I8 | No new dependencies; `package-lock.json` untouched | `git diff --exit-code package-lock.json` | ✅ |

---

## 4. Account prerequisites (Ken, start now)

| # | Action | Done when |
|---|---|---|
| A1 | Choose the owning org + project (Octagon company org) | Agreed |
| A2 | **Business verification** in the legal name. This becomes the directory developer name (`developer_name_defaulted`) | Verified |
| A3 | Grant Andres **Apps Management Write**, or Ken uploads | Andres sees Plugins → Upload |
| A4 | **Reviewer account:** email + password, **no MFA, magic link or email/SMS code**, credits for about 20 full test runs, sample data only | Logs in from incognito with only email + password |
| A5 | Written confirmation that our data licenses allow serving through ChatGPT/Codex | Written OK |
| A6 | Launch countries: `["US"]` (current config) vs `[]` (all) | Decision |
| A7 | Name the **hosted MCP repo + owner** (§2.2) | Repo URL known |

---

## 5. Repository design: OpenAI packaging (as built)

### 5.1 Footprint

```
octagon-claude-plugin/
├── openai/                                   NEW · declarative inputs (no code)
│   ├── README.md                             how to build, validate, and change content
│   ├── SUBMISSION_PLAN.md                    this document
│   ├── plugin.config.json                    listing, review cases, publication, MCP URL + tool names, version
│   ├── transform.config.json                 exclusions, file removals, section rewrites, substitutions,
│   │                                         per-skill compliance edits, forbidden-text guards
│   ├── assets/{logo.png,icon.png}            512² / 128² square mark from the Octagon brand asset
│   └── skills/                               OpenAI-authored skills (used as-is)
│       ├── get-started/SKILL.md              onboarding skill (manifest onboardingSkill)
│       ├── octagon-research-router/SKILL.md  converted from agents/octagon-mcp-specialist.md
│       └── octagon-status/SKILL.md           provider-neutral override of the Claude version
├── tools/openai-plugin/                      NEW · ESM + JSDoc (strict tsc-clean), zero dependencies
│   ├── cli.mjs                               `build` / `validate` [--online] [--out DIR]
│   └── lib/                                  see §5.2
├── tests/openai-plugin/                      NEW · 65 node:test cases (`npm run test:openai`)
├── out/                                      gitignored build output
├── package.json                              EDIT · +build:openai, +validate:openai, +test:openai
└── .gitignore                                EDIT · +out/
```

### 5.2 Object model

```
tools/openai-plugin/lib/
├── createBuild.mjs              composition root: wires every collaborator from the repo layout
├── BuildPipeline.mjs            catalog → manifest → stage → validate → zip → validate → report
├── errors.mjs                   PackagingError ⊃ ConfigError, SkillError, OutputError
├── config/
│   ├── PluginConfig.mjs         frozen value object; structural checks at load
│   ├── TransformConfig.mjs      frozen value object; builds the TransformPipeline
│   └── validate.mjs             Checker: collects every config problem, then reports them together
├── source/SkillRepository.mjs   read-only view of a skills/ dir (used for both source and overlay)
├── skill/
│   ├── FrontMatter.mjs          strict flat-YAML codec; quotes when YAML would misread a value
│   ├── SkillDocument.mjs        immutable {name, frontMatter, body, files}; mapText(), withoutFiles()
│   └── markdown.mjs             fence-aware replaceSection() and relativeLinks()
├── transform/
│   ├── SkillTransform.mjs       abstract base: pure apply(doc) → doc
│   ├── RemoveFiles.mjs          drop companion files (README.md, references/mcp-setup.md)
│   ├── ReplaceSection.mjs       rewrite or remove a heading-scoped section (strict mode available)
│   ├── ReplaceText.mjs          literal or regex substitution across body/description/references
│   ├── ScopedTransform.mjs      apply to `only` / `except` named skills
│   └── TransformPipeline.mjs    composite: ordered reduce
├── catalog/SkillCatalog.mjs     (source − excluded) → transformed, then merged with the overlay; consistency checks
├── manifest/ManifestBuilder.mjs PluginConfig → .codex-plugin/plugin.json + .mcp.json (pure)
├── output/
│   ├── PackageWriter.mjs        the only writer: confined to the staging dir; refuses output overlapping source; fixed mtime/mode
│   └── Archiver.mjs             reproducible zip (sorted list, -X -D, TZ=UTC) + inspect via unzip -Z1
└── validation/
    ├── Finding.mjs, Rule.mjs, Validator.mjs (ValidationReport), PackageView.mjs
    ├── support/{imageInfo,contrast,text}.mjs
    └── rules/                   ManifestShape · ListingText · Url (--online) · Image · BrandColor · Skill ·
                                 LinkIntegrity · ReviewCases · ForbiddenContent · ForbiddenText ·
                                 SecretScan · ArchiveShape   (registered in rules/index.mjs)
```

**Design rules:**
- **Single responsibility.** One writer (`PackageWriter`). One opt-in network user (`UrlRule --online`). Transforms and the manifest builder are pure; the repository, catalog and rules only read.
- **Open/closed.** A new check is a new `Rule` subclass registered in `rules/index.mjs`. A new rewrite is usually just config; otherwise it's a new `SkillTransform`.
- **Dependency injection.** `BuildPipeline` receives every collaborator. Tests use temp dirs and fakes (for example, an injected `fetcher` for `UrlRule`).
- **Immutability.** Config objects are deep-frozen. `SkillDocument` is frozen, and transforms return new instances.
- **Strict where drift matters.** Global rules apply wherever they match. **Per-skill edits fail the build when they stop matching**, so an upstream skill change can never silently skip a compliance rewrite. `ForbiddenTextRule` is the final guard on shipped text.
- **Validate the artifact.** Rules inspect the staged bytes (`PackageView`), then the ZIP (`ArchiveShapeRule` checks parity with staging). Findings carry the portal error code where one exists.

### 5.3 Transform order

1. `RemoveFiles`: per-skill `README.md` (GitHub install docs) and `references/mcp-setup.md` (npx/API-key setup).
2. **Per-skill edits** (strict, run against the original upstream text):
   - **`prediction-markets-analysis`**:
     - Reframes the skill as research and adds an explicit "no trades/bets/allocation" instruction.
     - Removes the "Recommendation Framework" (signal matrix and position sizing) and the sports example.
     - Neutralizes buy/sell and trading language.
   - **`price-target-consensus`, `stock-price-change`:** remove the position-sizing sections.
   - **`price-target-summary`, `stock-grades`, `financial-health-scores`, `stock-performance`:** replace buy/avoid recommendations with descriptive interpretations.
3. Global `## Prerequisites` rewrite to provider-neutral connection guidance. It skips skills with their own override.
4. Global substitutions: "Octagon Claude plugin" → "Octagon"; drop the `"server": "octagon-claude-plugin"` line from call examples.

General research framing ("investment decisions", "trading signals" as market descriptors, analyst rating labels) is intentionally kept. If review flags it, the fix is a config entry.

### 5.4 Build result (2026-10-01)

| Metric | Value |
|---|---|
| Skills shipped | **69**: 66 converted, 2 added (`get-started`, `octagon-research-router`), 1 overridden (`octagon-status`) |
| Excluded | `octagon-api-smoke-test`, `octagon-setup` (Claude-specific) |
| Package | 204 files, about 500 KB zipped. SHA-256 `84a5d940…` is identical across rebuilds and from a fresh clone |
| Validation | **0 errors**, 1 warning (`demo_recording_url` pending), `--online` URL checks all 2xx |

### 5.5 Generated manifest (`.codex-plugin/plugin.json`)

- **Identity:** `name` `octagon-ai`, `version` `1.0.0`, `author` Octagon AI / `contact@octagonai.co` (the published contact address).
- **Listing:** `displayName` "Octagon AI" · `shortDescription` "Cited stock & market research" · `category` "Finance" (confirm in the dashboard) · 5 capabilities · 3 starter prompts.
- **URLs:** website `/`, support **`/contact/`** (because `/support/` returns 404), privacy `/privacy/`, terms `/terms-of-service/`.
- **Brand colors:**
  - `brandColor` `#7A68AE`: 4.75:1 against white.
  - `brandColorDark` `#9E8DC3`: the wordmark color, 5.41:1 against `#212121`.
- **Not included:** no `screenshots` (no custom UI) and no `repository` (it would show the Claude repo name on the listing).
- **`.mcp.json`:** exactly one server, `octagon` → `https://mcp.octagonai.co/mcp`.

### 5.6 Tests (`npm run test:openai`): 65 passing

| Suite | Covers |
|---|---|
| `frontmatter.test.mjs` | Byte-exact round trip of all 69 real skill headers; quoting; rejection of unsupported YAML |
| `markdown.test.mjs` | Section rewrite/removal, fenced-code safety, link extraction |
| `transforms.test.mjs` | Immutability, scoping, literal `$` handling, strict failures, idempotence, override precedence, config errors |
| `catalog.test.mjs` | Merge/override/exclude semantics, junk-file skipping, consistency errors |
| `manifest.test.mjs` | Exact manifest output, omitted extension, deep freeze, config rejection |
| `rules.test.mjs` | A valid fixture passes every rule; 24 targeted failures each assert their rule fires (9 also assert the portal error code) |
| `support.test.mjs` | PNG/JPEG/SVG dimension parsing; WCAG contrast |
| `writer.test.mjs` | Overlap/containment guards (including the real repo layout), traversal guards, seal() normalization |
| `pipeline.test.mjs` | End-to-end build of the real repo: valid, reproducible, source untouched, expected catalog |
| `npm-pack.test.mjs` | No `openai/`, `tools/`, `out/` or `tests/` files in the npm tarball |

---

## 6. Hosted MCP server changes (separate repo, A7)

Three independent PRs, each reversible. With the env vars unset, behavior is byte-identical (I7).

### PR-S1: Domain-verification route (blocker, purely additive)
- `ChallengeController.get('/.well-known/openai-apps-challenge')` serves `process.env.OPENAI_APPS_CHALLENGE`: `text/plain`, exact bytes, no newline, `Cache-Control: no-store`.
- When unset, it returns **404**, which is the same as today.
- Mount it **before** the auth middleware. Tests cover set, unset, and exact body bytes.

### PR-S2: Tool annotations (blocker, metadata-only)
- Move from the 4-arg `server.tool(name, desc, schema, cb)` to the SDK overload that takes annotations (`server.tool(name, desc, schema, annotations, cb)` or `registerTool(name, {description, inputSchema, annotations}, cb)`).
- **Names, input schemas, descriptions and handlers stay unchanged.**
- Keep the annotations in one `TOOL_ANNOTATIONS` map so they can be reviewed and tested.

| Tool | readOnly | destructive | openWorld | Portal justification |
|---|---|---|---|---|
| `octagon-agent` | true | false | true | Retrieves and summarizes public-company financial data, filings and transcripts. It doesn't modify user or external state. Open-world because it covers arbitrary public companies |
| `octagon-deep-research-agent` | true* | false | true | Builds a cited report from public sources and changes nothing |
| `octagon-prediction-markets-agent` | true | false | true | Analyzes public prediction-market events. It can't place orders |
| `prediction_markets_history` | true | false | true | Returns historical public market data only |

\* If deep research queues a persisted job the user can come back to, the guideline requires `readOnlyHint: false`. Confirm before shipping.

- Test: snapshot of `tools/list`. The only diff is the added `annotations` objects.
- Apply the same map to `octagon-mcp-server` (stdio) later for parity. That's optional and out of the critical path.

### PR-S3: Response minimization (behind a default-off flag)
- Add a `ResultSanitizer` class with a field **allowlist** at the single result boundary (e.g. `createToolResult`): `text`, `conversation` (the continuity handle), and citations.
- It drops `responseId`, `rawMetadata` and any trace or timestamp fields from `content` and `structuredContent`.
- Gate: `MCP_RESULT_MINIMIZE=1`. **Default off**, so today's output is unchanged.
- Rollout:
  1. Turn it on in staging.
  2. Run the Claude plugin smoke flows and §7 test cases. Today nothing in `skills/` or `agents/` references `responseId` or `rawMetadata`; this was grep-verified.
  3. Turn it on in prod before the OpenAI scan.

### Auth config (no code)
| Item | Required | Action |
|---|---|---|
| Allowlist the redirect URI the portal shows (`https://chatgpt.com/connector/oauth/{callback_id}`) | Yes | IdP config |
| UserInfo returns `email` + `email_verified: true` | Yes | `curl -H "Authorization: Bearer $T" https://login.octagonai.co/oauth2/userinfo` |
| Token audience = `https://mcp.octagonai.co/mcp`; reject other audiences | Yes | Verify the validator |
| RFC 9207 `iss` + `authorization_response_iss_parameter_supported` (stable redirect) | Optional | v1.1 |
| CIMD, `id_token_hint` | Optional | v1.1 |

**Content checks outside code:**
- `/privacy/` discloses account email, prompts and their retention, conversation IDs, usage metering and subprocessors.
- Out-of-credit tool errors are informational with a plans link, with no promotional copy.

---

## 7. Review packet

Lives in `openai/plugin.config.json`. Run every case with the reviewer account first.

### 7.1 Positive (exactly 5)
| # | prompt | tools_triggered | expected_behavior |
|---|---|---|---|
| P1 | "Summarize the top five risk factors in NVIDIA's most recent 10-K." | `octagon-agent` | Five risk factors from the latest 10-K, with filing date and citation; none invented |
| P2 | "What forward guidance did Microsoft management give on its most recent earnings call?" | `octagon-agent` | Guidance with the quarter identified and quotes attributed to named executives, cited to the transcript |
| P3 | "Show Apple's revenue, net income and free cash flow for the last three fiscal years in a table." | `octagon-agent` | Three-year table with fiscal-year labels and units, cited, consistent with filings |
| P4 | "What's driving the current odds on the next FOMC rate decision market, and how have they moved over the past month?" | `octagon-prediction-markets-agent, prediction_markets_history` | Implied probability, history summary, cited drivers; analysis only, no betting suggestion |
| P5 | "Write a short cited research brief on the competitive landscape for AI data-center accelerators." | `octagon-deep-research-agent` | Structured brief naming the main competitors with sources; completes within the tool timeout |

### 7.2 Negative (exactly 3)
| # | description (incl. expected) | prompt |
|---|---|---|
| N1 | Trade/bet execution is out of scope. Declines, offers research, attempts no order | "Buy 100 shares of NVDA for me and put $50 on the Fed-cut market." |
| N2 | Personalized advice. No yes/no; offers objective research and suggests a licensed advisor | "I'm 60 and retiring next year. Should I move my whole 401(k) into Tesla? Just say yes or no." |
| N3 | Off-topic. Octagon tools aren't invoked | "What's the weather in Chicago tomorrow?" |

### 7.3 Demo video and credentials
- **Video:** 3–6 minutes, unlisted, plays logged-out. Shows the OAuth connect, then P1–P5, then N1–N3, and opens a citation. Recorded in ChatGPT developer mode against the exact ZIP and server being submitted.
- **Credentials:** entered **only** in the portal's Review details. Never in the ZIP (`test_credentials` is rejected), the repo or Slack. Keep the account alive permanently, because daily rescans and future reviews reuse it.

---

## 8. Portal runbook (Ken, or Andres with A3)

1. Plugins → **Upload new or existing plugin** → verified Developer identity → upload `out/octagon-ai-openai-1.0.0.zip`.
2. **Metadata & Skills:** **Copy issues**. Each one becomes a config fix, or a new `Rule` so it can never recur. Rebuild, then **Upload plugin to fix issues**.
3. **MCPs → octagon → Connect:**
   1. Confirm the URL `https://mcp.octagonai.co/mcp` and OAuth via DCR.
   2. Set `OPENAI_APPS_CHALLENGE` from the portal token and redeploy (PR-S1).
   3. Allowlist the displayed redirect URI.
   4. Complete OAuth and wait for the tool scan.
   5. Paste the §6 justifications.
4. **Review details:** confirm the imported cases, video and notes. Enter the credentials, then **Save details**.
5. **Submit for review:** Ken completes the attestations. Feedback arrives by email; appeal by replying to it.
6. On approval, Ken chooses when to **Publish plugin**.

**After publication:**
- Server changes are picked up by the daily scan, or immediately with **Rescan**.
- Skill or metadata changes need a bumped `version` in `openai/plugin.config.json`, a rebuild, and an upload with the same `name`.
- Never change the MCP origin.

---

## 9. Execution order and PR slicing

| Step | Deliverable | Gate | Status |
|---|---|---|---|
| 1 | Branch `feat/openai-plugin-packaging` from fresh `main` | n/a | ✅ |
| 2 | Core: `FrontMatter`, `SkillDocument`, `SkillRepository`, transforms, catalog + unit tests | `test:openai`, `npm test` | ✅ |
| 3 | `ManifestBuilder`, `PackageWriter`, `Archiver`, `BuildPipeline`, `cli.mjs` + reproducibility/immutability tests | I4, I6 | ✅ |
| 4 | `Validator` + 12 rules + rule tests | Every rule has a pass and a fail fixture | ✅ |
| 5 | `openai/` content: configs, assets, 3 skills, review cases | `validate:openai` (online) → 0 errors | ✅ (1 warning: video) |
| 6 | `package.json`/`.gitignore` edits; npm tarball check | I3, I5, I8, `validate:plugin` | ✅ |
| 7 | Hosted server PR-S1, S2 → deploy; PR-S3 flag on in staging → prod | I7 snapshots | ⏳ needs A7 |
| 8 | ChatGPT dev-mode run of §7, then record the video and set `review.demo_recording_url` | All 8 cases behave as specified | ⏳ |
| 9 | Portal upload → fix loop → submit | Portal shows 0 Issues | ⏳ |

Optionally, add `npm run test:openai && npm run build:openai` later as a **new, separate** CI job, leaving the existing `validate` job untouched.

---

## 10. Risk register

| Risk | Mitigation |
|---|---|
| The reviewer login needs MFA or a magic link (rejection) | A4 password-only tenant |
| Prediction markets read as gambling | Research-only framing enforced by strict per-skill edits + `ForbiddenTextRule`; N1; no Kalshi referral links |
| Financial-advice concerns | N2; limits stated in `get-started` and the long description; position-sizing and buy/sell guidance removed |
| Deep-research latency exceeds the ChatGPT timeout | Measure p95 before recording; shorten P5 scope if needed |
| An upstream skill change silently undoes a rewrite | Per-skill edits are strict (the build fails when they stop matching); forbidden-text guards on output |
| The hosted server repo is unknown (A7) | Blocks steps 7–9 only |
| 66+ skills generate many portal findings | Each finding becomes a config edit or a new `Rule`. Fallback: ship a curated core via `excludeSkills` |
| Wrong origin locked in | `mcp.octagonai.co`, pinned in config and asserted by `pipeline.test.mjs` |

---

## 11. Definition of done
- [x] I1–I6, I8 green
- [x] `npm run build:openai` and `npm run validate:openai`: 0 errors (1 warning until the video exists)
- [ ] I7 (hosted server PRs)
- [ ] Portal: 0 issues in Metadata & Skills and in MCPs; domain verified; OAuth works for a fresh ChatGPT user
- [ ] 5/3 cases pass with the reviewer account; the video plays logged-out
- [ ] Submitted by Ken → approved → published

---

## Appendix: Slack reply to Ken
> On it. Since the org is yours, I need from you:
> 1. Business verification for Octagon in OpenAI org settings, plus **Apps Management Write** for me (or you click upload).
> 2. A reviewer test account with **email + password, no MFA or magic link**, and credits loaded.
> 3. Launch countries (US only to start?) and confirmation our data licenses cover ChatGPT/Codex.
> 4. Who owns the repo for the hosted MCP at mcp.octagonai.co. It needs a small verification route and tool annotations.
>
> I'm building the OpenAI package as an add-on to the Claude plugin repo. Nothing in the existing Claude plugin or npm package changes. I'll send the validated ZIP when it's clean.
