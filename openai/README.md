# OpenAI plugin package

This directory holds everything that is specific to the OpenAI plugin directory (ChatGPT and Codex). The upload ZIP is **generated** from the Claude plugin in this repository; nothing here changes the Claude plugin or the npm package.

See [SUBMISSION_PLAN.md](SUBMISSION_PLAN.md) for the full submission plan, account prerequisites, and portal runbook.

## Commands

```bash
npm run build:openai      # build, validate, and zip → out/octagon-ai-openai-<version>.zip
npm run validate:openai   # re-validate out/ and check that every public URL answers 2xx
npm run test:openai       # unit and end-to-end tests for the packaging tool
```

The build writes only to `out/` (gitignored): the staged package in `out/openai/octagon-ai/`, the ZIP, and `build-report.json`. It exits non-zero on any validation error and does not produce a ZIP in that case.

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
| `../tools/openai-plugin/` | The packaging tool |

## Common changes

- **Listing text, links, test cases, or countries:** edit `plugin.config.json`. Bump `version` for every new upload.
- **Demo video:** set `review.demo_recording_url` in `plugin.config.json` once it is recorded.
- **A skill needs OpenAI-specific wording:** add a per-skill entry under `skillEdits` in `transform.config.json`. These edits are strict: if the upstream text changes and an edit no longer matches, the build fails instead of silently shipping the old wording.
- **Leave a skill out:** add it to `excludeSkills`.
- **A new portal finding:** fix it in config, or add a `Rule` subclass under `tools/openai-plugin/lib/validation/rules/` and register it in `rules/index.mjs` so the finding can't come back.
