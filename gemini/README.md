# Gemini CLI extensions

This directory holds the two Octagon plugins as Gemini CLI extensions. Each one is a self-contained extension directory, generated from the same profiles and skill catalog that produce the OpenAI and Grok packages, and mirrored to its own public repository, which the Gemini CLI extension gallery indexes.

| Directory | Extension | Mirror repository |
|---|---|---|
| `extensions/octagon-ai/` | `octagon-ai` (public markets) | `OctagonAI/octagon-ai-gemini-extension` |
| `extensions/octagon-prediction-markets/` | `octagon-prediction-markets` | `OctagonAI/octagon-prediction-markets-gemini-extension` |

**Everything under `extensions/` is generated.** Edit the sources (`openai/plugin.config.json`, `openai/profiles/<name>/`, `skills/`), run `npm run sync:gemini`, and commit the result; CI fails when a committed extension is out of date. The mirror repositories are written only by the publish workflow.

See [GEMINI_CLI_PLAN.md](GEMINI_CLI_PLAN.md) for the research, the design, the listing runbook, and the smoke test.

## What each extension contains

```
gemini-extension.json   name, version, description, contextFileName, one remote MCP server
GEMINI.md               standing rules loaded every session: tools, citations, sign-in, scope
README.md               reviewer- and user-facing description, install commands, endpoints
LICENSE                 MIT, identical to this repository's
skills/<name>/SKILL.md  the same skills the OpenAI and Grok packages ship
```

The MCP server is declared as `url` + `type: "http"` (Streamable HTTP; `httpUrl` is deprecated in Gemini CLI) with `oauth.enabled`, so Gemini CLI discovers the authorization server from the MCP server's metadata and registers itself dynamically. No `settings`, keys, hooks, commands, agents, or executables ship. The public-markets extension sets `includeTools` so only the public-market tools are exposed client-side.

## Commands

```bash
npm run build:gemini                # public markets → out/gemini/octagon-ai/
npm run build:gemini:predictions    # prediction markets → out/gemini/octagon-prediction-markets/
npm run sync:gemini                 # rebuild both and copy them into gemini/extensions/
npm run check:gemini                # rebuild both and fail if gemini/extensions/ differs (CI)
npm run about:gemini                # print each mirror's About description, homepage, and topic
```

## What the Gemini build checks

On top of the shared rules (skill front matter, relative links, neutral wording, secret scan):

- `gemini-extension.json` carries only documented fields, a name equal to the plugin name, a semver version (the release tag is `v<version>`), a single-line description of at most 300 characters, and a `contextFileName` that exists.
- Exactly one MCP server, `url` + `type: "http"` over HTTPS at the configured endpoint, `oauth.enabled: true`, no `httpUrl`, `command`, `args`, `env`, `cwd`, `headers`, or `trust`, and an `includeTools` list equal to the configured allow-list (or none).
- `GEMINI.md` exists, is at most 250 words, names every exposed tool, and states the citation rule, `/mcp auth`, and that tools are read-only.
- Only skills plus the four top-level files ship; no executables anywhere.
- The README names the endpoint, OAuth, both install commands, every skill, and the license; `LICENSE` is byte-identical to the repository's.

## Releases and the mirrors

`.github/workflows/publish-gemini-extensions.yml` runs on every push to `main` that touches `gemini/extensions/**`. For each extension it re-runs `check:gemini`, copies the directory into the mirror repository, commits when there is a diff, and, when no `v<version>` tag exists yet, tags it and publishes a GitHub Release whose archive has the manifest at its root. It also asserts the mirror's About description, homepage, and `gemini-cli-extension` topic.

Gemini CLI detects updates from the latest GitHub Release tag, so a change ships to Release installs only when `version` in the profile's `plugin.config.json` changes. One version number per plugin covers OpenAI, Grok, and Gemini.

The workflow authenticates with a GitHub App installed on the two mirror repositories only, with **Contents: write** (push, tag, release) and **Administration: write** (About description, homepage, topics); the token is requested with exactly those two permissions. Its ID and private key are `GEMINI_MIRROR_APP_ID` and `GEMINI_MIRROR_APP_PRIVATE_KEY` in this repository's secrets. Every step is idempotent, so a rerun repairs a partial publish. It runs nothing from the mirrors.

## Testing locally

With Gemini CLI installed:

```bash
gemini extensions validate gemini/extensions/octagon-prediction-markets
gemini extensions link gemini/extensions/octagon-prediction-markets
```

Start `gemini`, run `/mcp auth octagon-predictions`, and try the prompts in the extension's README. With Antigravity CLI: `agy plugin install <mirror repository URL>`.
