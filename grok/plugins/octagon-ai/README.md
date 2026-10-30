# Octagon AI for Grok Build

Cited AI research on public companies: SEC filings, earnings call transcripts, financial statements, market data, and analyst estimates.

Built for investment professionals who want the record behind a number: ask about a filing, an earnings call, a financial statement, a price series, or an analyst estimate, and the answer comes back with its source. Octagon is a research tool. It does not place trades, move money, or give personalized investment advice.

Everything the plugin does goes through one hosted MCP server. It ships no scripts, hooks, agents, commands, or local executables.

## Components

- **68 skills** (`skills/<name>/SKILL.md`), listed below.
- **1 MCP server** (`.mcp.json`): `octagon`, HTTP transport, `https://mcp.octagonai.co/mcp`.
- No hooks, no subagents, no slash commands, no LSP servers.

## Network endpoints

The plugin contacts only these hosts:

| Host | Purpose |
|---|---|
| `mcp.octagonai.co` | MCP server (`https://mcp.octagonai.co/mcp`); receives prompts and tool arguments, returns cited results |
| `login.octagonai.co` | OAuth authorization server (`https://login.octagonai.co`); sign-in on first tool use |

No other endpoint is called. The plugin sends no telemetry of its own.

## Credentials

- Authentication is browser OAuth with an Octagon account; Grok Build opens the sign-in page the first time a tool is called.
- The plugin reads no keys, tokens, environment variables, or local files.
- Disconnect at any time from Grok Build's MCP settings (`/mcps`); revoking the OAuth grant on the Octagon side has the same effect.

## Data flow

Your prompt and the tool arguments the model derives from it are sent to the Octagon MCP server; the server returns research results with their sources. Results are shown in the session and are not stored by the plugin.

## Install

From the xAI marketplace inside Grok Build:

```bash
grok plugin install octagon-ai --trust
```

From a checkout of this repository, for testing before the marketplace entry exists:

```bash
grok --plugin-dir grok/plugins/octagon-ai
```

`--trust` is Grok Build's confirmation that the plugin's MCP server may run; it is required for every plugin that ships one.

## Try it

- `Summarize the risk factors in Apple's latest 10-K.`
  Expected: a summary of the Risk Factors section with the filing date and a link to the filing
- `What guidance did NVIDIA give on last quarter's earnings call?`
  Expected: the guidance statements from the transcript, attributed to the speaker, with the call date
- `Compare Apple's and Microsoft's revenue growth over the last three fiscal years.`
  Expected: a side-by-side table by fiscal year with units and the statements it was built from

## Skills

| Skill | What it does |
|---|---|
| `analyst-estimates` | Retrieve analyst financial estimates including Revenue and EPS projections with low/high ranges and analyst coverage. Use when analyzing forward expectations, consensus estimates, valuation inputs, or comparing projections to historical performance. |
| `balance-sheet` | Retrieve detailed balance sheet statement data including Total Assets, Current Assets, Non-Current Assets, Liabilities, Equity, and Net Debt for public companies. Use when analyzing financial position, capital structure, or leverage metrics. |
| `balance-sheet-growth` | Retrieve year-over-year growth in balance sheet items including Total Assets, Total Liabilities, Shareholders Equity, Cash, and Inventories. Use when analyzing company financial position trends, capital structure changes, or liquidity management. |
| `batch-market-cap` | Retrieve market capitalization data for multiple companies at once using Octagon. Use when comparing valuations across peers, screening by market cap, or analyzing a portfolio's composition by company size. |
| `cash-flow-growth` | Retrieve year-over-year growth in cash flow metrics including Operating Cash Flow, Free Cash Flow, and Net Cash Flow. Use when analyzing company cash generation trends, capital allocation efficiency, or liquidity trajectory. |
| `cash-flow-statement` | Retrieve real-time or historical cash flow statement data including Net Income, Operating Cash Flow, Investing Cash Flow, Financing Cash Flow, Free Cash Flow, and Cash Position for public companies. Use when analyzing cash generation, capital allocation, or liquidity trends. |
| `commodities-list` | Retrieve the full catalog of tradable commodities across energy, metals, and agriculture using Octagon. Use when researching commodity markets, identifying trading firms, understanding market participants, and analyzing commodity sector coverage. |
| `commodities-quote` | Retrieve real-time commodity price quotes using Octagon. Use when checking current commodity prices, analyzing day ranges, comparing to moving averages, and tracking precious metals, energy, and agricultural commodity prices. |
| `company-market-cap` | Retrieve market capitalization data for a single company using Octagon. Use when you need the current market value, valuation context, or size classification for any publicly traded stock. |
| `earnings-analyst-master` | Comprehensive earnings call analyst skill that orchestrates all Octagon earnings analysis skills. Use when analyzing earnings calls, extracting management insights, tracking guidance, and creating earnings-focused research reports. |
| `earnings-analyst-questions` | Identify key themes and concerns raised by analysts during earnings calls, including specific analyst attribution and topic categorization. |
| `earnings-call-analysis` | Analyze earnings call transcripts to extract forward-looking guidance, strategic focus areas, supply chain insights, and generate follow-up questions for deeper analysis. |
| `earnings-call-insights` | Analyze earnings call transcripts to extract key insights about future guidance, strategic priorities, management commentary, and market signals. |
| `earnings-capital-allocation` | Extract management's commentary on capital allocation, investment priorities, shareholder returns, and strategic investments from earnings call transcripts. |
| `earnings-competitive-review` | Analyze management's discussion of competitive landscape, market positioning, and strategic differentiation from earnings call transcripts. |
| `earnings-conf-call-sentiment` | Analyze the overall sentiment and tone of management during earnings conference calls, including confidence levels, optimism indicators, and forward-looking language. |
| `earnings-cost-mgmt` | Analyze cost reduction initiatives and operational efficiency measures from earnings transcripts, including headcount actions, facility consolidation, and productivity improvements. |
| `earnings-financial-guidance` | Extract and analyze financial guidance and forward-looking statements from earnings transcripts, including segment guidance, risk factors, and guidance vs. actuals comparison. |
| `earnings-market-expansion` | Identify market expansion and geographic growth plans discussed in earnings calls, including new market launches, international expansion, and product diversification strategies. |
| `earnings-mgmt-comments` | Extract management's commentary on specific topics from earnings call transcripts, including product development, strategy, competitive positioning, and executive quotes. |
| `earnings-product-pipeline` | Extract product development and pipeline updates from earnings calls, including clinical trial progress, regulatory submissions, and launch timelines. |
| `earnings-qa-analysis` | Analyze the Q&A section of earnings call transcripts for strategic insights, analyst concerns, and management responses on key topics. |
| `earnings-revenue-guidance` | Extract specific revenue guidance and growth projections from earnings call transcripts, including segment breakdown, constant currency adjustments, and M&A contributions. |
| `esg-benchmark-comparison` | Retrieve ESG benchmark comparison metrics by sector using Octagon. Use when comparing ESG performance across industries, analyzing sector-level sustainability benchmarks, identifying ESG leaders and laggards by industry, or referencing frameworks like MSCI, S&P Global, CDP, and CSRD. |
| `esg-ratings` | Retrieve ESG ratings and scores using Octagon. Use when analyzing Environmental, Social, and Governance ratings, MSCI ESG ratings, Sustainalytics risk ratings, industry ESG rankings, and sustainability metrics for any public company. |
| `financial-analyst-master` | Comprehensive equity research analyst skill that orchestrates all Octagon financial analysis skills. Use when conducting full company analysis, writing initiation of coverage reports, performing due diligence, or creating investment recommendations with quantitative support inside Octagon. |
| `financial-growth` | Retrieve comprehensive year-over-year growth in key financial metrics including Revenue, Gross Profit, Operating Income, Net Income, EPS, and Free Cash Flow. Use when analyzing overall company financial performance trends across income statement and cash flow. |
| `financial-health-scores` | Retrieve financial health scores including Altman Z-Score and Piotroski Score for public companies. Use when assessing bankruptcy risk, financial strength, value investing screening, or credit quality analysis. |
| `financial-metrics-analysis` | Analyze year-over-year growth in income statement items and financial metrics using Octagon. Use when retrieving YoY Revenue Growth, Cost of Revenue Growth, Gross Profit Growth, Operating Income Growth, Net Income Growth, or comparing financial performance across fiscal periods for any public company. |
| `forex-list` | Retrieve a full listing of actively traded currency pairs in the global forex market using Octagon. Use when researching forex markets, understanding currency pair categories, analyzing major/minor/exotic pairs, and identifying trading opportunities. |
| `get-started` | Introduce Octagon AI, explain how to connect it, and suggest first research requests. Use when the user is new to Octagon, asks what Octagon can do, or needs help connecting their Octagon account. |
| `historical-financial-ratings` | Retrieve historical financial ratings and key metric scores over time using Octagon. Use when analyzing overall ratings, return on assets, return on equity, discounted cash flow scores, debt-to-equity scores, and letter grades (A+, A, B, etc.) for any public company. |
| `historical-market-cap` | Retrieve historical market capitalization data for any stock using Octagon. Use when tracking market cap changes over time, analyzing valuation trends, identifying peak and trough valuations, and comparing historical size classifications. |
| `income-statement` | Retrieve real-time income statement data including Revenue, Net Income, and EPS Diluted for public companies. Use when analyzing absolute financial figures, historical earnings, or comparing company scale across fiscal periods. |
| `income-statement-growth` | Retrieve year-over-year growth in income statement items including Revenue, Gross Profit, Operating Income, Net Income, and EPS Diluted. Use when analyzing company financial growth trends, comparing fiscal year performance, or identifying profitability inflection points. |
| `industry-pe-ratios` | Retrieve industry-specific P/E ratios using Octagon. Use when comparing company valuations to specific industry peers, analyzing sub-sector valuations, and understanding niche market valuations beyond broad sector averages. |
| `industry-performance-snapshot` | Retrieve a daily overview of industry performance using Octagon. Use when analyzing daily price movements, average changes, and performance trends for specific industries within an exchange. |
| `market-analyst-master` | Comprehensive market analyst skill that orchestrates all Octagon stock performance and market data skills. Use when conducting stock analysis, creating market reports, evaluating valuations, comparing sectors, or performing technical and sentiment analysis. |
| `octagon-research-router` | Choose the right Octagon workflow for a financial research request. Use when a request spans several kinds of analysis, when it is unclear which Octagon skill fits, or when deciding which Octagon tool to call. |
| `octagon-status` | Check whether Octagon is connected and summarize the Octagon tools that are currently available. Use when the user asks what Octagon can do right now, whether Octagon is working, or why Octagon requests are failing. |
| `price-target-consensus` | Retrieve consensus price targets for any stock using Octagon. Use when you need the average, median, high, and low analyst price targets to evaluate upside/downside potential and analyst agreement. |
| `price-target-summary` | Retrieve analysts' price target summary for any stock using Octagon. Use when evaluating analyst sentiment, upside/downside potential, consensus expectations, and tracking target trends over time. |
| `ratings-snapshot` | Retrieve ratings snapshot with overall rating and key metric scores including DCF, ROE, ROA, Debt-to-Equity, P/E, and P/B for public companies. Use when screening stocks, comparing quality metrics, or quick fundamental assessment. |
| `revenue-geographic-segmentation` | Retrieve detailed revenue breakdown by geographic segment for public companies. Use when analyzing regional exposure, geographic concentration, international expansion, or currency risk assessment. |
| `revenue-product-segmentation` | Retrieve detailed revenue breakdown by product segment for public companies. Use when analyzing product mix, revenue concentration, segment contribution, or business line performance. |
| `sec-10k-analysis` | Analyze 10-K annual filings for public companies using Octagon. Use when extracting key financial metrics, risk factors, business overview, management discussion, and regulatory disclosures from SEC 10-K filings. |
| `sec-10q-analysis` | Analyze 10-Q quarterly filings for public companies using Octagon. Use when extracting quarterly performance metrics, revenue breakdown, operating margins, segment performance, and interim financial updates from SEC 10-Q filings. |
| `sec-8k-analysis` | Analyze 8-K filings to extract material events and corporate changes using Octagon. Use when tracking real-time corporate disclosures, M&A announcements, leadership changes, earnings releases, and other material events requiring immediate investor attention. |
| `sec-amendments-review` | Review amendments to SEC filings using Octagon. Use when tracking material changes, corrections, restatements, and updates to previously filed documents including 10-K/A, 10-Q/A, 8-K/A, S-1/A, and Form 144/A filings. |
| `sec-analyst-master` | Comprehensive SEC filing analyst skill that orchestrates all Octagon SEC analysis skills. Use when conducting due diligence, regulatory compliance review, M&A analysis, or creating comprehensive company assessments based on SEC disclosures. |
| `sec-annual-comparison` | Compare key metrics and disclosures between annual 10-K filings using Octagon. Use when analyzing year-over-year changes in financials, risk factors, business descriptions, and strategic priorities across fiscal years. |
| `sec-business-desc-analysis` | Extract and analyze business descriptions and competitive landscape from SEC filings using Octagon. Use when researching company business models, market positioning, competitive advantages, industry dynamics, and strategic focus areas from Item 1 disclosures. |
| `sec-cash-flow-review` | Extract and analyze cash flow trends and working capital changes from SEC filings using Octagon. Use when researching operating cash flow, investing activities, financing activities, free cash flow, liquidity, and working capital dynamics from 10-K and 10-Q filings. |
| `sec-corp-governance` | Review corporate governance practices and board composition from SEC filings using Octagon. Use when researching board structure, director qualifications, committee composition, governance policies, shareholder rights, and related party transactions from proxy statements. |
| `sec-debt-covenant` | Analyze debt covenants and credit agreement terms from SEC filings using Octagon. Use when researching financial covenants, leverage ratios, interest coverage requirements, credit facilities, debt maturity schedules, and covenant compliance from 10-K, 10-Q, and 8-K filings. |
| `sec-footnotes-analysis` | Analyze footnotes and accounting policies from SEC filings using Octagon. Use when researching revenue recognition policies, critical estimates, lease obligations, pension assumptions, stock compensation, contingencies, and new accounting pronouncements. |
| `sec-mda-analysis` | Analyze Management Discussion and Analysis (MD&A) sections from SEC filings using Octagon. Use when extracting strategic initiatives, financial performance commentary, macroeconomic challenges, and forward-looking statements from 10-K and 10-Q filings. |
| `sec-proxy-analysis` | Analyze proxy statements (DEF 14A) to extract executive compensation, governance information, and shareholder voting matters using Octagon. Use when researching CEO pay, board composition, say-on-pay votes, and corporate governance practices. |
| `sec-risk-factors` | Extract and summarize risk factors from SEC filings using Octagon. Use when analyzing Item 1A risk disclosures, categorizing business risks, identifying new or material risks, and comparing risk profiles across companies or time periods. |
| `sec-s1-analysis` | Analyze S-1 registration statements for IPOs using Octagon. Use when researching companies preparing to go public, extracting business models, risk factors, use of proceeds, capitalization, principal shareholders, and growth opportunities from IPO filings. |
| `sec-segment-reporting` | Analyze business segment performance and reporting from SEC filings using Octagon. Use when researching segment revenue, operating income, margins, geographic breakdown, and segment restructuring from 10-K and 10-Q filings. |
| `sector-pe-ratios` | Retrieve sector P/E ratios using Octagon. Use when comparing company valuations to sector benchmarks, analyzing sector valuations across exchanges, and understanding market-wide valuation trends. |
| `sector-performance-snapshot` | Retrieve a snapshot of market sector performance using Octagon. Use when analyzing sector-wide metrics including revenue, EBITDA, net income, market cap, and enterprise value for companies within a specific sector and exchange. |
| `stock-grades` | Retrieve the latest stock grades and ratings from top analysts and financial institutions using Octagon. Use when tracking analyst upgrades, downgrades, rating changes, and institutional sentiment over time. |
| `stock-historical-index` | Retrieve full historical end-of-day price data for market indices using Octagon. Use when analyzing index performance over time, tracking market trends, calculating returns, and understanding market context for individual stock analysis. |
| `stock-performance` | Retrieve stock price data and performance metrics using Octagon. Use when analyzing daily closing prices, trading volume, price trends, historical performance, and comparing stock movements over specific time periods. |
| `stock-price-change` | Retrieve stock price change statistics across multiple time periods using Octagon. Use when analyzing short-term and long-term returns, comparing performance across timeframes, and evaluating momentum and historical growth. |
| `stock-quote` | Retrieve real-time stock quotes using Octagon. Use when you need current price, day range, 52-week range, volume, market cap, and moving averages for any publicly traded stock. |

## Scope

Research on public companies only. The plugin cannot execute trades, connect to a brokerage, or hold funds, and it does not give personalized investment advice. Prediction-market research is a separate plugin, `octagon-prediction-markets`.

## License and support

- License: MIT (see `LICENSE`).
- Homepage: https://www.octagonai.co/
- Support: https://www.octagonai.co/contact/
- Privacy policy: https://www.octagonai.co/privacy/
- Terms of service: https://www.octagonai.co/terms-of-service/

This directory is generated from the plugin's config and skill catalog by the packaging tool in this repository; edit the sources, not these files.
