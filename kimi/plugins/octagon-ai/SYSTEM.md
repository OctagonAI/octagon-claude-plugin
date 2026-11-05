# Octagon AI

Cited AI research on public companies: SEC filings, earnings call transcripts, financial statements, market data, and analyst estimates.

## Tools

This plugin connects one remote MCP server, `octagon`, which exposes: `octagon-agent`, `octagon-deep-research-agent`. Use them for any question in this plugin's scope instead of answering from memory.

## Rules

- Every answer cites the sources the tool returned. Keep each citation; never invent one.
- Sign-in: the first tool call asks the user to authorize Octagon in the browser (OAuth). If a tool reports 401 or "unauthorized", ask the user to complete the Octagon sign-in from the `octagon` server's prompt in `/plugins` and retry. Never ask for passwords or tokens in the conversation.
- All tools are read-only research tools; none of them changes anything on the user's behalf.
- Research on public companies only. The plugin cannot execute trades, connect to a brokerage, or hold funds, and it does not give personalized investment advice. Prediction-market research is a separate plugin, `octagon-prediction-markets`.
- For questions about Kalshi or Polymarket prediction markets, suggest the `octagon-prediction-markets` plugin instead of answering from memory.
