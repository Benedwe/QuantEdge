# QuantEdge Platform Guide

QuantEdge is a browser-based forex dashboard prototype. This guide explains how
to run it, what each screen does, and which outputs are simulated or
illustrative.

- **Hosted demo:** https://ai-powered-forex-tra-byyt.bolt.host/
- **Source code:** https://github.com/Benedwe/QuantEdge

> **Risk warning:** Do not use the current prototype to make trading decisions
> or connect a live brokerage account. Its market data and generated analysis
> are not production-grade, and its Supabase configuration is not safe for
> private or live trading data.

## At a glance

The app has five main sections:

| Section | Purpose |
| --- | --- |
| Dashboard | View pair charts, generated signal cards, example trades, summary metrics, news, and calendar panels. |
| AI Signals | Generate and inspect illustrative buy/sell setups and their displayed rationale. |
| Risk Management | Explore a simplified position-size calculator, P&L summaries, and exposure metrics. |
| Backtesting | View randomized example equity and performance statistics. This is not a historical backtest. |
| Settings | Edit local trading preferences and view broker connection controls. |

Use the sidebar navigation to switch sections. On smaller screens the navigation
becomes a horizontal strip.

## Run locally

### Requirements

- Node.js and npm compatible with the Vite version in `package.json`
- A modern browser

### Install and start

```bash
npm install
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`). Stop the development
server with `Ctrl+C`.

### Supabase configuration

The app reads these Vite environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Create a local `.env.local` file for development and never commit credentials.
Without both variables, the app uses offline defaults and in-memory sample
trades. Offline settings and trade data are not durable across reloads.

The SQL migrations are in `supabase/migrations/`. The project does not include
an automated migration runner; apply them to a development Supabase project
using your normal Supabase workflow.

**Do not connect a production or live-trading database.** Current migrations
grant anonymous users broad read/write policies, the app has no sign-in screen
or per-user access isolation, and broker credentials are stored in the
`broker_connections` table. These choices are unsuitable for private or
production financial data.

## Working with the dashboard

### Dashboard

The Dashboard presents a pair selector and candlestick chart, account summary
cards, signal cards, open-position and trade-history areas, and news/calendar
panels.

The implementation currently generates prices and candles locally and updates
them with random movements. News and economic events are also generated sample
content. The “Streaming” and “Live” labels do not establish that the values
come from an exchange or broker.

Some dashboard trade actions create or update trade records in the app (stored
in Supabase when configured); they should not be interpreted as evidence that a
broker order was placed. The separate AI Signals execution path can send an
OANDA order when a connected OANDA account is configured—see
[Broker connections](#broker-connections).

### AI Signals

The Signals view creates sample setups with direction, confidence, entry range,
stop, target, indicators, and explanatory text. The current signal engine
constructs market state from generated prices and random values; displayed
model labels and confidence values are not outputs from trained or validated
predictive models.

Use the view to explore the interface only. Do not infer probability of success
from the confidence display, and do not execute an order from a live brokerage
connection.

### Risk Management

The Risk view includes a calculator and summary metrics. The calculator
estimates stop distance in pips, risk per lot, and a suggested lot size using
the configured balance and risk percentage. It uses simplified pip-value
assumptions and does not fully model account-currency conversion, spread,
commission, swaps, slippage, leverage, margin, gaps, or broker contract rules.
Treat the output as an illustration, not a sizing recommendation.

The daily drawdown panel is a visual monitor; it is not a reliable broker-side
loss limit or guaranteed automatic stop. Exposure and performance figures are
derived from the app's stored or sample trade records.

### Backtesting

The Backtesting view is **not a real backtester**. Its equity series is randomly
generated. The symbol, strategy, and period selectors affect labels shown in
the interface but do not load historical market data or run the selected
strategy on real historical candles. Several displayed statistics are
illustrative or hard-coded. Do not use these results to evaluate a strategy or
forecast returns.

### Settings

Settings include trading mode, account balance, risk preferences, capital
preservation, alert toggles, and broker connection controls. The interface and
saved values should not be treated as production safeguards; enforce critical
risk controls in a tested broker-side or server-side system before any real
deployment.

The alert toggles store preferences but do not, by themselves, configure a
notification service.

## Broker connections

The Settings screen lists OANDA, MetaTrader 5, IC Markets, Exness, and FXCM.
Listing a broker is not proof that its integration is implemented.

In the current source, OANDA has API validation, account-summary retrieval, and
order submission code. The other broker cards collect connection fields but do
not have corresponding API execution implementations. OANDA account sync runs
when a connected account is configured.

The AI Signals execution flow may submit a market order to a connected OANDA
account when the selected broker is OANDA. A practice/demo setting is not a
substitute for understanding or testing the order flow. Because the current
signal inputs are generated, do not connect a live OANDA account or use the
execution controls with real funds.

Never paste API tokens or trading passwords into source control, issue
trackers, documentation, or chat. Before considering broker use, the project
needs server-side secret handling, authentication, user-level authorization,
secure credential storage, validated order sizing, tested risk controls, and
clear confirmation and audit flows.

## Data storage

When Supabase is configured, the browser client reads and writes settings,
trades, signals, and broker connections. The migrations define tables for
trades, signals, settings, economic events, and broker connections.

When Supabase is not configured, settings fall back to defaults and trades are
generated as sample data. The current app still generates market data, signals,
news, and calendar entries locally in either mode.

The included RLS policies permit anonymous access to database rows, and there is
no application sign-in or tenant isolation. Do not put personal, confidential,
or real account data into this configuration.

## Current implementation boundaries

- No verified external live price, candle, news, or economic-calendar feed is
  wired into the displayed market analysis.
- Signal and market-state generation uses synthetic/random values.
- Backtest results are randomized illustrations, not historical strategy
  performance.
- Broker API execution is only wired for OANDA; other listed broker options are
  not implemented integrations.
- Supabase access is configured for a demo, not a secure multi-user production
  deployment.
- Risk widgets and settings are not substitutes for broker-side safeguards.

## Development checks

```bash
npm test
npm run build
npm run typecheck
npm run lint
```

The lint command may fail if the installed ESLint and TypeScript ESLint versions
are incompatible; consult the output and dependency versions if that occurs.

## Disclaimer

QuantEdge is a software demonstration and educational interface, not investment
advice. Forex trading involves substantial risk, including the potential loss
of capital. Simulated results do not represent actual trading and do not
guarantee future performance.
