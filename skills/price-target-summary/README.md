# Price Target Summary Skill

Retrieve analysts' price target summary with trends across timeframes using the Octagon Claude plugin.

## Installation

```bash
npx skills add OctagonAI/skills --skill price-target-summary
```

<details>
<summary>bun</summary>

```bash
bunx skills add OctagonAI/skills --skill price-target-summary
```

</details>

<details>
<summary>pnpm</summary>

```bash
pnpm dlx skills add OctagonAI/skills --skill price-target-summary
```

</details>

## What This Skill Does

This skill retrieves price target trends:

- Current consensus target
- Target changes over time
- High/low target ranges
- Analyst count and revisions

## Example Usage

```
Retrieve analyst price target summary and trends for AAPL
```

---

## Octagon Claude plugin Setup

This skill requires the [Octagon Claude plugin](https://github.com/OctagonAI/octagon-claude-plugin) server to be configured in your AI agent.

### Get Your API Key

1. Sign up at [Octagon](https://app.octagonai.co/signup/?redirectToAfterSignup=https://app.octagonai.co/api-keys)
2. Navigate to **API Keys** from the left menu
3. Generate and save your API key

### Configure Cursor

1. Open Cursor Settings → **Features > MCP Servers**
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
