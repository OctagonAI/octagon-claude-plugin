# Octagon on the Gemini CLI extension gallery

Plan for shipping both Octagon plugins — **Octagon AI** (public markets) and
**Octagon Prediction Markets** — as Gemini CLI extensions listed in the
geminicli.com gallery, from the same source and packaging tool that produce the
OpenAI and Grok packages, without changing either of those outputs.

Verified against the public record on 2026-11-02: the Gemini CLI extension
docs (reference, releasing, writing, best practices, MCP servers), the live
gallery registry (`geminicli.com/extensions.json`), the Gemini CLI source for
MCP transport selection, three gallery-indexing bug reports, Google's Gemini
CLI → Antigravity CLI transition notices, and a live probe of our own OAuth
discovery metadata.

---

## 0. Decisions, up front

| Decision | Choice | Why |
|---|---|---|
| Unit of distribution | **One public GitHub repository per extension**, `OctagonAI/octagon-ai-gemini-extension` and `OctagonAI/octagon-prediction-markets-gemini-extension` | The gallery crawler keys a listing on a repository with the `gemini-cli-extension` topic and a `gemini-extension.json` at the **repository root**. One repo cannot carry two listings; a subdirectory is not a listing |
| Source of truth | The monorepo (`octagon-claude-plugin`) generates each extension into `gemini/extensions/<name>/` with a new `gemini` target in `tools/openai-plugin`; a GitHub Actions workflow mirrors each directory to its repo and cuts a GitHub Release | The two mirror repos hold no hand-written content; skills, copy, and versions stay in lockstep with the OpenAI and Grok packages, and CI drift-checks the generated directories exactly as it does for `grok/plugins/` |
| Transport and auth | Remote Streamable HTTP: `"url": "https://mcp.octagonai.co/…", "type": "http", "oauth": { "enabled": true }`; no `settings`, no API keys | `httpUrl` is deprecated in current Gemini CLI (warning on every start; a gallery bug report suspects the crawler rejects it). Our server already serves RFC 9728 protected-resource metadata and `login.octagonai.co` publishes authorization-server metadata with dynamic client registration and PKCE S256, which is the exact path Gemini CLI's automatic OAuth discovery follows (verified live, §1.3) |
| Tool scope of the public-markets extension | `includeTools: ["octagon-agent", "octagon-deep-research-agent"]` on the `/mcp` server | Gemini CLI has a per-server client-side allow-list; the public-markets extension therefore shows exactly the public-market tools even though `/mcp` also serves the prediction-market tools. This is the client-side filter the Grok plan could not have (§11 there) |
| Components shipped | `gemini-extension.json`, `GEMINI.md` context file, `skills/` (the same built catalogs: 68 and 7), `README.md`, `LICENSE`. **No** commands, hooks, agents, policies, themes, or executables | Least privilege, nothing for a user to trust beyond one remote server, and the same security posture as the Grok packages. `GEMINI.md` is the one new piece of content: Gemini CLI loads it every session, so it carries the routing and citation rules in ≤ 250 words |
| Versioning and updates | Manifest `version` = the profile's `plugin.config.json` version; each mirror push that changes the version also tags `v<version>` and publishes a GitHub Release whose archive has the manifest at its root | Gemini CLI detects updates from the latest GitHub Release tag (not the manifest), displays the manifest version, and the docs require the two to match. Release archives install faster than clones |
| Antigravity CLI | Served by the **same repos**: `agy plugin install <repo url>` installs a Gemini CLI extension as an Antigravity plugin, provided it has no local MCP server (ours are remote). A native Antigravity plugin layout is a later target, not part of this plan | Since 2026-06-18 free, AI Pro, and AI Ultra accounts use Antigravity CLI; Gemini CLI continues for Gemini Code Assist Standard/Enterprise and paid API users. One repo reaches both |

---

## 1. The Gemini CLI extension surface, in facts

### 1.1 What an extension is

A directory with `gemini-extension.json` at its root and any of: `GEMINI.md`
(context loaded every session), `skills/<name>/SKILL.md`, `commands/*.toml`,
`hooks/hooks.json`, `agents/*.md`, `policies/*.toml`, themes. Manifest fields:
`name` (lowercase letters, digits, dashes; must equal the directory name),
`version`, `description` (shown in the gallery), `mcpServers` (every
`settings.json` server option except `trust`), `contextFileName`,
`excludeTools`, `settings` (user-supplied env vars, keychain-stored when
`sensitive`), `migratedTo`. Users install with
`gemini extensions install <github url | path>` and update with
`gemini extensions update`; `gemini extensions link <dir>` symlinks a working
copy for development; `gemini extensions validate <dir>` checks the manifest,
context file paths, semver, and MCP configuration.

### 1.2 How the gallery lists an extension

No form, no PR, no review queue. A daily crawler indexes every **public GitHub
repository** that carries the topic **`gemini-cli-extension`** and has
`gemini-extension.json` at the root of the repository (or of the latest release
archive), "if it passes validation". The registry (`extensions.json`) records
per repo: `extensionName`, `extensionVersion`, `extensionDescription`, the
GitHub `repoDescription`, `stars`, `rank`, `licenseKey`, and booleans `hasMCP`,
`hasContext`, `hasSkills`, `hasHooks`, `hasCustomCommands`. So the listing's
copy is the manifest `description` plus the repository's About description, its
ranking is star-driven, and a detected license matters.

Three 2026 bug reports (gemini-cli #27707, #27838, #28890) describe valid,
locally-validating extensions that never appeared; Google's triage points at
crawler validation being stricter than `gemini extensions validate`, with the
deprecated `httpUrl` field and a schema gap around newer MCP options as
suspects. §8 turns that into a checklist.

### 1.3 Remote MCP with OAuth, as Gemini CLI does it

For a server declared with `url` + `type: "http"`: the first request returns
401 → the client reads `WWW-Authenticate: Bearer resource_metadata=…` →
fetches the protected-resource metadata → follows `authorization_servers` →
reads the authorization-server metadata → registers a client dynamically →
opens the browser (PKCE) → stores tokens in `~/.gemini/mcp-oauth-tokens.json`.
`/mcp auth <server>` re-runs it. RFC 9207: when the authorization server
metadata does not declare `authorization_response_iss_parameter_supported`,
callbacks without `iss` are accepted.

**Our side, probed live on 2026-11-02:**

| Step | What we serve | Status |
|---|---|---|
| 401 challenge | `WWW-Authenticate: Bearer resource_metadata="https://mcp.octagonai.co/.well-known/oauth-protected-resource/prediction-markets/mcp"` | ✅ |
| Protected-resource metadata (RFC 9728, per path) | `resource`, `authorization_servers: ["https://login.octagonai.co"]`, `scopes_supported` | ✅ |
| Authorization-server metadata | `issuer`, `authorization_endpoint`, `token_endpoint`, `registration_endpoint` (DCR), `code_challenge_methods_supported: ["S256"]`, `token_endpoint_auth_methods_supported` includes `none`, `grant_types` include `authorization_code` + `refresh_token` | ✅ |
| `authorization_response_iss_parameter_supported` | Not declared → Gemini CLI accepts callbacks without `iss` | ✅ (confirm in §8) |
| Headless use | OAuth needs a local browser; our API-key form puts the key in the URL path (`/:apiKey/mcp`), which an extension cannot parameterize | ⚠️ documented limitation; optional server follow-up in §11 |

Gemini CLI asks the user to confirm each MCP tool call unless the server is
trusted, and extensions may not set `trust`. Every Octagon tool is read-only,
so confirmations are a one-click "always allow" for the user; `GEMINI.md` says
so.

### 1.4 Who uses Gemini CLI now

On 2026-06-18 Google moved free, Google AI Pro, and Google AI Ultra accounts
from Gemini CLI to **Antigravity CLI** (`agy`). Gemini CLI remains the client
for Gemini Code Assist Standard/Enterprise organizations and paid Gemini API
keys, and the gallery (~1,500 entries) is still its discovery surface.
Antigravity CLI imports Gemini CLI extensions (`agy plugin import gemini`) and
installs them directly from a repo URL (`agy plugin install <url>`) when they
contain no local MCP server; it converts `GEMINI.md` into a rule, keeps
`skills/`, and migrates `mcpServers` into `mcp_config.json`. The repos this
plan creates therefore serve both populations without a second format.

### 1.5 How this differs from the OpenAI and Grok submissions

| | OpenAI directory | Grok Build marketplace | Gemini CLI gallery |
|---|---|---|---|
| Submission | ZIP upload, portal review | PR to xAI's catalog, code-owner review | None: topic + root manifest, daily crawl |
| Manifest | `.codex-plugin/plugin.json` | `.grok-plugin/plugin.json` + `.mcp.json` | `gemini-extension.json` (MCP inline) |
| Listing copy | Portal `interface` fields | Catalog `description` | Manifest `description` + repo About description |
| Repo shape | n/a | Subdirectory of the monorepo by `source.path` | **Own repository per extension** |
| Updates | New version upload | SHA bump (xAI bot) | GitHub Release tag `v<version>` |
| Client-side tool filter | None | None | `includeTools` per server |
| Always-on context | None | None | `GEMINI.md` |

---

## 2. Requirements checklist, mapped

| Requirement | Status for Octagon | Work |
|---|---|---|
| Public GitHub repository per extension | None exist | §5 mirror repos (needs org repo creation) |
| `gemini-cli-extension` topic on each repo | — | Set once in each repo's About (§6) |
| `gemini-extension.json` at repo root; `name` matches directory; semver `version` | Generated by the `gemini` target | §4 |
| Non-deprecated MCP config (`url` + `type: "http"`), HTTPS, OAuth discovery | Server verified (§1.3) | Manifest rule enforces it |
| Detected license | MIT `LICENSE` copied into each package | `LicenseRule` (reused) |
| Repo About description (gallery `repoDescription`) | — | Set from the profile description in §6; the publish workflow asserts it |
| GitHub Release tagged `v<version>` with manifest at archive root | — | Publish workflow (§5) |
| Passes `gemini extensions validate` and installs with `gemini extensions install` | — | Smoke test (§8) |
| Works in Antigravity CLI (`agy plugin install`) | Remote-only MCP qualifies | Smoke test (§8) |

---

## 3. Package design

```
gemini/extensions/octagon-prediction-markets/      (committed, generated)
├── gemini-extension.json
├── GEMINI.md
├── LICENSE
├── README.md
└── skills/
    ├── event-brief/SKILL.md
    ├── get-started/SKILL.md
    ├── mispricing-analysis/SKILL.md
    ├── octagon-status/SKILL.md
    ├── prediction-markets-analysis/SKILL.md
    ├── probability-history/SKILL.md
    └── trust-score/SKILL.md
```

### 3.1 `gemini-extension.json`

```json
{
  "name": "octagon-prediction-markets",
  "version": "1.0.0",
  "description": "Cited research on Kalshi and Polymarket prediction markets: event odds, what moves them, probability history, Trust Scores, and where the market-implied probability diverges from Octagon's research-adjusted model estimate.",
  "contextFileName": "GEMINI.md",
  "mcpServers": {
    "octagon-predictions": {
      "url": "https://mcp.octagonai.co/prediction-markets/mcp",
      "type": "http",
      "oauth": { "enabled": true },
      "timeout": 600000
    }
  }
}
```

And for the public-markets extension, the server block adds the allow-list:

```json
"octagon": {
  "url": "https://mcp.octagonai.co/mcp",
  "type": "http",
  "oauth": { "enabled": true },
  "includeTools": ["octagon-agent", "octagon-deep-research-agent"],
  "timeout": 600000
}
```

Fields are limited to what the reference documents. `timeout` is explicit
because report generation can run for minutes and the documented default is
already 10 minutes; stating it keeps the behavior visible to a reviewer.
`settings` is omitted on purpose: nothing is read from the user's environment.

### 3.2 `GEMINI.md` (generated, ≤ 250 words)

Loaded into every session, so it is short and operational:

1. One sentence on what the extension is and who it is for.
2. The tools by name and what each returns; "answers cite their sources, keep
   every citation".
3. Sign-in: tools return 401 until `/mcp auth <server>` has run once; the
   browser opens `login.octagonai.co`.
4. Scope: research only; no trades, wagers, funds, or personalized advice.
5. Routing: public-markets extension says "for Kalshi or Polymarket questions,
   suggest the `octagon-prediction-markets` extension"; the prediction-markets
   extension says the reverse for filings and financials.
6. Tool confirmations: every tool is read-only, so "always allow" is safe.

Generated from `plugin.config.json` (description, tool list, scope note) plus a
per-profile `gemini.contextNotes` list, so it cannot drift from the manifest.

### 3.3 `README.md` (generated)

The reviewer-facing README from the Grok target, retargeted: what it does,
components (skills, one remote server), endpoints, credentials (OAuth, no
keys), install (`gemini extensions install https://github.com/OctagonAI/…`,
`agy plugin install …`, and `gemini extensions link` for a checkout), smoke
prompts, every skill with its description, scope, license and support. The
README also says the repository is a generated mirror and points at the
monorepo for issues.

### 3.4 Why no commands, hooks, or policies

Commands would duplicate skills (Antigravity converts them to skills anyway);
hooks and policies would widen the security surface for no capability we
need; `excludeTools` at the extension level is for restricting built-in tools
like `run_shell_command`, which we do not touch.

---

## 4. Tooling: a third output target, additively

The `Target` abstraction built for Grok (`tools/openai-plugin/lib/target/`)
takes a Gemini target without changes to the OpenAI or Grok paths.

### 4.1 Config: a vendor-neutral `listing` block, plus `gemini`

Today `grok` carries four fields that are not Grok-specific (`oauthUrl`,
`readmeIntro`, `scopeNote`, `smokeTests`). Move them to a top-level `listing`
block and have `PluginConfig` accept both locations during the transition
(`grok.*` wins if both are set, with a deprecation note in the validator), so
the Grok build is unaffected:

```json
"listing": {
  "oauthUrl": "https://login.octagonai.co",
  "readmeIntro": "…",
  "scopeNote": "…",
  "smokeTests": [ { "prompt": "…", "expect": "…" } ]
},
"grok": { "keywords": […], "domains": […], "category": "finance", "catalogDescription": "…" },
"gemini": {
  "serverName": "octagon",
  "includeTools": ["octagon-agent", "octagon-deep-research-agent"],
  "repository": "https://github.com/OctagonAI/octagon-ai-gemini-extension",
  "repoDescription": "Cited research on public companies for Gemini CLI: SEC filings, earnings calls, financials, market data. By Octagon AI.",
  "contextNotes": [
    "For Kalshi or Polymarket questions, suggest the octagon-prediction-markets extension."
  ]
}
```

`gemini.includeTools` is optional (absent for the prediction-markets profile,
whose server only has the two tools it should expose); when present, every
entry must be in `mcp.tools`. `repoDescription` is the GitHub About text the
publish workflow sets and asserts; keep it under 350 characters and start with
the brand.

### 4.2 `GeminiTarget` (`target/GeminiTarget.mjs`)

- `id` `"gemini"`, `manifestPath` `"gemini-extension.json"`, `repoDir`
  `"gemini/extensions"` (new on `Target`, `"grok/plugins"` for Grok, `null` for
  OpenAI; `RepoSync` takes it instead of the hard-coded Grok constant).
- `checkConfig`: `gemini` block present; `includeTools ⊆ mcp.tools`;
  `repository` is an `https://github.com/OctagonAI/…` URL; `listing` (or legacy
  `grok.*`) present.
- `emit`: writes `gemini-extension.json` (`GeminiManifestBuilder`), `GEMINI.md`
  (`GeminiContextBuilder`), `README.md` (`GeminiReadmeBuilder`, sharing the
  section renderer with `GrokReadmeBuilder` via a small `ReadmeSections`
  helper), `LICENSE`. Skills are staged by the pipeline as today.
- `assetPaths`: none (the gallery shows the GitHub avatar; no icon field
  exists in the manifest).
- `finalize`: default (directory, no archive).

### 4.3 Rules (`validation/rules/gemini/`)

| Rule | Checks |
|---|---|
| `GeminiManifestRule` | manifest parses; `name` matches `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$` and equals `config.name`; `version` semver; `description` non-empty, single line, ≤ 300 chars; `contextFileName` names a file in the package; only documented top-level fields; **no** `settings`, `excludeTools`, `themes`, `migratedTo` |
| `GeminiMcpRule` | exactly one server; `url` is `https://` and equals `config.mcp.url`; `type === "http"`; **no** `httpUrl`, `command`, `args`, `env`, `cwd`, `headers`, `trust`; `oauth.enabled === true`; `includeTools`, if present, equals `config.gemini.includeTools`; `timeout` is a positive integer |
| `GeminiContextRule` | `GEMINI.md` exists; ≤ 250 words; names every tool the extension exposes (after `includeTools`); contains "cite", the research-only sentence, and `/mcp auth` |
| `ComponentScopeRule` (shared, parameterized) | no `commands/`, `hooks/`, `agents/`, `policies/`, `.lsp.json`, other platforms' manifests, or executable files; outside `skills/` only the manifest, `GEMINI.md`, `README.md`, `LICENSE` |
| `ReadmeDeclarationRule` (shared) | README names the MCP URL, OAuth, the components, every skill, the license, and both install commands |
| `LicenseRule` (shared) | `LICENSE` byte-identical to the repository's |

The three shared rules move from `rules/grok/` to `rules/vendor/` with
options (`allowedTopLevel`, `requiredPhrases`) and `rules/grok/index.mjs` keeps
exporting the same `createGrokRules` so nothing downstream changes.

### 4.4 `RepoSync`, generalized

`new RepoSync({ repoRoot, pluginName, repoDir: target.repoDir })`; the
`SYNC_ROOT` constant becomes the Grok default. Guards are unchanged: writes
confined to `<repoDir>/<name>/`, failed builds refused, symlinks refused,
`--check` reports drift.

### 4.5 CLI and scripts

```
build --target gemini [--profile …]      → out/gemini/<name>/
sync  --target gemini [--check]          → gemini/extensions/<name>/
```

npm: `build:gemini`, `build:gemini:predictions`, `sync:gemini`,
`check:gemini`. CI runs `check:gemini` next to `check:grok`. `entry` stays
Grok-only (the gallery has no catalog entry); a new `gemini about` subcommand
prints the two repo About settings (description, topic, homepage) the publish
workflow applies, for the one-time manual setup in §6.

### 4.6 Tests (`tests/openai-plugin/`)

- `gemini-target.test.mjs`: manifest from config (field list, `url`+`type`,
  `includeTools` only when configured, no `httpUrl`); `GEMINI.md` word count
  and required phrases; README contents; both profiles build clean and
  reproducibly; source tree untouched; OpenAI and Grok outputs byte-identical
  before and after (reuse the parity tests, pin the current Grok directory
  hashes in a fixture for the refactor commit).
- `gemini-rules.test.mjs`: each rule positive and negative, including the
  deprecated-`httpUrl` rejection and `includeTools` mismatch.
- `listing-config.test.mjs`: `listing` block accepted; legacy `grok.*` fields
  still accepted and precedence documented; both profiles' real configs load.
- `repo-sync.test.mjs`: add the `repoDir` cases.

### 4.7 What does not change

OpenAI ZIPs and `grok/plugins/*` are byte-identical (asserted). The Claude
plugin at the repo root, `npm pack` contents, and existing scripts are
untouched.

---

## 5. Mirror repositories and the publish workflow

### 5.1 Repositories

| Repo | Extension | Description (About) |
|---|---|---|
| `OctagonAI/octagon-ai-gemini-extension` | `octagon-ai` | Cited research on public companies for Gemini CLI: SEC filings, earnings calls, financials, market data. By Octagon AI. |
| `OctagonAI/octagon-prediction-markets-gemini-extension` | `octagon-prediction-markets` | Cited Kalshi and Polymarket research for Gemini CLI: odds, drivers, Trust Scores, model-vs-market gaps. By Octagon AI. |

Public, MIT, topic `gemini-cli-extension`, homepage `https://www.octagonai.co/`,
issues disabled with a README pointer to the monorepo (or enabled and triaged,
the team's call), default branch `main`, branch protection with the workflow's
app as the only pusher.

### 5.2 `publish-gemini-extensions.yml` (in the monorepo)

Trigger: push to `main` touching `gemini/extensions/**` (and
`workflow_dispatch`). For each extension:

1. `npm ci && npm run check:gemini` (refuses to publish drift).
2. Read `version` from the generated manifest.
3. Check out the mirror with a GitHub App token (`contents: write` plus
   `administration: write` for the About description and topics, on the two
   mirrors only; stored as `GEMINI_MIRROR_APP_ID` / `GEMINI_MIRROR_APP_PRIVATE_KEY`).
4. Replace the mirror's working tree with `gemini/extensions/<name>/` (rsync
   `--delete`, keeping `.git`), commit
   `Release <version> (octagon-claude-plugin@<short-sha>)` when there is a
   diff, push `main`.
5. If tag `v<version>` does not exist: create it and a GitHub Release with a
   zip of the directory (manifest at archive root) and release notes from the
   monorepo commit range.
6. Assert the repo's About description and topic via the GitHub API; fix them
   if they drifted (idempotent `PATCH /repos` + `PUT /topics`).

Secrets never reach the generated content; the workflow has no step that runs
anything from the mirrors.

### 5.3 Release discipline

A content change without a version bump reaches `main` of the mirror (git-clone
installs see it on `gemini extensions update`) but not Release installs. So,
as for Grok: ship user-visible changes with a version bump in
`plugin.config.json`, then `npm run sync:grok && npm run sync:gemini`. One
version number per plugin across OpenAI, Grok, and Gemini.

---

## 6. Listing runbook (one-time, after PRs A–C merge)

1. Create the two repositories under the OctagonAI org (empty, public, MIT
   chosen at creation so GitHub detects `licenseKey`).
2. Install the GitHub App (or fine-grained PAT) on the two repos; add the
   secrets to the monorepo.
3. Run the publish workflow (`workflow_dispatch`). Confirm each mirror has the
   files at root, a `v<version>` release marked Latest, the About description,
   and the `gemini-cli-extension` topic (`npm run gemini:about` prints the
   expected values).
4. Install from GitHub on a machine with Gemini CLI, run the §8 smoke test,
   record it in `gemini/SUBMISSION_LOG.md`.
5. Wait for the daily crawl. Check
   `curl -s https://geminicli.com/extensions.json | grep -i octagon`.
6. If absent after three days, open a gemini-cli issue using the pattern in
   #28890 (repo, raw manifest, release tag, validate output, registry check),
   and in parallel confirm the repo is not private, the topic is exact, and the
   manifest uses `url` + `type`.

---

## 7. Listing copy

| Field | octagon-ai | octagon-prediction-markets |
|---|---|---|
| `name` | `octagon-ai` | `octagon-prediction-markets` |
| `description` (manifest, gallery card) | Cited research on public companies: SEC filings, earnings call transcripts, financial statements, market data, and analyst estimates. | Cited research on Kalshi and Polymarket prediction markets: event odds, what moves them, probability history, Trust Scores, and where the market-implied probability diverges from Octagon's research-adjusted model estimate. |
| Repo About | §5.1 | §5.1 |
| Skills | 68 | 7 |
| Server | `octagon` → `/mcp`, `includeTools` public tools | `octagon-predictions` → `/prediction-markets/mcp` |

Keep `description` identical to the OpenAI/Grok one so the brand reads the same
in every directory; the gallery truncates long descriptions, so the first
clause carries the noun a searcher types.

---

## 8. Smoke test (before relying on the listing, and after each release)

Machine with Gemini CLI (Code Assist or API key) and, separately, Antigravity CLI.

1. `gemini extensions validate gemini/extensions/octagon-ai` and `… octagon-prediction-markets` → "successfully validated".
2. `gemini extensions link gemini/extensions/octagon-prediction-markets`; start `gemini`; `/extensions list` shows it enabled; `/mcp list` shows `octagon-predictions` needing auth.
3. `/mcp auth octagon-predictions` → browser → `login.octagonai.co` → back; `/mcp list` shows tools. Record whether the callback carried `iss` and whether the CLI complained (RFC 9207 check).
4. Prediction markets: the three `listing.smokeTests` prompts; confirm tool-call confirmations appear, "always allow" works, answers carry sources, the no-cache market asks before generating.
5. Public markets (`octagon-ai`): `/mcp list` shows **only** `octagon-agent` and `octagon-deep-research-agent`; the three smoke prompts return cited answers; a Kalshi question gets the routing suggestion from `GEMINI.md`.
6. Uninstall, then `gemini extensions install https://github.com/OctagonAI/octagon-prediction-markets-gemini-extension` (release install) and repeat step 3 once; `gemini extensions update` reports up to date.
7. Antigravity: `agy plugin install https://github.com/OctagonAI/octagon-prediction-markets-gemini-extension`; confirm the server migrated to `mcp_config.json`, skills load, the rule from `GEMINI.md` is present, and one prompt round-trips with OAuth.
8. Headless check: run step 3 in a container without a browser to document the failure text for the README.

---

## 9. Other Google surfaces this unlocks

- **Antigravity CLI / Antigravity 2.0**: covered by the same repos (§1.4). A
  native `antigravity` target (`plugin.json` + `mcp_config.json` + `rules/`)
  is a half-day once this target exists; add it when Antigravity publishes a
  plugin directory.
- **Gemini app + Search (Connected Apps Platform)**: separate, gated preview
  with its own console; the server qualifies as-is. Apply for the waitlist
  independently of this plan.
- **Gemini Enterprise Agent Gallery**: A2A + Cloud Marketplace; out of scope.

---

## 10. Work plan

| PR | Scope | Acceptance |
|---|---|---|
| **A. Config and target** | `listing` block with legacy fallback; `GeminiTarget`, manifest/context/README builders; Gemini rules; shared vendor rules parameterized; `RepoSync.repoDir`; CLI `--target gemini`, `gemini about`; tests in §4.6 | All existing tests pass; OpenAI ZIPs and `grok/plugins/*` byte-identical; `build --target gemini` clean for both profiles; `check:gemini` fails on drift |
| **B. Generated extensions + CI** | `gemini/extensions/octagon-ai/`, `gemini/extensions/octagon-prediction-markets/`, `gemini/README.md`, `check:gemini` in CI | CI green; both READMEs read standalone; `gemini extensions validate` passes on both directories (run locally, output pasted in the PR) |
| **C. Publish workflow** | `.github/workflows/publish-gemini-extensions.yml`, `gemini/README.md` section on releases, secrets documented | Dry run on a fork or `workflow_dispatch` against the real mirrors once they exist |
| **D. Mirrors + listing** (needs org repo creation) | Create the two repos, install the app, run the workflow, set topics, smoke test, `gemini/SUBMISSION_LOG.md` | Both repos published with a `v<version>` release; both appear in `extensions.json` |
| **E. Website** (`octagonai.co`) | Gemini CLI + Antigravity cards on `/connected-apps/` with the two install commands; `llms.txt` line | Page live |

Sequencing: A → B → C in one week; D the day C merges (repo creation is the
one step that needs an org owner); E in parallel with D.

Estimated size: A ≈ 500 lines of tool code + 350 of tests (the Grok target is
the template; most of the work is the `listing` refactor and the context
builder); B is generated; C ≈ 120 lines of YAML; D is an afternoon.

---

## 11. Risks and how the plan absorbs them

| Risk | Mitigation |
|---|---|
| Crawler rejects the extension without saying why (three open reports) | Use only documented fields and the non-deprecated `url` + `type`; semver; tagged Release; MIT license file GitHub can detect; repo About description set; §6 step 6 escalation path with the exact evidence Google's triage asked for |
| Mirror repos drift from the monorepo | They are never edited by hand; the workflow refuses to publish drift; `check:gemini` in CI; README says where changes go |
| A content fix without a version bump never reaches Release installs | §5.3 discipline, same as Grok; `sync:gemini` prints a reminder when the version is unchanged but content changed |
| OAuth fails in headless or SSH sessions | Documented in README and `GEMINI.md`; optional server follow-up: accept an Octagon API key as `Authorization: Bearer` on the OAuth paths, which would let an extension `settings` entry supply it through `headers` — only worth it if users ask |
| Users see the public-markets extension's server list includes prediction tools | They do not: `includeTools` hides them client-side, and `/mcp list` is part of the smoke test |
| Tool-call confirmation fatigue | Read-only tools, one "always allow" per tool; `GEMINI.md` says it is safe; no `trust` is possible from an extension by design |
| Two more repos to maintain | Zero hand-written content; one workflow; branch protection |
| Antigravity import changes behavior for `GEMINI.md` (becomes a rule) | The context is written as standing rules anyway; smoke test step 7 verifies |
