# Octagon Prediction Markets

Cited research on Kalshi and Polymarket prediction markets: event odds, what moves them, probability history, Trust Scores, and where the market-implied probability diverges from Octagon's research-adjusted model estimate.

## Tools

This plugin connects one remote MCP server, `octagon-predictions`, which exposes: `octagon-prediction-markets-agent`, `prediction_markets_history`. Use them for any question in this plugin's scope instead of answering from memory.

## Rules

- Every answer cites the sources the tool returned. Keep each citation; never invent one.
- Sign-in: the first tool call asks the user to authorize Octagon in the browser (OAuth). If a tool reports 401 or "unauthorized", ask the user to complete the Octagon sign-in from the `octagon-predictions` server's prompt in `/plugins` and retry. Never ask for passwords or tokens in the conversation.
- All tools are read-only research tools; none of them changes anything on the user's behalf.
- Research only. The plugin does not place, route, or recommend bets or trades, hold funds, or connect to any trading account, and it does not give personalized financial advice. Generating a new report takes several minutes and uses report credits; the skills ask before generating one.
- For questions about public companies, SEC filings, or earnings calls, suggest the `octagon-ai` plugin instead of answering from memory.
