# Octagon Claude Plugin

The Octagon Claude plugin is a skills-first Claude Code plugin for financial research and prediction market workflows. It packages:

- the full Octagon GitHub skills catalog, plus plugin-specific smoke-test coverage
- a routing agent for broad analyst workflows
- a bundled Octagon MCP runtime for tool execution

This repository is structured as a single-plugin Claude Code marketplace, so it can be used both for local development and marketplace-style installation.

## What It Includes

Core plugin components:

- plugin manifest: `.claude-plugin/plugin.json`
- marketplace manifest: `.claude-plugin/marketplace.json`
- bundled MCP config: `.claude-plugin/mcp.json`
- routing agent: `agents/claude-octagon-coordinator.md`
- skills: 68 total
  - company and financial analysis skills
  - earnings and transcript analysis skills
  - SEC filing analysis skills
  - market data, valuation, and market-cap skills
  - ESG, sector, industry, commodities, and forex skills
  - plugin validation via `octagon-api-smoke-test`

Bundled MCP tools exposed through the runtime:

- `octagon-agent`
- `octagon-deep-research-agent`
- `octagon-prediction-markets-agent`
- `prediction_markets_history`

## Installation

### Install from a marketplace source

Add this repository as a Claude Code marketplace:

```bash
claude plugin marketplace add OctagonAI/octagon-claude-plugin
```

Then install the plugin:

```bash
claude plugin install octagon-claude-plugin@octagon-claude-plugins
```

### Install from a local checkout

For local testing or development:

```bash
npm install
npm run build
claude plugin marketplace add "/absolute/path/to/octagon-claude-plugin"
claude plugin install octagon-claude-plugin@octagon-claude-plugins
```

## Configuration

The plugin prompts for:

- `api_key`: required, stored as a sensitive plugin option
- `api_base_url`: optional, defaults to `https://api.octagonagents.com/v1`

For a local API or staging environment, override `api_base_url` in the plugin configuration UI.

## How It Works

The plugin is skills-first:

- users invoke focused financial workflows through Claude skills
- the plugin ships the full upstream Octagon skills catalog from [`OctagonAI/skills`](https://github.com/OctagonAI/skills/tree/main/skills)
- the routing agent can choose the right skill or bundled runtime path
- the bundled MCP runtime executes Octagon tool calls behind the scenes

This keeps Claude interactions analyst-oriented while still using typed MCP tools under the hood.

## Standalone Runtime Usage

Although this repo is plugin-first, the bundled runtime can still be invoked like a standalone MCP server.

Direct execution:

```bash
env OCTAGON_API_KEY=your_octagon_api_key node ./dist/index.js
```

Global package execution:

```bash
npm install -g octagon-claude-plugin
env OCTAGON_API_KEY=your_octagon_api_key npx octagon-claude-plugin
```

Use this mode only when you specifically want the standalone runtime. For Claude Code, prefer plugin installation.

## Documentation

- [Octagon docs](https://docs.octagonagents.com)
- [Octagon runtime setup guide](https://docs.octagonagents.com/guide/mcp-server.html)

## License

MIT
