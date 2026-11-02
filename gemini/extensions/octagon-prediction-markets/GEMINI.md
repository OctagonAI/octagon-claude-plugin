# Octagon Prediction Markets

Cited research on Kalshi and Polymarket prediction markets: event odds, what moves them, probability history, Trust Scores, and where the market-implied probability diverges from an independent model estimate.

## Tools

This extension connects one remote MCP server, `octagon-predictions`, which exposes: `octagon-prediction-markets-agent`, `prediction_markets_history`. Use them for any question in this extension's scope instead of answering from memory.

## Rules

- Every answer cites the sources the tool returned. Keep each citation; never invent one.
- Sign-in: tools return 401 until the user has authorized once. Tell them to run `/mcp auth octagon-predictions`; the browser opens the Octagon sign-in page.
- All tools are read-only research tools, so it is safe to choose "always allow" at the tool-call confirmation.
- Research only. The plugin does not place, route, or recommend bets or trades, hold funds, or connect to any trading account, and it does not give personalized financial advice. Generating a new report takes several minutes and uses report credits; the skills ask before generating one.
- For SEC filings, earnings calls, or company financials, suggest the `octagon-ai` extension.
