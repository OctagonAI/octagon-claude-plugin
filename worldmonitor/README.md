# World Monitor Quick Connect presets

[World Monitor](https://worldmonitor.app) (`koala73/worldmonitor`) lists third-party MCP servers in a Quick Connect catalog: `MCP_PRESETS` in `src/services/mcp-store.ts`. A user picks a preset, pastes an API key, and gets a dashboard panel that calls one tool on a refresh interval. Every preset host also needs a row in `shared/source-attribution-manifest.json`, which generates the public page at worldmonitor.app/sources.

The two files here are generated from the `worldmonitor` block of every plugin profile under `openai/`; they are the source of truth for what we submit upstream.

| File | Contents | Regenerate |
|---|---|---|
| `presets.generated.json` | One `McpPreset` per profile, in profile order | `npm run catalog:worldmonitor` |
| `source-attribution-row.json` | The ledger row for `mcp.octagonai.co` | same |

`npm run check:worldmonitor` fails when either file drifts from the profiles; CI runs it. `npm run ts:worldmonitor` prints the presets as TypeScript object literals in World Monitor's file style, ready to paste into `MCP_PRESETS`.

## How a preset is derived

```
profile plugin.config.json
├── mcp.url, mcp.tools                 → serverUrl (unless worldmonitor.serverUrl overrides it), tool check
├── worldmonitor.name/icon/description → catalog card
├── worldmonitor.authHint              → authNote: "Requires Authorization: Bearer <OCTAGON_API_KEY> (<hint>)"
├── worldmonitor.defaultTool/Args/Title→ what a new panel calls and shows
└── (constant) apiKeyHeader            → "Authorization: Bearer {key}", the modal's single API-key field
```

Rules the generator enforces: the default tool is served by the preset's endpoint, the description fits the catalog card, the icon is one emoji, a `serverUrl` override declares its `tools`.

## Why the defaults look the way they do

- **Octagon AI points at `/public-markets/mcp`, not `/mcp`.** A dashboard panel polls; the full endpoint also serves deep research, which takes minutes and costs more. The public-markets endpoint serves the orchestrator and deep research only, and the preset's default tool is the orchestrator.
- **Prediction Markets passes `cache: true`.** That reads an existing report (free, instant). A panel refreshing with `cache: false` would generate a 3-credit report every refresh.
- **Every default prompt is window-bounded** ("today", "last 24 hours", "this week") so a refresh returns something new, and none asks for advice.

## Server requirement

World Monitor sends the key as a header. Octagon's MCP server accepts an API key as `Authorization: Bearer <key>` or `X-Octagon-Key: <key>` on every public endpoint (octagon-remote-mcp PR #31), in addition to the `/<key>/...` path form.

## Submitting upstream

See `docs/WORLDMONITOR_SUBMISSION_PLAN.md` for the full plan. In short: open a new-source issue, fork, add the presets to `MCP_PRESETS` and the row to the attribution manifest in one commit, `npm run sources:generate`, `npm run typecheck`, `node --test tests/mcp-presets.test.mjs`, PR with the template's "New data source / feed" box ticked.
