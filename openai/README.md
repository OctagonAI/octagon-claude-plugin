# OpenAI plugin package

This directory holds everything that is specific to the OpenAI plugin directory (ChatGPT and Codex). Upload ZIPs are **generated** from the Claude plugin in this repository; nothing here changes the Claude plugin or the npm package.

Two plugins are built from here:

| Profile | Plugin | Orientation |
|---|---|---|
| default (`openai/` itself) | `octagon-ai`, the next version of the published Octagon listing | Public markets: companies, filings, earnings, market data |
| `profiles/prediction-markets/` | `octagon-prediction-markets` | Prediction markets only |

See [SUBMISSION_PLAN.md](SUBMISSION_PLAN.md) for the public-markets plan and portal runbook, and [PREDICTION_MARKETS_PLAN.md](PREDICTION_MARKETS_PLAN.md) for the second plugin.

## Commands

```bash
npm run build:openai                  # public markets → out/octagon-ai-openai-<version>.zip
npm run validate:openai               # re-validate it and check that every public URL answers 2xx
npm run build:openai:predictions      # prediction markets → out/octagon-prediction-markets-openai-<version>.zip
npm run validate:openai:predictions
npm run test:openai                   # unit and end-to-end tests for the packaging tool
```

Any profile can be built with `node tools/openai-plugin/cli.mjs build --profile <name>`.

The same profiles also build the Grok Build marketplace packages with `--target grok`; see [../grok/README.md](../grok/README.md). Those are committed under `grok/plugins/` rather than zipped.

The build writes only to `out/` (gitignored): the staged package in `out/openai/<plugin-name>/`, the ZIP, and `<plugin-name>.build-report.json`. It exits non-zero on any validation error and does not produce a ZIP in that case.

To type-check the tooling with the repository's TypeScript:

```bash
npx tsc --noEmit --allowJs --checkJs --strict --module nodenext --moduleResolution nodenext --target es2022 --skipLibCheck --types node tools/openai-plugin/cli.mjs
```

## What lives where

| Path | Purpose |
|------|---------|
| `plugin.config.json` | Package identity, listing text, links, MCP server URL and tool names, review test cases, publication settings |
| `transform.config.json` | How Claude skills become OpenAI skills: exclusions, removed files, section rewrites, substitutions, per-skill compliance edits, and forbidden-text guards |
| `assets/` | Listing images referenced by `plugin.config.json` |
| `skills/` | Skills written for OpenAI. A skill here with the same name as one in `../skills/` replaces it |
| `profiles/<name>/` | The same four inputs for another plugin. Its `transform.config.json` may `"extends"` the base one and use `includeSkills` as an allowlist |
| `../tools/openai-plugin/` | The packaging tool |

## Common changes

- **Listing text, links, test cases, or countries:** edit `plugin.config.json`. Bump `version` for every new upload.
- **Demo video:** set `review.demo_recording_url` in `plugin.config.json` once it is recorded.
- **A skill needs OpenAI-specific wording:** add a per-skill entry under `skillEdits` in `transform.config.json`. These edits are strict: if the upstream text changes and an edit no longer matches, the build fails instead of silently shipping the old wording.
- **Leave a skill out:** add it to `excludeSkills`.
- **A new portal finding:** fix it in config, or add a `Rule` subclass under `tools/openai-plugin/lib/validation/rules/` and register it in `rules/index.mjs` so the finding can't come back.
- **Keep the two plugins apart:** prediction-market content lives only in `profiles/prediction-markets/`. A guard in the base config fails the public-markets build if it creeps into that plugin's own skills; the guard is marked `inherit: false` so the prediction-markets profile is not subject to it.
