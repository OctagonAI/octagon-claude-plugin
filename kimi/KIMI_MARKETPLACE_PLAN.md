# Octagon on the Kimi plugin marketplace

Plan for shipping both Octagon plugins — **Octagon AI** (public markets) and
**Octagon Prediction Markets** — as Kimi plugins, listed in Moonshot AI's
official plugin marketplace, from the same source and packaging tool that
produce the OpenAI, Grok, and Gemini packages, without changing any of those
outputs.

Verified against the public record on 2026-11-05: the Kimi Code CLI plugin and
MCP docs, the `MoonshotAI/kimi-code` source (`manifest.ts`, `types.ts`,
`marketplace.ts`, `marketplaceService.ts`, `config-schema.ts`, `region.ts`),
the merged PRs #4525 (server-side catalog + native MCP OAuth, 2026-11-03) and
#4653 (per-client availability, 2026-11-03), four closed third-party catalog
PRs and the maintainers' replies, the Kimi Help Center (overview, create,
publish, Plugin Center), the Kimi Platform hosted-agents plugin docs and the
`/v1/plugins` OpenAPI contract, and a live anonymous read of the two regional
catalogs (`api.kimi.ai` and `api.kimi.com`, `/coding/v1/plugins/marketplace`).

---

## 0. Decisions, up front

| Decision | Choice | Why |
|---|---|---|
| Which "Kimi marketplace" | **All three Kimi surfaces, one package.** (1) The **Kimi app** official plugin marketplace (web, mobile, Kimi Work desktop), (2) the **Kimi Code** CLI/Desktop marketplace (Official and Curated tabs), (3) the **Kimi Platform** hosted-agents plugin catalog (project-scope, self-serve). | They share one manifest format (`kimi.plugin.json`), one validator, and, since PR #4525, one server-side catalog family. The Kimi app only runs the MCP and Skills components of a plugin, which is exactly what we ship. |
| Manifest location | **`kimi.plugin.json` at the package root**, never `.kimi-plugin/plugin.json` | The CLI accepts both (root wins), but the hosted validator that gates the official marketplace requires the root file: "the archive must contain `kimi.plugin.json`, with `skills/` and `locales/` beside it". One layout that every surface accepts. |
| Transport and auth | Remote Streamable HTTP, `{"url": "https://mcp.octagonai.co/…", "auth": "oauth"}`; no API keys, no headers, no stdio | `auth: "oauth"` is the native OAuth flag in Kimi's MCP config schema (`config-schema.ts`); plugin manifests reuse that schema. PR #4525 made native OAuth the plugin path and ties disable/uninstall to token revocation. The hosted platform forbids stdio outright. Our server already passes the same discovery chain Gemini CLI uses (RFC 9728 → `login.octagonai.co` metadata, DCR, PKCE S256). |
| Tool scope of the public-markets plugin | **Add a `/public-markets/mcp` preset to `octagon-remote-mcp`** that serves `octagon-agent` and `octagon-deep-research-agent` only; point the Kimi public-markets plugin at it. Belt-and-braces: also set `enabledTools` on the server entry. | Kimi's per-server `enabledTools` allow-list exists in the CLI schema, but the hosted validator's handling of it is undocumented and the Kimi app's plugin detail page lists whatever the server advertises. A server-side preset is the only scope control that holds on every surface, and it retroactively fixes the gap the Grok plan documented (§11 there) for every vendor. One small PR: a fourth `ToolSet` preset and route, mirroring `/deep-research/mcp`. |
| Components shipped | `kimi.plugin.json`, `skills/` (the same built catalogs: 68 and 7), `locales/zh-CN.json`, `SYSTEM.md` (routing rules, from the Gemini context file), `assets/icon.png`, `README.md`, `LICENSE`. **No** agents, hooks, commands | Least privilege and the same posture as the other vendors. The Kimi app ignores agents/hooks/commands anyway; shipping them would only widen the review surface in Kimi Code. `SYSTEM.md` and `sessionStart.skill` are the two Kimi-native additions and both are display-safe no-ops on the web surface. |
| Localization | **Bilingual from day one**: `defaultLocale: "en-US"` plus a complete `locales/zh-CN.json` (interface text, every skill's name and description, the MCP server's name and description) | The hosted validator requires the other language's file when `interface` is present, and a complete one. Every live catalog entry carries `locale.zh-cn`. Translations are source files beside each profile (`openai/kimi/<locale>.json`, `openai/profiles/prediction-markets/kimi/<locale>.json`), reviewed once by a native speaker, and the build fails if a skill lacks one. |
| Unit of distribution | **One public GitHub repository per plugin** (`OctagonAI/octagon-ai-kimi-plugin`, `OctagonAI/octagon-prediction-markets-kimi-plugin`), each release carrying a ZIP asset plus its SHA-256, mirrored from `kimi/plugins/<name>/` by the same workflow pattern as the Gemini mirrors | Kimi Code installs from a GitHub repo URL (latest release, else default branch) with the manifest at the root; Plugin Builder imports a repo URL; Moonshot re-hosts curated ZIPs on its own CDN with a `sha256sum`, so a stable release ZIP is what they will copy. The monorepo also publishes a **custom marketplace JSON** (`kimi/marketplace.json`) so anyone can browse both plugins today with `/plugins marketplace <url>`. |
| Versioning | Manifest `version` = the profile's `plugin.config.json` version (1.1.2 / 1.0.2 today); release tag `v<version>`; ZIP name `<plugin>-kimi-<version>.zip` | Kimi derives the catalog version from the GitHub source when the entry has none, re-hosts by version, and the hosted platform rejects a re-used version with 409. Same rule as every other target. |
| Catalog category and region | `finance`; declare availability for both regions and both clients (`clients: ["desktop","cli"]`, `platforms` all), and let Moonshot's region split decide | `finance` is in the fixed vocabulary and is the busiest category in the Kimi app (S&P, SEC, IMF, World Bank, Wind). Every live entry is `region: all`. Mainland-China reachability of `mcp.octagonai.co` and `login.octagonai.co` is a Moonshot-side judgment we cannot test; see §10. |
| Billing | `free` (Octagon account required; prediction-market report generation uses Octagon credits, stated in the listing) | Matches how the live third-party entries are classified. Kimi Datasource, the finance incumbent, is `paid`; a free, cited, US-equity + prediction-markets plugin is a clear position next to it. |

---

## 1. The Kimi plugin surface, in facts

### 1.1 Three surfaces, one plugin definition

| Surface | Who sees it | Components run | Catalog | How a third party gets in |
|---|---|---|---|---|
| **Kimi app** (kimi.com web, mobile, **Kimi Work** desktop) | Consumers and professionals; plugins usable with the K3 / K3 Swarm models and in Deep Research, Build, and PPT modes; "Enterprise-only" flag exists | Web: **MCP + Skills only**. Kimi Work: full definition | Official plugin marketplace, categories Finance / Productivity / Development / Creative / General; visibility varies by region (domestic vs overseas) and surface | Build or import the plugin into **Plugins → Personal** with the built-in **Plugin Builder** skill (Kimi Work), test it, then on the plugin detail page click **✉️ → "Apply for official marketplace publication"** and give a contact email. Moonshot's review team evaluates "content and test results" and replies by email. No public SLA. |
| **Kimi Code** (CLI, Desktop, Web/Remote Control) | Developers; the "Official" and "Curated" tabs of `/plugins`, plus "Custom" (any URL) | Full definition: skills, agents, hooks, commands, system prompt, MCP | **Server-side** since 2026-11-03: `GET {baseUrl}/plugins/marketplace`, where `baseUrl` is `https://api.kimi.ai/coding/v1` (global) or `https://api.kimi.com/coding/v1` (mainland). Anonymous read allowed. The legacy static catalog at `code.kimi.ai` and `code.kimi.com` (`/kimi-code/plugins/marketplace.json`) still answers but is stale (`version: "1"`). | **No self-serve path.** `plugins/marketplace.json` was removed from the repo; the last third-party PRs (Aeon #4149, CentricMem #3623, Mem0 #2944, You.com #2093) were closed, Mem0 with the bot reply: "external feature PRs are not accepted directly — features are discussed and decided in issues first". The two third-party entries that did land (Modern Web Guidance, Tencent CloudBase) were committed by a maintainer. Route: an **issue** in `MoonshotAI/kimi-code` with the ready entry, plus the same ✉️ application. |
| **Kimi Platform** hosted agents (`platform.kimi.com`, API `api.moonshot.cn`, `kha` CLI, console) | API customers building hosted agents | MCP (remote `url` only) + Skills | Two scopes: `official` (platform-curated, read-only) and `project` (self-published, visible to that project) | `POST /v1/plugins/validate` then `POST /v1/plugins` with the ZIP (bearer `sk-…` key, header `kimi-api-version: 2026-09-01-beta`). Immediate, no review. Promotion to `official` is Moonshot's call. |

The Kimi app and Kimi Code catalogs are the same catalog family: the Kimi app
overview says "Kimi Plugin follows the Kimi Code plugin definition", PR #4525
moved Kimi Code onto the server-side catalog with `distribution`, `billing`,
`clients`, `platforms`, and `locale` fields, and the hosted platform's
validator issue codes name the same manifest fields (`manifest.name.pattern`,
`interface.hostKind`).

### 1.2 The manifest, as the parser reads it

`kimi.plugin.json` (root) or `.kimi-plugin/plugin.json`; root wins. Only
`name` can invalidate a manifest; every other problem is a diagnostic.

| Field | Contract | Our use |
|---|---|---|
| `name` | Required. CLI regex `[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*(@[A-Za-z0-9_-]+)?`; hosted validator demands kebab-case (`manifest.name.pattern`: "must be kebab-case"); normalized lowercase; it is the plugin id and the skill namespace (`/skill:<plugin>:<skill>`) | `octagon-ai`, `octagon-prediction-markets` (same ids as every other vendor) |
| `version` | Semver; the hosted platform reads the published version from here and rejects re-use (409) | Profile version |
| `description`, `keywords`, `author {name,email}`, `homepage`, `license` | Display | From the profile |
| `skills` | `./`-prefixed paths inside the root; each must exist and contain `SKILL.md`; omitted means a root `SKILL.md` | `["./skills/"]` |
| `sessionStart.skill` | Loads one plugin skill into the main agent on new/resumed sessions | `get-started` / `prediction-markets-get-started` (the profiles' `onboardingSkill`) |
| `skillInstructions` | Appended whenever a plugin skill loads | One sentence: cite sources, never recommend a trade |
| `systemPrompt` / `systemPromptPath` | ≤ 32 KB each, 64 KB across all plugins; file read at install/reload | `systemPromptPath: "./SYSTEM.md"` generated from the Gemini context builder (≈160 words) |
| `mcpServers` | The MCP config schema: `{url, headers?, auth?: "oauth", bearerTokenEnvVar?, enabledTools?, disabledTools?, deferred?, startupTimeoutMs?, toolTimeoutMs?}`; `url` without `transport` ⇒ HTTP; `transport: "sse"` for legacy; stdio needs `./` paths. Hosted platform: `url` only, no stdio | `{"url": …, "auth": "oauth", "enabledTools": [...]}` |
| `interface` | `displayName`, `shortDescription`, `longDescription`, `developerName`, `websiteURL`, `defaultLocale`, `locales` (a `./` directory), `mcpOverrides{key:{displayName,description,iconUrl}}`, `skillOverrides{dir:{displayName,description}}`. Hosted validator adds **required**: `displayName`, `shortDescription` (**≤ 20 characters, no trailing punctuation**), `longDescription`, `developerName`, `tryPrompts` (≥ 1), `defaultLocale` (`zh-CN` or `en-US`), `locales` fixed to `"./locales/"`; a `skillOverrides` entry for **every** skill directory and an `mcpOverrides` entry for every server; a complete translation file for the other language | All of it, generated |
| `agents`, `hooks`, `commands` | Supported in Kimi Code, ignored on web | Not shipped |
| `tools`, `apps`, `inject`, `configFile` | Legacy `kimi-cli` fields; diagnostics only | Never emitted; a rule forbids them |

Package limits (hosted validator): ZIP ≤ 64 MiB, expanded ≤ 128 MiB, ≤ 500
entries. Our largest package today is 203 files / 340 entries including
directories / 1.4 MB, so there is headroom but not unlimited: a rule asserts
the count.

### 1.3 The catalog entry, as the live service returns it

Live entries (both regions, 2026-11-05): `cloudbase`, `kimi-browser-extension`,
`kimi-cu`, `kimi-cu-win`, `kimi-datasource` (the only `billing: "paid"`),
`modern-web-guidance`, `superpowers`, `vercel`. Every one has `iconUrl`,
`locale.zh-cn`, `clients: ["desktop","cli"]`, `platforms` for all three OSes,
`distribution: {category: "official"|"third_party", region: "all",
defaultInstall: false, weight: 1}`, and a Moonshot-hosted `source` ZIP
(`kimi-for-coding-plugins.tos-cn-beijing.volces.com/plugins/<id>/<version>/<sha-prefix>`)
with `sha256sum` and `filename`. Entry fields: `id`, `displayName`, `version`,
`description`, `shortDescription`, `longDescription`, `cliDescription`,
`homepage`, `keywords`, `source`, `iconUrl`, `sha256sum`, `filename`,
`locale`, `clients`, `platforms`, `distribution`, `billing`.

Consequences: Moonshot copies our ZIP, so a stable, versioned release asset is
what to hand them; the icon is a hosted URL we must serve; `cliDescription` is
a third, terse copy variant the TUI shows instead of the long description; and
the install path verifies OS, SHA-256, and that the manifest `name` equals the
catalog `id`.

### 1.4 What our server already satisfies

Same facts as the Gemini plan §1.3, re-checked for Kimi's client: a 401 with
`WWW-Authenticate: … resource_metadata=…` on the MCP endpoint, RFC 9728
protected-resource metadata naming `https://login.octagonai.co`, authorization
server metadata with `registration_endpoint` (dynamic client registration),
PKCE `S256`, and `none` token-endpoint auth. Kimi's native OAuth (`auth:
"oauth"`) and the hosted platform's vault (`MCPOAuthCredential` with discovery,
DCR, token exchange, background refresh) both follow that path. Kimi warns
that old `mcp-remote` tokens are not migrated; irrelevant to us, we never used
it. Per-endpoint `instructions` (shipped 2026-11-04 in PR #23) are returned on
`initialize`, which Kimi surfaces in plugin details.

---

## 2. Requirements checklist, mapped

| Requirement | Source | Where it is satisfied |
|---|---|---|
| `kimi.plugin.json` at the archive root, `skills/` and `locales/` beside it | Hosted validator | `KimiTarget.emit` layout; `KimiArchiveShapeRule` |
| `name` kebab-case; equals catalog `id`; equals mirror-repo plugin id | Validator, install check | `KimiManifestRule`; `RepoSync` naming |
| `interface.shortDescription` ≤ 20 chars, no trailing punctuation | Validator | New config field `kimi.shortDescription` (the OpenAI one is 29 and 27 chars); `KimiInterfaceRule` |
| `tryPrompts` ≥ 1 | Validator | From `listing.smokeTests[].prompt` (first three) |
| `defaultLocale` ∈ {en-US, zh-CN}; `locales` = `"./locales/"`; complete other-language file incl. every `skillOverrides` and `mcpOverrides` key | Validator | `KimiLocaleBuilder` + `KimiLocaleRule` (fails on any missing key) |
| `skillOverrides` for every skill dir with `displayName` + `description` | Validator | Generated from each `SKILL.md` frontmatter |
| `mcpOverrides` for every server key with `displayName` + `description` (+ `iconUrl`) | Validator | Generated from `kimi.serverName`, `interface.displayName`, the toolset's purpose, hosted icon URL |
| Remote `url` MCP only; `auth: "oauth"`; no stdio; no headers; no secrets | Validator, our policy | `KimiMcpRule` (https, Octagon host, `auth: "oauth"`, no `headers`/`bearerTokenEnvVar`), `SecretScanRule` |
| No `tools`/`apps`/`inject`/`configFile`/`hooks`/`agents`/`commands` | Our policy | `KimiComponentScopeRule` (same shape as the Grok/Gemini scope rules) |
| ≤ 500 entries, ≤ 64 MiB | Validator | `KimiArchiveShapeRule` on the built ZIP |
| `systemPromptPath` file ≤ 32 KB, UTF-8 | CLI | `KimiSystemPromptRule` |
| Hosted icon URL, square PNG | Catalog | Publish `assets/icon.png` at `https://www.octagonai.co/plugins/<name>/icon.png` (octagonai.co PR); manifest `mcpOverrides.*.iconUrl` and README reference it |
| Release ZIP + SHA-256 per version; repo installable by URL | Kimi Code install, Moonshot re-hosting | Mirror workflow (§5) |
| Brand-safe copy, no competitor names, no "API key" wording | Our rules | Existing `ForbiddenTextRule` set, extended with the zh-CN file |

---

## 3. Package design

### 3.1 Layout (`kimi/plugins/<name>/`, committed; also the release ZIP root)

```
octagon-ai/
├── kimi.plugin.json
├── SYSTEM.md                 # routing + citation rules (from GeminiContextBuilder)
├── README.md                 # reviewer- and user-facing, same sections as Grok/Gemini
├── LICENSE
├── assets/icon.png
├── locales/zh-CN.json
└── skills/<68 skills>/SKILL.md (+ references/)
```

### 3.2 `kimi.plugin.json` — Octagon AI (public markets)

```json
{
  "name": "octagon-ai",
  "version": "1.1.2",
  "description": "Cited AI research on public companies: SEC filings, earnings call transcripts, financial statements, market data, and analyst estimates.",
  "author": { "name": "Octagon AI", "email": "contact@octagonai.co" },
  "homepage": "https://www.octagonai.co/",
  "license": "MIT",
  "keywords": ["finance", "equity-research", "sec-filings", "earnings-calls", "market-data", "mcp"],
  "skills": ["./skills/"],
  "sessionStart": { "skill": "get-started" },
  "skillInstructions": "Cite the source of every figure. Octagon is read-only research: never recommend, place, or route a trade.",
  "systemPromptPath": "./SYSTEM.md",
  "mcpServers": {
    "octagon": {
      "url": "https://mcp.octagonai.co/public-markets/mcp",
      "auth": "oauth",
      "enabledTools": ["octagon-agent", "octagon-deep-research-agent"]
    }
  },
  "interface": {
    "displayName": "Octagon AI",
    "shortDescription": "Cited stock research",
    "longDescription": "<interface.longDescription from the profile>",
    "developerName": "Octagon AI",
    "websiteURL": "https://www.octagonai.co/",
    "tryPrompts": [
      "Summarize the risk factors in Apple's latest 10-K.",
      "What guidance did NVIDIA give on last quarter's earnings call?",
      "Compare Apple's and Microsoft's revenue growth over the last three fiscal years."
    ],
    "defaultLocale": "en-US",
    "locales": "./locales/",
    "mcpOverrides": {
      "octagon": {
        "displayName": "Octagon research server",
        "description": "Cited answers from SEC filings, earnings transcripts, financials, prices, and analyst estimates. Sign in with your Octagon account.",
        "iconUrl": "https://www.octagonai.co/plugins/octagon-ai/icon.png"
      }
    },
    "skillOverrides": {
      "sec-10k-analysis": { "displayName": "10-K analysis", "description": "<SKILL.md description>" },
      "...": {}
    }
  }
}
```

Until the `/public-markets/mcp` preset ships, the URL is `/mcp` and
`enabledTools` carries the scope alone; the build reads the URL from
`kimi.mcpUrl` so the switch is a one-line config change and a regenerate.

### 3.3 `kimi.plugin.json` — Octagon Prediction Markets

Same shape with: `name: "octagon-prediction-markets"`, `version: "1.0.2"`,
server key `octagon-predictions` → `https://mcp.octagonai.co/prediction-markets/mcp`
(already scoped server-side; `enabledTools` listing both tools anyway),
`sessionStart.skill: "prediction-markets-get-started"`,
`shortDescription: "Event odds research"` (19 chars), `tryPrompts` from the
profile's smoke tests (event brief, probability history, mispricing), and
`skillInstructions` stating research-only, no bets, credits used when a new
report is generated.

### 3.4 `locales/zh-CN.json`

Mirrors every display field: `displayName`, `shortDescription` (≤ 20
characters, Chinese counts the same), `longDescription`, `developerName`,
`tryPrompts`, `mcpOverrides`, and `skillOverrides` for all 68 / 7 skills.
Source of truth is one file per locale beside each profile, declared in the
config as `kimi.translations`: `openai/kimi/zh-CN.json` and
`openai/profiles/prediction-markets/kimi/zh-CN.json`, keyed by skill
directory. The default locale has its own file (`kimi/en-US.json`) that only
names the skills; descriptions come from `SKILL.md`. The build fails when a
skill has no entry in either file, or when a file names a skill that is not
shipped, so adding or renaming a skill means updating both files in the same
PR. Financial terms follow
mainland usage (10-K 年报, 盈利电话会议 earnings call, 分析师预期 analyst
estimates, 预测市场 prediction markets, 市场隐含概率 market-implied
probability); the first translation pass is reviewed by a native speaker
before the submission, after that only deltas.

### 3.5 `SYSTEM.md`

Reuses `GeminiContextBuilder` output (routing to the right skill, "every
answer cites", "never trade or advise", cross-reference to the sibling plugin)
under a Kimi file name. Well under the 32 KB cap; a rule asserts it.

### 3.6 README

`GrokReadmeBuilder`/`GeminiReadmeBuilder` share `readmeSections.mjs`; a
`KimiReadmeBuilder` adds the Kimi-specific install block:

```
/plugins install https://github.com/OctagonAI/octagon-ai-kimi-plugin
/reload
```

plus the Plugin Builder import sentence for the Kimi app ("paste this
repository link into Plugin Builder"), the OAuth note, the scope note, and
the smoke tests, in that order.

---

## 4. Tooling: a fourth output target, additively

Everything below is in `tools/openai-plugin`, following the `Target` contract
(`id`, `manifestPath`, `repoDir`, `checkConfig`, `emit`, `rules`, `finalize`).
No existing target changes.

| Piece | Path | Notes |
|---|---|---|
| `KimiTarget` | `lib/target/KimiTarget.mjs` | `id: "kimi"`, `manifestPath: "kimi.plugin.json"`, `repoDir: "kimi/plugins"`. `checkConfig` demands the `kimi` block, `kimi.shortDescription` ≤ 20 chars without trailing punctuation, an Octagon-owned `mcpUrl`, an i18n file whose keys cover every skill. `emit` writes manifest, `SYSTEM.md`, README, LICENSE, icon, `locales/zh-CN.json`. `finalize` zips the staged directory to `out/<name>-kimi-<version>.zip` and writes `<zip>.sha256` (the only target that both commits a directory **and** produces an archive). |
| `KimiManifestBuilder` | `lib/manifest/KimiManifestBuilder.mjs` | Builds the manifest from `PluginConfig` + skills; `skillOverrides` from each skill's frontmatter `name`/`description`; `tryPrompts` from `listing.smokeTests` (capped at 3). |
| `KimiTranslations` | `lib/manifest/KimiTranslations.mjs` | Immutable value object for one locale's file: validates the shape per role (default locale names skills; other locales translate everything), and `assertCovers` fails with every gap at once. `KimiManifestBuilder.localeText` renders `locales/<locale>.json` from it. |
| `KimiSystemPromptBuilder` | `lib/manifest/KimiSystemPromptBuilder.mjs` | §3.5. |
| `KimiReadmeBuilder` | `lib/manifest/KimiReadmeBuilder.mjs` | §3.6. |
| Config | `lib/config/PluginConfig.mjs` → `kimi()` | Block: `serverName`, `mcpUrl`, `enabledTools`, `shortDescription`, `cliDescription`, `repository`, `repoDescription`, `iconUrl`, `translations: { "en-US": "./kimi/en-US.json", "zh-CN": "./kimi/zh-CN.json" }` (profile-relative), `systemPromptNotes`. URLs parsed at load like the other blocks. |
| Rules | `lib/validation/rules/kimi/` | `KimiManifestRule` (name regex + kebab, required interface fields, `tryPrompts` ≥ 1, `defaultLocale`, `locales` literal), `KimiInterfaceRule` (20-char rule on both languages, no trailing punctuation), `KimiLocaleRule` (key-for-key coverage, zh-CN only contains known keys), `KimiMcpRule` (https, owned host, `auth: "oauth"`, no `headers`/`bearerTokenEnvVar`/`command`, `enabledTools` ⊆ known tools), `KimiComponentScopeRule` (no agents/hooks/commands/legacy fields), `KimiSystemPromptRule` (≤ 32 KB, UTF-8, file exists), `KimiArchiveShapeRule` (root manifest, `skills/` + `locales/` siblings, ≤ 500 entries, ≤ 64 MiB). Reuses `ForbiddenTextRule`, `SecretScanRule`, `SkillRule`, `LinkIntegrityRule`, `ImageRule`. |
| Catalog | `kimi/marketplace.json` (committed, generated by `cli.mjs catalog --target kimi`, drift-checked with `--check`; written through `CatalogSync`, confined like `RepoSync`) | `{"version":"2","plugins":[{id, displayName, description, shortDescription, longDescription, homepage, keywords, iconUrl, version, source: <release ZIP URL>, clients:["desktop","cli"], platforms:["macos","windows","linux"]}]}`. This is both the self-serve custom marketplace (`/plugins marketplace https://raw.githubusercontent.com/OctagonAI/octagon-claude-plugin/main/kimi/marketplace.json`) and the entry text we hand Moonshot. `cli.mjs entry --target kimi` prints one entry. |
| CLI / scripts | `cli.mjs`, `package.json` | `TARGET_IDS` gains `kimi`; `entry`, `about`, and the new `catalog` command accept `--target kimi`; `validate` inspects whatever archive the target names (`Target.archiveName`); scripts `build:kimi`, `build:kimi:predictions`, `sync:kimi`, `check:kimi`, `entry:kimi`, `about:kimi`, `catalog:kimi`; `validate-plugin.yml` runs `check:kimi`. The `Target` contract gains `allowList(config)` and `archiveName(config)`, and rule options carry the loaded config, so no target hard-codes another's block. |
| Tests | `tests/openai-plugin/kimi-*.test.mjs` | Target emit layout; every rule positive + negative; locale coverage failure; 20-char rule with CJK; archive entry count; catalog entry shape. |
| Docs | `kimi/README.md` | Short: what is here, how it is generated, how to install, link to this plan. |

Estimated size: ≈ 900 lines of code and tests, modeled on the Gemini target PR.

---

## 5. Mirror repositories and the publish workflow

Generalize `publish-gemini-extensions.yml` into a matrix over
`{gemini, kimi}` (or add `publish-kimi-plugins.yml` with the same body) using
the same GitHub App token and the same guards (freshness vs tip of main,
same-version content guard, idempotent tag/release). Per Kimi plugin, on a
version change on `main`:

1. Sync `kimi/plugins/<name>/` to the mirror repo (`OctagonAI/octagon-ai-kimi-plugin`, `OctagonAI/octagon-prediction-markets-kimi-plugin`), About text = `kimi.repoDescription`, topics `kimi-plugin`, `mcp`, `finance`.
2. Tag `v<version>`, publish a GitHub Release with assets `<name>-kimi-<version>.zip` and `<name>-kimi-<version>.zip.sha256` (the ZIP from `finalize`, byte-identical to the committed directory).
3. Regenerate `kimi/marketplace.json` `source` to the release asset URL and `version` to the new version (committed in the same release PR, so the catalog never points at a missing asset).

Secrets are the ones the Gemini workflow already needs
(`GEMINI_MIRROR_APP_ID` / `_PRIVATE_KEY`, to be renamed `MIRROR_APP_*` in the
hardening plan A1); the App's repository list grows by two.

---

## 6. Submission runbook

Order matters: self-serve first (gives the validator's verdict and a working
install for reviewers), then the two applications in parallel.

### 6.1 Pre-flight (us, one day)

1. Merge the tooling PR; `npm run build:kimi && npm run build:kimi:predictions`; `check:kimi` green.
2. Publish the two icons on octagonai.co (`/plugins/<name>/icon.png`, 512×512 PNG, the existing composer icon).
3. Merge the `/public-markets/mcp` preset in `octagon-remote-mcp` and deploy (user consent on deploy, as always); switch `kimi.mcpUrl`, regenerate.
4. Create the two mirror repos (user), add them to the GitHub App, run the publish workflow; confirm `v1.1.2` / `v1.0.2` releases with ZIP + sha256.
5. **Hosted validator**: `POST https://api.moonshot.cn/v1/plugins/validate` (header `kimi-api-version: 2026-09-01-beta`, bearer a Kimi Platform `sk-…` key the user creates at platform.kimi.com) with each ZIP; fix every `error`, read every `warn`. Try `api.moonshot.ai` first for the global platform; fall back to `.cn`. This is the same validator the official marketplace applies; a clean report is the strongest thing we can attach to the applications.
6. Optionally `POST /v1/plugins` to publish both as **project-scope** plugins on the hosted platform (self-serve, immediate). This is distribution in its own right for API customers and proves the OAuth vault flow end to end.

### 6.2 Kimi Code: smoke test, then the issue (us; Ken or Andres as the GitHub voice)

1. In Kimi Code CLI: `/plugins install https://github.com/OctagonAI/octagon-ai-kimi-plugin`, `/reload`, `/plugins info octagon-ai` (expect zero diagnostics), run the three `tryPrompts`; confirm the OAuth prompt opens `login.octagonai.co`, that `/mcp` shows the server connected, and that `/skill:octagon-ai:get-started` loads. Repeat for prediction markets, including one new-report generation.
2. `/plugins marketplace https://raw.githubusercontent.com/OctagonAI/octagon-claude-plugin/main/kimi/marketplace.json` lists both with icons and zh-CN text when the locale is Chinese.
3. Open **one issue** in `MoonshotAI/kimi-code`: "plugins: add Octagon AI and Octagon Prediction Markets to the curated marketplace". Body: the two catalog entries (from `cli.mjs entry --target kimi`), release ZIP URLs + SHA-256, the validator report summary, the OAuth description (DCR + PKCE, free Octagon account, no API key), the scope statement (read-only research, no trading), the smoke-test transcript, and a test account offer. Do **not** open a PR; the catalog is no longer in the repo and the CONTRIBUTING rule routes features through issues.

### 6.3 Kimi app: Plugin Builder, then the application (Ken, in Kimi Work)

1. Install the latest Kimi Work desktop app, sign in, type `/` → Plugin Builder → paste `https://github.com/OctagonAI/octagon-ai-kimi-plugin`. It recognizes native `kimi.plugin.json` ("required fields are corrected", so a native, valid manifest imports untouched). Repeat for the prediction-markets repo.
2. **Plugins → Personal → +** on each; run the `tryPrompts` in a new conversation with the K3 model; complete OAuth; confirm "Using the Octagon AI plugin" appears and answers carry citations.
3. On each plugin's detail page: **✉️ → "Apply for official marketplace publication"**, contact `contact@octagonai.co` (monitored), and in the free-text field paste the submission note (§7.3).
4. Expect email follow-up requesting materials; the standard pack (§7.4) is ready in advance.

### 6.4 After listing

Listing copy is Moonshot's copy of our manifest at a version; an update is a
new release + a short note on the issue / reply to the review email with the
new ZIP URL and SHA. Keep the self-serve catalog and the mirror repos as the
always-current reference.

---

## 7. Listing copy and submission pack

### 7.1 Catalog entry — Octagon AI

```json
{
  "id": "octagon-ai",
  "displayName": "Octagon AI",
  "version": "1.1.2",
  "shortDescription": "Cited stock research",
  "cliDescription": "Cited research on public companies: SEC filings, earnings calls, financials, market data, analyst estimates. Free Octagon account; OAuth on first use.",
  "description": "Octagon AI research on public companies (MCP server + 68 skills). Cited answers from SEC filings (10-K, 10-Q, 8-K, S-1, proxies), ten years of earnings call transcripts, financial statements and ratios, stock prices, analyst estimates, and price targets. Read-only research: no trades, no personalized advice. Requires a free Octagon account.",
  "homepage": "https://www.octagonai.co/",
  "keywords": ["finance", "equity-research", "sec-filings", "earnings-calls", "market-data", "analyst-estimates", "mcp"],
  "iconUrl": "https://www.octagonai.co/plugins/octagon-ai/icon.png",
  "source": "https://github.com/OctagonAI/octagon-ai-kimi-plugin/releases/download/v1.1.2/octagon-ai-kimi-1.1.2.zip",
  "clients": ["desktop", "cli"],
  "platforms": ["macos", "windows", "linux"]
}
```

### 7.2 Catalog entry — Octagon Prediction Markets

Same shape: `shortDescription: "Event odds research"`, `cliDescription`:
"Cited research on Kalshi and Polymarket markets: odds, drivers, probability
history, Trust Scores, mispricing vs Octagon's model. Research only, no bets.
Free Octagon account; OAuth on first use.", keywords
`["prediction-markets","kalshi","polymarket","odds","forecasting","trust-score","mcp"]`,
source the PM release ZIP.

### 7.3 Submission note (≤ 120 words, pasted into the ✉️ form and the issue)

> Octagon AI builds cited financial research for investment professionals. We
> are submitting two plugins: **Octagon AI** (public companies: SEC filings,
> earnings calls, financials, market data, analyst estimates; 68 skills) and
> **Octagon Prediction Markets** (Kalshi and Polymarket: odds, drivers,
> probability history, Trust Scores, mispricing; 7 skills). Both connect to one
> remote MCP server over OAuth (dynamic client registration, PKCE), need no API
> key, are read-only research (no trading, no funds, no personalized advice),
> ship complete en-US and zh-CN interface text, and pass
> `POST /v1/plugins/validate` with no errors. Install for review:
> `/plugins install <repo url>`. Test account and demo on request:
> contact@octagonai.co.

### 7.4 Materials pack (prepared before submitting)

Validator reports (both ZIPs), the two release URLs + SHA-256, a 60-second
screen recording per plugin in Kimi Work (install → OAuth → one tryPrompt →
cited answer), a seeded Octagon test account with prediction-market credits,
privacy policy and terms URLs, support email, the zh-CN review sign-off, and
the one-paragraph description of what the OAuth scopes grant.

---

## 8. Smoke test (before relying on the listing, and after each release)

| Step | Expect |
|---|---|
| `/plugins info octagon-ai` (CLI) | No diagnostics; skills 68; MCP `octagon` http, enabled |
| First tool call | Browser opens `login.octagonai.co`; after consent the call completes; `/mcp` shows connected |
| `tryPrompts[0..2]` | Cited answers with filing dates / call dates / fiscal years |
| Prediction markets: event brief for a Kalshi URL | Resolution criteria, timestamped probability, drivers with sources, no side recommended |
| `/plugins mcp disable … ; /reload` | Tools gone; re-enable asks for OAuth again only if the token was revoked |
| Locale `zh-CN` | Detail page shows Chinese `displayName`, descriptions, skill names |
| Kimi Work import | Plugin Builder reports both plugins usable; Personal tab shows icons |
| Hosted platform | `GET /v1/plugins?scope=project` lists both with `needs_oauth: true` and `url` filled |

---

## 9. Work plan

| # | Work | Repo | Owner | Depends on |
|---|---|---|---|---|
| K1 | `ToolSet.publicMarkets` + `/public-markets/mcp` route + tests | octagon-remote-mcp | Andres | — |
| K2 | `kimi` target, rules, builders, config block, tests, `kimi/plugins/*`, `kimi/marketplace.json`, `kimi/README.md`, CI, publish workflow | octagon-claude-plugin | Andres | — |
| K3 | zh-CN translation files (68 + 7 skills + interface) drafted with K2; native-speaker review before submission | octagon-claude-plugin | Andres drafts; reviewer TBD | K2 |
| K4 | Icons at `/plugins/<name>/icon.png` | octagonai.co | Andres | — |
| K5 | Mirror repos, App access, publish workflow extension, first releases | GitHub / octagon-claude-plugin | Andres (user creates repos) | K2, K3, hardening A1 secrets |
| K6 | Hosted validator run; optional project-scope publish | Kimi Platform | Andres (user creates `sk-` key) | K5 |
| K7 | Kimi Code smoke test + issue | kimi-code | Andres / Ken | K5, K6 |
| K8 | Kimi Work import, test, ✉️ application, materials pack | Kimi Work | Ken | K5, K6 |
| K9 | Website "Use Octagon in Kimi" connect card | octagonai.co | Andres | Listing live |

Sequencing: K1, K2, K4 in week 1 (independent PRs); K3 drafted alongside K2
and reviewed in week 2; K5–K6 the day K3 merges; K7–K8 the same week.

---

## 10. Risks and how the plan absorbs them

| Risk | Likelihood | Mitigation |
|---|---|---|
| Curated/official listing is discretionary and undocumented beyond "content and test results"; third-party PRs have been closed for months | High | Three parallel routes; the self-serve custom marketplace and Plugin Builder import make both plugins usable today regardless; the validator report and smoke transcripts remove every objective objection in advance |
| Mainland-China users cannot reach `mcp.octagonai.co` / `login.octagonai.co`, or Moonshot restricts the entry to `overseas` | Medium | Declare both regions and state in the note that the service is hosted in the US; accept an overseas-only listing; the Kimi app already segments by region |
| Hosted validator rejects `enabledTools` or `auth: "oauth"` as unknown server fields, or warns on them | Medium | K1 makes `enabledTools` redundant; `auth` is in the shipped MCP schema. If the validator errors, drop the field for the hosted ZIP only (a `kimi.hostedProfile` switch), keep it for the CLI package |
| 20-character `shortDescription` in Chinese reads awkwardly or is counted differently | Low | Both strings are ≤ 20 code points and ≤ 20 characters by any count; reviewer confirms |
| 500-entry ZIP cap as the skill catalog grows (340 entries today) | Low, later | Rule fails the build at 450 with a message; references can be consolidated per skill |
| Kimi re-hosts an old ZIP after we release a fix | Medium | Every release is immutable and versioned; a one-line reply on the issue / email with the new URL and SHA is the documented update path; the self-serve catalog is always current |
| Review asks for things we do not ship (hooks, commands, local tools) | Low | The scope note explains least privilege; the Kimi app does not run those components anyway |
| Translation drift when skills change | Medium | Build-time coverage check; translations live beside the code and are reviewed in the same PR |

---

## 11. What this plan deliberately does not do

- No `.kimi-plugin/plugin.json` compatibility copy: one manifest, one layout.
- No stdio or bundled Node server (the way Kimi Datasource ships): our value is the hosted, OAuth-gated service, and the hosted platform forbids stdio.
- No change to the OpenAI, Grok, or Gemini outputs; `check:*` for each stays byte-identical.
- No Kimi-specific skill content: the same catalogs ship everywhere; only the manifest, locale file, SYSTEM.md, and README are Kimi-shaped.
