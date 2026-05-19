# SEC 10-Q Analysis Skill

Analyze 10-Q quarterly filings to extract quarterly performance metrics and segment breakdown using the Octagon Claude plugin.

## Installation

```bash
npx skills add OctagonAI/skills --skill sec-10q-analysis
```

<details>
<summary>bun</summary>

```bash
bunx skills add OctagonAI/skills --skill sec-10q-analysis
```

</details>

<details>
<summary>pnpm</summary>

```bash
pnpm dlx skills add OctagonAI/skills --skill sec-10q-analysis
```

</details>

## What This Skill Does

This skill analyzes 10-Q quarterly reports:

- Quarterly performance metrics
- Segment breakdown
- Sequential and YoY comparisons
- Material changes identification

## Example Usage

```
Analyze MSFT's latest 10-Q for quarterly performance and segment breakdown
```

---

## Octagon Claude plugin Setup

This skill requires the [Octagon Claude plugin](https://github.com/OctagonAI/octagon-claude-plugin) server to be configured in your AI agent.

### Get Your API Key

1. Sign up at [Octagon](https://app.octagonai.co/signup/?redirectToAfterSignup=https://app.octagonai.co/api-keys)
2. Navigate to **API Keys** from the left menu
3. Generate and save your API key

### Configure an MCP Client

1. Open your client settings for MCP server configuration
2. Click **+ Add New MCP Server**
3. Enter:
   - **Name**: `octagon-claude-plugin`
   - **Type**: `command`
   - **Command**: `env OCTAGON_API_KEY=<your-api-key> npx -y octagon-claude-plugin`

**Windows**: `cmd /c "set OCTAGON_API_KEY=<your-api-key> && npx -y octagon-claude-plugin"`

### Configure Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "octagon-claude-plugin-server": {
      "command": "npx",
      "args": ["-y", "octagon-claude-plugin@latest"],
      "env": {
        "OCTAGON_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### Documentation

- [Octagon Docs](https://docs.octagonagents.com)
- [Octagon Claude plugin GitHub](https://github.com/OctagonAI/octagon-claude-plugin)
