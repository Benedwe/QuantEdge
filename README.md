# QuantEdge — AI-Powered Forex Trading Bot

A professional-grade forex trading dashboard for retail and professional traders. QuantEdge combines machine learning ensembles, technical analysis, sentiment analysis, and strict risk management to identify high-probability trading opportunities in real time.

## Design Philosophy

QuantEdge prioritizes **capital preservation over aggressive returns**:

- Maximum drawdown target: **below 10%**
- Risk-reward ratio: **1:2 or better**
- Minimum confidence threshold: **80%** before any trade executes
- Risk per trade: **1% of account balance**
- Consistency over occasional outsized gains

A bot that earns 20% annually with controlled risk is more valuable than one that occasionally earns 100% but frequently blows up accounts.

## Features

### Dashboard
- Real-time candlestick charts with live price streaming across 8 major currency pairs (EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF, NZD/USD, EUR/GBP)
- AI signal cards with confidence scores and one-click trade execution
- Open positions table with live P&L tracking and close functionality
- Equity curve sparkline from closed trade history
- Market news sentiment feed with per-currency sentiment scores
- Economic calendar with impact ratings (High/Medium/Low) and actual vs. forecast values
- Trade history table with strategy attribution

### AI Signals
- Ensemble predictions from four models: LSTM, Transformer, XGBoost, Random Forest
- Per-model agreement scores and direction consensus
- **Explainable AI**: each signal shows contributing indicators with weighted bars, sentiment impact, and a human-readable explanation
- Market regime detection (Trending, Ranging, Volatile, Breakout) with probability distribution
- Confidence-gated execution — trades below the configured threshold are blocked
- Signal scanning, dismissal, and execution workflow

### Risk Management
- Dynamic position size calculator — input entry/stop and get recommended lot size based on your risk percentage
- Daily drawdown protection monitor with visual progress toward the auto-stop threshold
- Portfolio exposure breakdown by symbol (notional value and percentage of balance)
- Risk-adjusted performance metrics: profit factor, average win/loss, expectancy, approximate Sharpe ratio
- Per-position risk analysis table with individual R:R ratios
- Capital preservation mode toggle (reduces position sizes, raises confidence threshold)

### Backtesting
- Configurable backtest runner (symbol, strategy, time period)
- Equity curve and underwater drawdown visualization
- Monte Carlo simulation with 95th/median/5th percentile outcomes
- Walk-forward analysis across multiple out-of-sample windows
- Probability of profit and risk of ruin calculations
- Strategy comparison table across all six strategies

### Settings
- Trading mode: Manual (approve every trade), Semi-Auto (auto-execute above threshold), Auto (fully automated)
- Broker selection: OANDA, MetaTrader 5, IC Markets, Exness, FXCM
- Configurable risk parameters: risk per trade, max daily drawdown, min confidence, max open positions
- Alert toggles: Telegram, email, push notifications
- Broker connection status display

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS with custom trading design system |
| Charts | Custom canvas-based candlestick and sparkline rendering |
| Icons | Lucide React |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Fonts | Inter (UI), JetBrains Mono (numeric data) |

## Database Schema

Four tables with RLS enabled on all:

- **`trades`** — Executed and pending trades with entry/exit/SL/TP, confidence, P&L, and strategy attribution
- **`signals`** — AI-generated trading signals with model scores, indicator contributions, sentiment, and explainable AI text
- **`bot_settings`** — Single-row configuration table for risk params, broker, alerts, and trading mode
- **`economic_events`** — Economic calendar events with impact level, forecast/previous/actual values, and sentiment impact

All tables use `TO anon, authenticated` policies (single-tenant, no auth screen) so the frontend can read and write via the anon key.

## Getting Started

The dev server runs automatically. The app initializes with seed data on first load — no manual setup required.

### Environment

Supabase credentials are pre-populated in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If env vars are missing, the app runs in offline mode with in-memory seed data.

## Project Structure

```
src/
├── App.tsx                    # App shell, sidebar nav, routing, live data loop
├── components/
│   ├── CandleChart.tsx        # Canvas candlestick + sparkline renderers
│   └── ui.tsx                 # Card, StatCard, ConfidenceBar, badges, Toggle
├── lib/
│   ├── ai.ts                  # Signal/news/event generation, backtest equity
│   ├── market.ts              # Live price engine, candle generation, pip utils
│   ├── persistence.ts         # Supabase CRUD for trades, signals, settings
│   ├── seed.ts                # Seed trade generator
│   ├── supabase.ts            # Supabase client singleton
│   └── types.ts              # Shared TypeScript types
└── views/
    ├── Dashboard.tsx           # Main trading dashboard
    ├── Signals.tsx             # AI prediction engine + explainable AI
    ├── Risk.tsx                # Risk management + position sizing
    ├── Backtesting.tsx         # Backtest runner + Monte Carlo
    └── Settings.tsx            # Configuration + alerts
```

## Design System

- **Color palette**: Dark ink backgrounds (950–100), bull green, bear red, accent blue, gold for warnings/high-conviction
- **Typography**: Inter for UI text, JetBrains Mono for all numeric/price data
- **Spacing**: 8px base unit, consistent across all components
- **Animations**: Fade-in on view transitions, slide-up on expandable sections, pulse on live indicators
- **Contrast**: All text meets WCAG readability standards against dark backgrounds

## Build

```bash
npm run build       # Production build
npm run typecheck   # TypeScript type checking
npm run lint        # ESLint
```

## License

This is a demonstration project. Not financial advice — no warranty is provided for trading decisions made with this software.
