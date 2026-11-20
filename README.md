# QuantEdge

QuantEdge is a forex dashboard prototype built with React, TypeScript, and
Vite. It demonstrates a trading-oriented interface for market charts, generated
signals, trade tracking, risk calculations, settings, and illustrative
backtesting.

> **Prototype only:** Market prices, candles, news, calendar entries, signals,
> and backtest results are generated or randomized by the current implementation.
> They are not a live feed or evidence of predictive performance. Do not rely on
> this project for financial decisions or connect a live trading account.

## Documentation

See the [QuantEdge Platform Guide](docs/platform-guide.md) for:

- Local setup and configuration
- Dashboard and feature walkthrough
- Data, signal, and backtest limitations
- Broker integration status and security warnings
- Testing and build commands

## Hosted demo

[Open QuantEdge](https://ai-powered-forex-tra-byyt.bolt.host/)

## Quick start

Requirements: Node.js and npm versions supported by the installed Vite release.

```bash
npm install
npm run dev
```

For an offline local run, leave Supabase environment variables unset. To connect
Supabase, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local
environment file. Review the security section in the platform guide before
connecting any database or account.

## Project checks

```bash
npm test
npm run build
npm run typecheck
npm run lint
```

## Repository

[Benedwe/QuantEdge on GitHub](https://github.com/Benedwe/QuantEdge)
