# Kimi plugins

This directory holds the two Octagon plugins in Kimi's native plugin format, for the Kimi app (web, mobile, Kimi Work desktop), Kimi Code (CLI and Desktop), and the Kimi Platform's hosted agents. Each one is a self-contained plugin directory, generated from the same profiles and skill catalog that produce the OpenAI, Grok, and Gemini packages, and mirrored to its own public repository with a release ZIP per version.

| Directory | Plugin | Mirror repository |
|---|---|---|
| `plugins/octagon-ai/` | `octagon-ai` (public markets) | `OctagonAI/octagon-ai-kimi-plugin` |
| `plugins/octagon-prediction-markets/` | `octagon-prediction-markets` | `OctagonAI/octagon-prediction-markets-kimi-plugin` |

`marketplace.json` is a Kimi Code custom marketplace listing both plugins by release asset. Anyone can browse and install them today with `/plugins marketplace https://raw.githubusercontent.com/OctagonAI/octagon-claude-plugin/main/kimi/marketplace.json`; its two entries are also the text handed to Moonshot for the curated catalog.

**Everything under `plugins/` and `marketplace.json` is generated.** Edit the sources (`openai/plugin.config.json`, `openai/profiles/<name>/`, the `kimi/<locale>.json` translation files beside them, `skills/`), run `npm run sync:kimi`, and commit the result; CI fails when a committed package or the catalog is out of date. The mirror repositories are written only by the publish workflow.

See [KIMI_MARKETPLACE_PLAN.md](KIMI_MARKETPLACE_PLAN.md) for the research, the design, the submission runbook, and the smoke test.

## What each plugin contains

```
kimi.plugin.json        name, version, skills, sessionStart, one remote MCP server, interface text
SYSTEM.md               rules appended to the system prompt while enabled: tools, citations, sign-in, scope
locales/zh-CN.json      the complete interface text in Simplified Chinese
README.md               reviewer- and user-facing description, install paths, endpoints
LICENSE                 MIT, identical to this repository's
assets/icon.png         the plugin icon (also served from octagonai.co for the catalog)
skills/<name>/SKILL.md  the same skills the OpenAI, Grok, and Gemini packages ship
```

The MCP server is declared as `url` + `auth: "oauth"`, Kimi's native MCP OAuth: the host discovers the authorization server from the MCP server's metadata and registers itself dynamically. No headers, keys, hooks, commands, agents, or executables ship. The public-markets plugin connects to `/public-markets/mcp`, which serves the two public-market agents only, and also sets `enabledTools` for hosts that honor it.

## Translations

`interface` text is bilingual, as the hosted validator requires. Each profile carries `kimi/en-US.json` (the English display name of every skill) and `kimi/zh-CN.json` (the full translation: interface text, the server's text, and every skill's name and description). The build fails when a skill has no entry in either file, or when a file names a skill that is not shipped, so adding or renaming a skill means updating both files in the same change. `shortDescription` is at most 20 characters with no trailing punctuation in both languages.

## Commands

```bash
npm run build:kimi                # public markets → out/kimi/octagon-ai/ + out/octagon-ai-kimi-<version>.zip
npm run build:kimi:predictions    # prediction markets → out/kimi/octagon-prediction-markets/ + ZIP
npm run sync:kimi                 # rebuild both, copy them into kimi/plugins/, regenerate kimi/marketplace.json
npm run check:kimi                # rebuild both and fail if kimi/plugins/ or kimi/marketplace.json differs (CI)
npm run entry:kimi                # print each plugin's catalog entry
npm run about:kimi                # print each mirror's About description, homepage, and topics
```

Each build also writes `out/<name>-kimi-<version>.zip.sha256`.

## What the Kimi build checks

On top of the shared rules (skill front matter, relative links, neutral wording, secret scan):

- `kimi.plugin.json` at the root carries only documented fields, a kebab-case name equal to the plugin name, a semver version, `skills: ["./skills/"]`, a `sessionStart` skill that ships, `systemPromptPath: "./SYSTEM.md"`, and none of `agents`, `hooks`, `commands`, or the legacy `tools`/`apps`/`inject` fields.
- `interface` has every field the hosted validator requires: `displayName`, a `shortDescription` of at most 20 characters without trailing punctuation, `longDescription`, `developerName`, one to three `tryPrompts`, `defaultLocale: "en-US"`, `locales: "./locales/"`, an `mcpOverrides` entry (with icon) for the server, and a `skillOverrides` entry for every shipped skill and no other.
- `locales/zh-CN.json` exists and covers the interface text, every prompt, the server, and every skill, key for key; no undeclared locale file ships.
- Exactly one MCP server, `url` over HTTPS at the configured endpoint, `auth: "oauth"`, the configured `enabledTools`, no `command`, `headers`, `bearerTokenEnvVar`, or `transport`.
- `SYSTEM.md` exists, is UTF-8 and well under Kimi's 32 KB cap, names every exposed tool, and states the citation rule, sign-in, and read-only.
- Only skills plus the documented top-level files ship; no executables anywhere.
- The README names the endpoint, OAuth, `/plugins install`, `/reload`, Plugin Builder, every skill, and the license; `LICENSE` is byte-identical to the repository's.
- The ZIP has the manifest at its root with `skills/` and `locales/` beside it, stays under 64 MiB and 500 entries (warning from 450), and matches the staged directory exactly.

## Releases and the mirrors

`.github/workflows/publish-kimi-plugins.yml` runs on every push to `main`. For each plugin it re-runs `check:kimi`, copies the directory into the mirror repository, commits when there is a diff, and, when no `v<version>` tag exists yet, tags it and publishes a GitHub Release with `<name>-kimi-<version>.zip` (manifest at the root) and its `.sha256`. It also asserts the mirror's About description, homepage, and topics.

Kimi Code installs the latest release of a repository URL, Moonshot re-hosts curated ZIPs by version, and the hosted platform refuses a reused version number, so a change ships only when `version` in the profile's `plugin.config.json` changes. One version number per plugin covers OpenAI, Grok, Gemini, and Kimi.

The workflow authenticates with the same GitHub App as the Gemini mirrors (`GEMINI_MIRROR_APP_ID`, `GEMINI_MIRROR_APP_PRIVATE_KEY`), which must also be installed on the two Kimi mirror repositories. Every step is idempotent, so a rerun repairs a partial publish. It runs nothing from the mirrors.

## Testing locally

With Kimi Code installed, point it at the built directory:

```
/plugins install /absolute/path/to/out/kimi/octagon-prediction-markets
/reload
/plugins info octagon-prediction-markets
```

Expect zero diagnostics, then try the prompts in the plugin's README; the first tool call opens the Octagon sign-in. To validate a ZIP against Moonshot's hosted validator (the one the official marketplace applies), see the runbook in the plan.
