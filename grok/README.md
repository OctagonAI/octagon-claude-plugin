# Grok Build marketplace packages

This directory holds the two Octagon plugins as the Grok Build Plugin Marketplace installs them. xAI's catalog (`xai-org/plugin-marketplace`) points at this repository at a pinned commit, with `source.path` selecting one of the directories below, so the installable files have to exist in git.

| Directory | Plugin | Orientation |
|---|---|---|
| `plugins/octagon-ai/` | `octagon-ai` | Public markets: companies, filings, earnings, market data |
| `plugins/octagon-prediction-markets/` | `octagon-prediction-markets` | Prediction markets only |

**Everything under `plugins/` is generated.** The packaging tool in `tools/openai-plugin` builds each directory from the same profile and skill catalog that produce the OpenAI packages (`openai/plugin.config.json` and `openai/profiles/<name>/`), adding the Grok manifest, an HTTP-only `.mcp.json`, a reviewer-facing README, the license, and the icon. Edit the sources, then regenerate; CI fails when a committed package is out of date.

See [GROK_MARKETPLACE_PLAN.md](GROK_MARKETPLACE_PLAN.md) for the research, the design, the submission runbook, and the review copy.

## Commands

```bash
npm run build:grok                 # public markets → out/grok/octagon-ai/
npm run build:grok:predictions     # prediction markets → out/grok/octagon-prediction-markets/
npm run sync:grok                  # rebuild both and copy them into grok/plugins/
npm run check:grok                 # rebuild both and fail if grok/plugins/ differs (CI)
npm run entry:grok                 # print both marketplace.json entries with the current HEAD SHA
```

`sync` is the only step that writes into the source tree, and it may only write under `grok/plugins/<plugin-name>/`. It refuses a build whose validation failed.

## What the Grok build checks

On top of the shared rules (skill front matter, relative links, forbidden wording, secret scan), the Grok target enforces what the marketplace reviewers look for:

- `.grok-plugin/plugin.json` carries only documented fields, a valid name and version, a license, a homepage, and `./skills/` + `./.mcp.json`.
- `.mcp.json` declares exactly one server, `type: "http"`, over HTTPS, with no `command`, `args`, or `env`.
- The package ships skills and that server only: no hooks, commands, agents, LSP servers, or executable files.
- Every keyword contains `octagon` and none is a generic term; the catalog's plugin suggestion keys off these.
- `README.md` names the MCP endpoint, the OAuth model, every skill, and the license.
- `LICENSE` is byte-identical to the repository's.

## Testing locally

With Grok Build installed, either point it at one package directory:

```bash
grok --plugin-dir grok/plugins/octagon-prediction-markets
```

or register this directory as a local marketplace source in `~/.grok/config.toml` (the catalog in `.grok-plugin/marketplace.json` lists both packages with local sources):

```toml
[[marketplace.sources]]
name = "Octagon (local)"
path = "/path/to/octagon-claude-plugin/grok"
```

Then `grok plugin install octagon-prediction-markets --trust`. `--trust` is Grok Build's consent for the MCP server to run; every plugin that ships one needs it.

## Repository root vs. these packages

The repository root is itself a Claude Code plugin (`.claude-plugin/plugin.json`, `skills/`, `agents/`, `hooks/`), and Grok Build can install Claude plugins unchanged. The marketplace entries deliberately do not point at the root: it mixes both research areas, ships hooks and an agent that widen the security review, and uses the legacy MCP host. The generated directories are the supported Grok packages.
