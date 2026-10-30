# Octagon on the Grok Build Plugin Marketplace

Plan for shipping the two Octagon plugins that exist for the OpenAI directory —
**Octagon AI** (public markets) and **Octagon Prediction Markets** — to xAI's
Grok Build Plugin Marketplace, from the same source, with the same packaging
tool, without touching anything the OpenAI builds or the Claude plugin depend on.

Verified against the public record on 2026-10-30: the launch post
(`x.ai/news/grok-plugin-marketplace`), the catalog repo
(`github.com/xai-org/plugin-marketplace`: README, CONTRIBUTING, the live
`marketplace.json`), the Grok Build docs
(`docs.x.ai/build/features/skills-plugins-marketplaces`), and two third-party
submissions that went through review (Modem, Every's compound-engineering).

---

## 0. Decisions, up front

| Decision | Choice | Why |
|---|---|---|
| Distribution model | **Remote source**: the catalog entry points at `OctagonAI/octagon-claude-plugin` at a pinned commit, with `source.path` selecting a subdirectory per plugin | Nothing is vendored into xAI's repo; updates are a one-line SHA bump; the source is under the official org, which reviewers call "the single biggest thing that speeds up review" |
| Two plugins or one | **Two entries**, `octagon-ai` and `octagon-prediction-markets`, mirroring the OpenAI split | Same positioning as the OpenAI listings; the catalog already carries the precedent (`mongodb` / `mongodb-atlas` from one repo with two `path`s) |
| Where the plugin files live | **Committed, generated directories** `grok/plugins/octagon-ai/` and `grok/plugins/octagon-prediction-markets/`, produced by the packaging tool and checked for freshness in CI | A remote source clones the repo as-is at install time, so the installable files must exist in git. Generation keeps them in lockstep with the OpenAI builds; the `--check` guard is the same pattern xAI uses for its own `plugin-index.json` |
| Manifest location | `.grok-plugin/plugin.json` in each plugin directory, plus `.mcp.json` at the plugin root | Grok's native manifest path; `.claude-plugin/plugin.json` is also accepted but the native path removes any ambiguity in review |
| Components shipped | **Skills + one HTTP MCP server. No hooks, no agents, no commands, no LSP** | Least privilege is a stated review dimension. Everything the plugin does goes through the hosted MCP server; a hook or local executable would widen the static audit for no gain |
| Skill content | The **same built catalogs** the OpenAI packages ship (68 skills for `octagon-ai`, 7 for `octagon-prediction-markets`) | Verified: the built skills contain no ChatGPT/OpenAI/Claude/Codex wording, so they are platform-neutral as-is |
| MCP endpoints | `https://mcp.octagonai.co/mcp` and `https://mcp.octagonai.co/prediction-markets/mcp`, OAuth via `login.octagonai.co` | Already live for the OpenAI plugins; one server, one auth flow, every client |
| Versioning | Manifest `version` is taken from the profile's `plugin.config.json`, so OpenAI and Grok packages of one plugin always carry the same version | One number to bump per release |

---

## 1. The Grok marketplace, in facts

**What it is.** A built-in catalog for **Grok Build** (xAI's terminal coding
agent). The catalog is one JSON file, `.grok-plugin/marketplace.json`, in the
public repo `xai-org/plugin-marketplace`. Listing a plugin means opening a PR
that appends one object to its `plugins` array. CI validates the catalog and
regenerates a component index; a code owner reviews; merge publishes.

**What a plugin is.** A directory with any combination of `skills/`,
`commands/`, `agents/`, `hooks/hooks.json`, `.mcp.json`, `.lsp.json`, and an
optional `plugin.json` (searched at `plugin.json`, `.grok-plugin/plugin.json`,
then `.claude-plugin/plugin.json`). Manifest `name` is kebab-case, 1–64 chars.
Unknown fields are ignored. `mcpServers` may be a path (`./.mcp.json`) or inline.

**How users install.** `/marketplace` in Grok Build, or
`grok plugin install <name> --trust`. The `--trust` flag is the user's explicit
consent for hooks and MCP servers to run. Remote plugins are pinned to a commit;
Grok Build re-verifies `git rev-parse HEAD == sha` after cloning.

**Catalog entry fields.** Required: `name`, `source`. Recommended:
`description`, `category`, `homepage`, `keywords`, `domains`; optional
`version`, `author`, `tags`. `keywords` and `domains` drive the **plugin CTA**
(Grok Build proactively suggests the plugin when a request matches), so they
must be **brand-scoped**; generic terms are sent back.

**Remote source shape** (from the live catalog):

```json
"source": { "source": "url", "url": "https://github.com/<org>/<repo>.git", "sha": "<40-hex>", "path": "<subdir>" }
```

**What review checks.** Source legitimacy (official org, SHA pinned, brand
matches source), security (static audit of MCP configs, hooks, scripts,
skills), components shipped, duplication, conventions and CI. Rejections:
remote code execution, secret/data exfiltration or undisclosed telemetry,
over-broad hooks or a shell-exec MCP server, obfuscation, prompt injection in
`SKILL.md`. The README must declare every network endpoint and credential.

**Claude compatibility.** Grok Build reads Claude Code plugins, skills, MCP
configs and `CLAUDE.md` unchanged. The repo root is therefore already
installable as a Claude-format plugin; we deliberately do not rely on that (see
§3, "Why not the repo root").

**Other Grok surfaces (not this plan's deliverable, covered in §9).**
The Grok consumer app (web/iOS/Android) has *connectors*: a curated OAuth
catalog with no self-serve submission as of this writing, plus "Bring Your Own
MCP" at `grok.com/connectors`. A separate form at
`x.ai/bot/marketplace/submit-a-plugin` takes plugin/MCP submissions for Grok Bot
and Cursor ("Grok (coming soon)"). Both reach the same MCP server; neither needs
a different package.

### How this differs from the OpenAI directory

| | OpenAI directory | Grok Build marketplace |
|---|---|---|
| Submission | ZIP upload in a developer portal; closed review | Public PR to a GitHub catalog; CI + code-owner review |
| Manifest | `.codex-plugin/plugin.json` with `interface` and `extensions.com.openai` (listing copy, review test cases, demo video) | `.grok-plugin/plugin.json`: plain metadata; listing copy is the catalog entry's `description` |
| Discovery | Name search in the directory | Catalog browse + proactive CTA from brand-scoped `keywords`/`domains` |
| Domain verification | `/.well-known/openai-apps-challenge` per host | None; legitimacy is "source repo is under the official org" |
| Updates | Re-upload with a new version | PR bumping `sha` |
| Trust gate | OAuth consent in ChatGPT | `--trust` at install + OAuth on first tool call |

---

## 2. Requirements checklist, mapped

| Requirement (CONTRIBUTING) | Status for Octagon | Work |
|---|---|---|
| Plugin owned by submitter; source under official org | `OctagonAI/octagon-claude-plugin` is public and org-owned | None |
| Remote source pins a full 40-char commit SHA, reachable | Pin the merge commit of the release PR | Runbook §6 |
| `name` kebab-case, unique in catalog | `octagon-ai`, `octagon-prediction-markets`; no `octagon*` entry exists today | Verify at PR time |
| `homepage`, clear `description`, brand-scoped `keywords`/`domains`, `category` | Drafted in §5 | Copy review |
| Valid manifest (`.grok-plugin/plugin.json`), README, stated license | Generated by the new target; MIT (`LICENSE` is copied into each plugin dir) | §3–4 |
| Security expectations | Skills + HTTP MCP only; no scripts, hooks, env reads, or local executables | README declares endpoints and credentials |
| `plugin-index.json` regenerated in the catalog PR | Done in the fork during submission | Runbook §6 |

---

## 3. Package design

Each plugin directory is self-contained and identical in shape:

```
grok/plugins/octagon-prediction-markets/
├── .grok-plugin/
│   └── plugin.json          # manifest (below)
├── .mcp.json                # one HTTP server
├── LICENSE                  # copy of the repo's MIT license
├── README.md                # review-facing: what, endpoints, credentials, data flow, install, test
├── assets/
│   └── icon.png             # 1:1, from the profile's assets
└── skills/
    ├── get-started/SKILL.md
    ├── event-brief/SKILL.md
    ├── probability-history/SKILL.md
    ├── mispricing-analysis/SKILL.md
    ├── trust-score/SKILL.md
    ├── prediction-markets-analysis/SKILL.md
    └── octagon-status/SKILL.md
```

### 3.1 `.grok-plugin/plugin.json`

Only fields Grok documents, so there is nothing for a reviewer to ask about:

```json
{
  "name": "octagon-prediction-markets",
  "version": "1.0.0",
  "description": "Cited research on Kalshi and Polymarket prediction markets: event odds, what moves them, probability history, Trust Scores, and where the market-implied probability diverges from an independent model estimate.",
  "author": { "name": "Octagon AI", "email": "contact@octagonai.co", "url": "https://www.octagonai.co/" },
  "homepage": "https://www.octagonai.co/",
  "repository": "https://github.com/OctagonAI/octagon-claude-plugin",
  "license": "MIT",
  "keywords": ["octagon", "octagon prediction markets", "octagon kalshi", "octagon polymarket", "octagon trust score"],
  "skills": "./skills/",
  "mcpServers": "./.mcp.json"
}
```

`name`, `version`, `description`, `author`, `homepage`, `license` come from the
profile's `plugin.config.json` (the same source the OpenAI manifest reads).
`keywords` are **not** the OpenAI keywords: those are topical
(`prediction-markets`, `kalshi`, …) and would be pushed back here as generic.
A new per-profile field supplies them (§4.2).

### 3.2 `.mcp.json`

```json
{ "mcpServers": { "octagon-predictions": { "type": "http", "url": "https://mcp.octagonai.co/prediction-markets/mcp" } } }
```

`type: "http"` is stated explicitly (the OpenAI package omits it; Grok's
examples and the Claude validator both want it). Server key and URL come from
`plugin.config.json#mcp`.

### 3.3 `README.md` (generated)

Reviewers "read this first", so it is written for them and generated from the
config so it cannot drift:

1. One paragraph: what the plugin does, who it is for, what it does not do
   (no trades, no wagers, no funds, no personalized advice).
2. **Components**: skills (count, list with one-line descriptions pulled from
   each `SKILL.md` frontmatter), one HTTP MCP server, nothing else.
3. **Network endpoints**: the MCP URL; the OAuth authorization server
   (`https://login.octagonai.co`); nothing else is contacted.
4. **Credentials**: browser OAuth on first tool use; no API keys, no env vars,
   no files read; disconnect from Grok Build's MCP settings.
5. **Data flow**: prompts and tool arguments go to Octagon; cited results come
   back; no telemetry from the plugin itself.
6. **Install**: `grok plugin install <name> --trust`, and a manual
   `[[marketplace.sources]]` / `--plugin-dir` path for testing from the repo.
7. **Smoke test**: three prompts and what a pass looks like (from the OpenAI
   review cases, minus the ChatGPT framing).
8. License, support URL, privacy policy, terms.

### 3.4 Why not the repo root

The repo root is a valid Claude plugin (`.claude-plugin/plugin.json`,
`skills/`, `agents/`, `hooks/hooks.json`) and Grok would install it. We do not
submit it because: it mixes public-market and prediction-market skills (the
opposite of the two-listing strategy); it ships hooks and an agent, which widen
the security review; its name is `octagon-claude-plugin`; and its MCP URL is
the legacy `mcp.octagonagents.com`. Pointing `source.path` at a generated
subdirectory sidesteps all four without changing the root.

---

## 4. Tooling: a second output target, additively

The packaging tool (`tools/openai-plugin/`) already does everything up to the
manifest: profile resolution, skill catalog with overlays and transforms,
validation rules, reproducible staging. The OpenAI-specific parts are the
manifest builder, the ZIP, and some rules. The Grok target reuses the first
group and swaps the second.

### 4.1 New abstractions (`tools/openai-plugin/lib/target/`)

```
target/
├── Target.mjs               # interface: id, manifestPath, checkConfig(config), emit(ctx), assetPaths(config), rules(opts), finalize(ctx)
├── OpenAITarget.mjs         # wraps today's ManifestBuilder + Archiver; behavior unchanged
└── GrokTarget.mjs           # GrokManifestBuilder + GrokReadmeBuilder; no archive
```

- `Target.emit({ writer, config, skills, assetsRoot })` writes the
  target-specific files into the staging dir. `BuildPipeline` calls
  `target.emit` where it writes the manifest and MCP config today; the skill
  loop stays where it is, and the asset loop copies what
  `target.assetPaths(config)` returns (the listing images for OpenAI, nothing
  for Grok, whose icon is written by `emit`). `BuildPipeline` keeps its
  constructor signature by defaulting `target` to `OpenAITarget` when not
  injected.
- `Target.manifestPath` is threaded into `PackageView.load(root, { manifestPath })`
  so validation reads the manifest the selected target wrote
  (`.grok-plugin/plugin.json` for Grok) instead of the fixed Codex path.
- `PackageWriter` takes a `stagingRoot` (the target id), so Grok builds stage
  to `out/grok/<name>/` and never share a tree with `out/openai/<name>/`.
- Archive handling lives behind the target: `Target.finalize({ writer, files,
  pkg, validator, validation })` runs after package validation.
  `OpenAITarget.finalize` zips on success and removes a stale ZIP on failure
  (today's behavior, moved); `GrokTarget` inherits the default, which produces
  no archive and runs no archive-scope rules. The `validate` command likewise
  only inspects a ZIP for the OpenAI target.
- `Target.checkConfig(config)` validates the parts of the config only that
  target reads, before anything is built (Grok: the `grok` block exists, every
  keyword carries the brand, every domain is Octagon-owned).
- `Target.rules({ knownTools, forbiddenText, online, mcpUrl })` contributes
  target-specific validation rules; shared rules (`SkillRule`, `UrlRule`,
  `ForbiddenTextRule`, `SecretScanRule`, `LinkIntegrityRule`, `ImageRule`) run
  for both. `ManifestShapeRule`, `ReviewCasesRule`, `ListingTextRule`,
  `BrandColorRule`, `ArchiveShapeRule` move under `OpenAITarget.rules()` with no
  change to their code.

### 4.2 Config, per profile

One new optional block in each `plugin.config.json`, validated by
`PluginConfig` only when present (so the OpenAI build is unaffected):

```json
"grok": {
  "keywords": ["octagon", "octagon ai", "octagon research", "octagon sec filings", "octagon earnings"],
  "domains": ["octagonai.co", "www.octagonai.co", "docs.octagonagents.com"],
  "category": "finance",
  "smokeTests": [
    { "prompt": "Summarize the risk factors in Apple's latest 10-K.", "expect": "Cited summary with the filing date" }
  ]
}
```

`keywords`/`domains`/`category` feed both the manifest and the catalog-entry
snippet the tool prints; `smokeTests` feed the README.

### 4.3 Grok-specific rules (`validation/rules/grok/`)

| Rule | Checks |
|---|---|
| `GrokManifestRule` | `.grok-plugin/plugin.json` exists; `name` matches `^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$` and equals `config.name`; `skills` and `mcpServers` paths resolve inside the package; only documented fields present |
| `McpConfigRule` | `.mcp.json` has exactly one server, `type: "http"`, `https://` URL equal to `config.mcp.url`; no `command`, `args`, or `env` keys (no local executables) |
| `ComponentScopeRule` | No `hooks/`, `commands/`, `agents/`, `.lsp.json`, or other platforms' manifests; no executable file anywhere in the package, including skill companion files (`.sh`, `.py`, `.js`, `.mjs`, `.ts`, binaries); outside `skills/` only the manifest, `.mcp.json`, `README.md`, `LICENSE`, and the icon are allowed |
| `BrandKeywordRule` | Every keyword contains `octagon`; a generic-term deny-list (`finance`, `stocks`, `api`, `mcp`, `kalshi`, `polymarket`, …) fails the build with the reviewer's reason quoted. Domains never reach the package, so `GrokTarget.checkConfig` checks them against an owned-host allow-list before the build |
| `ReadmeDeclarationRule` | README names the MCP URL, the OAuth host, the word "OAuth", and the license |
| `LicenseRule` | `LICENSE` present and byte-identical to the repo's |

### 4.4 Writing into the repo: `sync`, scoped and checked

`PackageWriter` must keep refusing to write into source. The committed
directories are produced by a separate, narrowly-scoped step:

- `node tools/openai-plugin/cli.mjs build --target grok [--profile …]` stages
  to `out/grok/<name>/` and validates, exactly like the OpenAI build.
- `node tools/openai-plugin/cli.mjs sync --target grok [--profile …]` copies
  the validated staging dir to `grok/plugins/<name>/`. `RepoSync` (new,
  `output/RepoSync.mjs`) only ever writes under `grok/plugins/<config.name>/`,
  canonicalizes both ends, removes files that are no longer staged, and refuses
  to run if the build report says validation failed.
- `sync` always builds and validates first, so it never depends on a stale
  `out/`; `sync --check` then diffs the fresh staging tree against the committed
  directory instead of writing, and exits non-zero on drift. CI runs it for
  both profiles from a clean checkout (no `out/` needed) so a skill edit
  without a regenerated package cannot merge (mirrors xAI's
  `generate-plugin-index.py --check`).
- `PackageWriter`'s `protectedPaths` keep covering `grok/` (it is a top-level
  source entry); `RepoSync` is the one component allowed in, and only there.

### 4.5 CLI surface

```
build     --target openai|grok   (default openai; unchanged behavior)
validate  --target openai|grok
sync      --target grok [--check]
entry     --target grok          prints the marketplace.json object with the current HEAD SHA filled in
```

`package.json` scripts: `build:grok`, `build:grok:predictions`, `sync:grok`,
`check:grok` (= both profiles with `--check`), `test:openai` extended to cover
the new tests.

### 4.6 Tests (`tests/openai-plugin/`)

- `grok-manifest.test.mjs`: manifest fields from config; keywords from the
  `grok` block, never from `keywords`; `.mcp.json` has `type: "http"`.
- `grok-rules.test.mjs`: each rule in §4.3, positive and negative.
- `grok-readme.test.mjs`: README carries the endpoint, OAuth host, license,
  every skill name; no ChatGPT/OpenAI/Claude wording.
- `repo-sync.test.mjs`: writes only under `grok/plugins/<name>/`; refuses a
  failed build; `--check` detects an added, changed, and removed file; refuses
  a symlinked target.
- `target.test.mjs`: `BuildPipeline` with `OpenAITarget` produces a byte-for-
  byte identical package to today's (pin the current ZIP's sha256 in the test
  fixture) — the "nothing broke" guarantee.
- `pipeline.test.mjs` / `profiles.test.mjs`: add a Grok pass for both profiles.

### 4.7 What does not change

`openai/plugin.config.json` and the prediction-markets profile keep their
meaning; the OpenAI ZIPs are reproduced byte-for-byte (asserted in tests); the
Claude plugin at the repo root, its manifest tests, `hooks/`, `agents/`, and
`npm pack` contents are untouched. `grok/` is added to `package.json#files`
only if we want npm consumers to get it; default: not included.

---

## 5. Catalog entries (what the xAI PR adds)

```json
{
  "name": "octagon-ai",
  "description": "Octagon AI research on public companies (MCP server + skills). Cited answers from SEC filings (10-K, 10-Q, 8-K, S-1, proxies), ten years of earnings call transcripts, financial statements and ratios, stock prices, analyst estimates, and price targets. Requires a free Octagon account; sign in with OAuth on first use.",
  "category": "finance",
  "source": {
    "source": "url",
    "url": "https://github.com/OctagonAI/octagon-claude-plugin.git",
    "sha": "<40-hex from the release merge commit>",
    "path": "grok/plugins/octagon-ai"
  },
  "homepage": "https://www.octagonai.co/",
  "keywords": ["octagon", "octagon ai", "octagon research", "octagon sec filings", "octagon earnings"],
  "domains": ["octagonai.co", "www.octagonai.co", "docs.octagonagents.com"]
}
```

```json
{
  "name": "octagon-prediction-markets",
  "description": "Octagon research on Kalshi and Polymarket prediction markets (MCP server + skills). Cited event briefs: current odds with timestamps, probability history and what moved it, how similar events resolved, the market's 0–100 Trust Score, and where the market-implied probability diverges from an independent model estimate. Research only: no bets, trades, or account linking. Requires a free Octagon account; OAuth on first use.",
  "category": "finance",
  "source": {
    "source": "url",
    "url": "https://github.com/OctagonAI/octagon-claude-plugin.git",
    "sha": "<same commit>",
    "path": "grok/plugins/octagon-prediction-markets"
  },
  "homepage": "https://www.octagonai.co/",
  "keywords": ["octagon", "octagon prediction markets", "octagon kalshi", "octagon polymarket", "octagon trust score"],
  "domains": ["octagonai.co", "www.octagonai.co"]
}
```

Notes on the copy: `description` is the browse text, so it leads with the
noun a searcher types; the "(MCP server + skills)" convention matches the
existing entries; `kalshi` and `polymarket` appear only prefixed with
`octagon`, since bare venue names would mis-fire the CTA on requests about
those sites themselves and are not brands we own. `category` is free text in
the catalog; `finance` would be the first of its kind, which is fine.

Both entries land in **one** PR so review sees the split at once and the
duplication check reads them as the `mongodb`/`mongodb-atlas` pattern rather
than a parallel entry.

---

## 6. Submission runbook

Prerequisites: PR A (tooling) and PR B (generated packages) merged on `main`;
a smoke test passed on a machine with Grok Build installed (§8).

1. Note the merge commit: `git ls-remote https://github.com/OctagonAI/octagon-claude-plugin.git HEAD`.
   Confirm it is on `main` and public (`gh api repos/OctagonAI/octagon-claude-plugin/commits/<sha>`).
2. Fork `xai-org/plugin-marketplace` **under the OctagonAI org** (not a personal
   account); branch from `main`, e.g. `add-octagon`.
3. Append the two §5 entries to `.grok-plugin/marketplace.json`
   (`node tools/openai-plugin/cli.mjs entry --target grok --profile …` prints
   each with the SHA filled).
4. `python3 scripts/generate-plugin-index.py` (fetches our pinned commit),
   `python3 scripts/validate-catalog.py`, `python3 scripts/generate-plugin-index.py --check`.
   Commit the regenerated `plugin-index.json`.
5. Open the PR. Fill the template with the §7 review copy. One PR, two entries.
6. Respond to review within the day; if a code change is requested, land it on
   our `main`, re-sync, bump the SHA in the same PR.
7. After merge: `grok plugin marketplace list` shows both; install each with
   `--trust`; run the §8 smoke test from the official catalog; record results in
   `grok/SUBMISSION_LOG.md`.

**Updates later**: land changes on `main`, `sync:grok`, open a PR to the catalog
that bumps `sha` (both entries share one SHA, so bump both even if one plugin
changed). Never a second entry.

---

## 7. Review copy (PR template answers)

| Detail | Octagon AI | Octagon Prediction Markets |
|---|---|---|
| Maintainer | Octagon AI, Inc.; source under `OctagonAI` | same |
| Contact | contact@octagonai.co | same |
| Purpose | Cited research on public companies from SEC filings, earnings transcripts, financial statements, market data, analyst estimates | Cited research on Kalshi and Polymarket markets: odds, history, drivers, Trust Scores, model-vs-market gaps |
| Components | 68 skills; one HTTP MCP server. No hooks, agents, commands, LSP, scripts | 7 skills; one HTTP MCP server. Same |
| License | MIT (plugin); hosted service under Octagon's terms | same |
| Network | `https://mcp.octagonai.co/mcp`; OAuth at `https://login.octagonai.co` | `https://mcp.octagonai.co/prediction-markets/mcp`; same OAuth |
| Credentials | Browser OAuth; Octagon account (free tier available); no keys, env vars, or files read | same |
| Tools exposed | `octagon-agent`, `octagon-deep-research-agent`. The `/mcp` endpoint also serves the two prediction-market tools (read-only); the package's skills never call them. Same server surface as the live OpenAI listing; see §11 for the server-side option | `octagon-prediction-markets-agent`, `prediction_markets_history` |
| Data flow | Prompts and tool arguments to Octagon; cited results back; no plugin-side telemetry | same |
| Writes / side effects | None. Research only; cannot trade, move money, or link accounts | None. Cannot place or route wagers |
| Test status | Fill from §8 with date and Grok Build version | same |

---

## 8. Smoke test (before submitting, and again after merge)

Run on a machine with Grok Build (`x.ai/build`); the `grok` CLI is not on the
build machine today. Record Grok Build's version.

1. `grok plugin validate grok/plugins/octagon-ai` and `… octagon-prediction-markets` — both clean.
2. Add the repo as a local source (`[[marketplace.sources]] path = "~/dev/octagon-claude-plugin/grok"` with a local `marketplace.json` the tool also generates under `grok/.grok-plugin/`), or `--plugin-dir grok/plugins/<name>`.
3. Install with `--trust`; `/mcps` shows the server; first tool call opens the OAuth flow at `login.octagonai.co`; completes.
4. Octagon AI: the three `smokeTests` from config (10-K risk factors; NVIDIA guidance; AAPL vs MSFT revenue growth) return cited answers.
5. Prediction Markets: event brief on `KXFEDDECISION-26DEC` (cached report path); Trust Score with breakdown; the no-cache market asks for consent before generating.
6. Negative: "put $50 on YES" declines and offers the brief; "what's the weather in Chicago" invokes no tool.
7. CTA: a prompt mentioning "octagon" or pasting an `octagonai.co` URL in a session without the plugin triggers the suggestion; "deploy my app" does not.

Open question to settle in step 3: Grok Build's OAuth handling for HTTP MCP
servers. Public evidence (Modem's log, 2026-09-24) says the native flow works;
if it does not for our server, the fallback is the `--trust` install plus a
documented one-time `grok mcp login`-style step, and the README gets that
paragraph.

---

## 9. The other Grok surfaces

Not needed for the marketplace PR; cheap once the packages exist.

- **Grok app connectors ("Bring Your Own MCP").** No package. Add a "Grok"
  card to `octagonai.co/connected-apps/` with the three-step connect guide
  (open `grok.com/connectors` → New Connector → Custom → paste the MCP URL,
  sign in). One card per plugin URL. Watch for the curated catalog opening to
  submissions.
- **Grok Bot / Cursor form** (`x.ai/bot/marketplace/submit-a-plugin`). Needs an
  org handle, website, 1:1 logo URL (we have `assets/logo.png`; host an SVG at
  `octagonai.co/images/octagon-mark.svg`). Submit both plugins after the Build
  listing is live so the form can link to it.
- **xAI API remote tools.** The MCP URL works as a remote tool from any Grok-
  powered agent; add the URL and auth note to the docs site and `llms.txt`.

---

## 10. Work plan

| PR | Scope | Acceptance |
|---|---|---|
| **A. Target abstraction + Grok target** (`tools/openai-plugin`) | `Target`, `OpenAITarget`, `GrokTarget`, `GrokManifestBuilder`, `GrokReadmeBuilder`, Grok rules, `RepoSync`, CLI `--target`/`sync`/`entry`, `grok` config block, tests in §4.6, `grok/README.md` explaining the directory | All 81 existing tests pass unchanged; OpenAI ZIPs byte-identical; `build --target grok` is clean for both profiles; `sync --check` fails on drift |
| **B. Generated packages** | `grok/plugins/octagon-ai/`, `grok/plugins/octagon-prediction-markets/`, `grok/.grok-plugin/marketplace.json` (local-source catalog for testing), CI step `npm run check:grok` | CI green; `git diff --stat` shows only generated paths; reviewers can read each README standalone |
| **C. Smoke test + log** | `grok/SUBMISSION_LOG.md` with §8 results, Grok Build version, date | Every step recorded with pass/fail |
| **D. Catalog PR** (external, in the OctagonAI fork of `xai-org/plugin-marketplace`) | Two entries, regenerated index | CI green; code-owner approval; merged |
| **E. Website** (`octagonai.co`) | Grok card on `/connected-apps/`, connect guide, `llms.txt` line | Page live; links resolve |

Sequencing: A → B in the same week; C the day B merges; D immediately after C;
E can run in parallel with D.

Estimated size: A ≈ 600 lines of tool code + 400 of tests; B is generated;
C is an afternoon with Grok Build installed; D is a one-file PR plus review
turnaround that xAI does not promise a time for.

---

## 11. Risks and how the plan absorbs them

| Risk | Mitigation |
|---|---|
| Reviewer reads two Octagon entries as duplication | One PR, distinct names and descriptions, different MCP paths and skill sets; cite `mongodb`/`mongodb-atlas` precedent in the PR body |
| Keywords pushed back as generic | `BrandKeywordRule` enforces the `octagon` prefix before the PR exists |
| Pinned commit unreachable (branch deleted, force-push) | Pin merge commits on `main` only; `main` is protected; never rewrite history |
| Drift between skills and committed packages | `check:grok` in CI |
| OAuth flow differs in Grok Build | Smoke test before submission; README paragraph if a manual login step is needed |
| The repo root is also installable and could confuse a reviewer | `grok/README.md` and the PR body state that the root is the Claude plugin and the marketplace entries point at `grok/plugins/*` by design |
| `category: finance` has no precedent | Free-text field; if asked, fall back to omitting it (optional) |
| Generated READMEs read as boilerplate | Generated from the profile's own copy and skill descriptions; the prediction-markets README carries the research-only disclaimer verbatim |
| The `octagon-ai` server endpoint (`/mcp`) also lists the prediction-market tools | Accepted for launch: it is the same endpoint and tool list the live OpenAI listing uses, the tools are read-only research tools, the package ships no skill that calls them, and the README declares the full tool list. A client-side filter does not exist in `.mcp.json`. The clean fix is server-side: a `/public-markets/mcp` toolset in `octagon-remote-mcp` (the `ToolSet` value object already backs `/deep-research/mcp` and `/prediction-markets/mcp`); once it exists, switch `openai/plugin.config.json#mcp.url` for both OpenAI and Grok packages in one release |
