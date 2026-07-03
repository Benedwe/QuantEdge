/*
# Forex Trading Bot — Core Schema

## Overview
Single-tenant schema for an AI-powered forex trading bot dashboard. No sign-in
screen, so data is intentionally shared/public and policies use `TO anon, authenticated`.

## Tables

1. `trades` — Executed and pending trades.
   - id (uuid PK)
   - symbol (text, e.g. "EUR/USD")
   - direction (text: "BUY" | "SELL")
   - status (text: "OPEN" | "CLOSED" | "PENDING")
   - entry_price (numeric)
   - exit_price (numeric, nullable)
   - stop_loss (numeric)
   - take_profit (numeric)
   - lot_size (numeric)
   - confidence (numeric 0-100, AI confidence score)
   - pnl (numeric, realized profit/loss in account currency)
   - pips (numeric, result in pips)
   - opened_at (timestamptz)
   - closed_at (timestamptz, nullable)
   - strategy (text, which strategy/model triggered it)
   - notes (text, nullable)

2. `signals` — AI-generated trading signals (not necessarily executed).
   - id (uuid PK)
   - symbol (text)
   - direction (text: "BUY" | "SELL")
   - confidence (numeric 0-100)
   - entry_zone_low / entry_zone_high (numeric)
   - take_profit (numeric)
   - stop_loss (numeric)
   - expected_volatility (numeric)
   - models (jsonb, which models agreed and their individual scores)
   - indicators (jsonb, contributing technical indicators)
   - sentiment_score (numeric -100 to 100)
   - explanation (text, human-readable explainable AI summary)
   - created_at (timestamptz)
   - status (text: "ACTIVE" | "EXPIRED" | "EXECUTED")

3. `bot_settings` — Single-row config for risk params, broker, alerts.
   - id (int PK, always 1)
   - account_balance (numeric)
   - risk_per_trade (numeric, percent)
   - max_daily_drawdown (numeric, percent)
   - min_confidence (numeric, percent threshold to trade)
   - max_open_positions (int)
   - trading_mode (text: "AUTO" | "MANUAL" | "SEMIAUTO")
   - broker (text)
   - telegram_enabled (boolean)
   - email_enabled (boolean)
   - push_enabled (boolean)
   - capital_preservation (boolean)
   - updated_at (timestamptz)

4. `economic_events` — Economic calendar events affecting sentiment.
   - id (uuid PK)
   - title (text)
   - currency (text, e.g. "USD")
   - impact (text: "HIGH" | "MEDIUM" | "LOW")
   - actual (text, nullable)
   - forecast (text)
   - previous (text)
   - event_time (timestamptz)
   - sentiment_impact (numeric -100 to 100)

## Security
- RLS enabled on all tables.
- All tables allow anon + authenticated CRUD (single-tenant, no auth screen).
*/

-- Trades
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('BUY','SELL')),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','PENDING')),
  entry_price numeric(18,5) NOT NULL,
  exit_price numeric(18,5),
  stop_loss numeric(18,5) NOT NULL,
  take_profit numeric(18,5) NOT NULL,
  lot_size numeric(18,4) NOT NULL,
  confidence numeric(5,2) NOT NULL DEFAULT 0,
  pnl numeric(18,2) DEFAULT 0,
  pips numeric(18,2) DEFAULT 0,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  strategy text NOT NULL DEFAULT 'Ensemble',
  notes text
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_trades" ON trades;
CREATE POLICY "anon_select_trades" ON trades FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_trades" ON trades;
CREATE POLICY "anon_insert_trades" ON trades FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_trades" ON trades;
CREATE POLICY "anon_update_trades" ON trades FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_trades" ON trades;
CREATE POLICY "anon_delete_trades" ON trades FOR DELETE TO anon, authenticated USING (true);

-- Signals
CREATE TABLE IF NOT EXISTS signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('BUY','SELL')),
  confidence numeric(5,2) NOT NULL DEFAULT 0,
  entry_zone_low numeric(18,5) NOT NULL,
  entry_zone_high numeric(18,5) NOT NULL,
  take_profit numeric(18,5) NOT NULL,
  stop_loss numeric(18,5) NOT NULL,
  expected_volatility numeric(5,2) NOT NULL DEFAULT 0,
  models jsonb NOT NULL DEFAULT '{}',
  indicators jsonb NOT NULL DEFAULT '[]',
  sentiment_score numeric(5,2) DEFAULT 0,
  explanation text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','EXECUTED'))
);

ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_signals" ON signals;
CREATE POLICY "anon_select_signals" ON signals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_signals" ON signals;
CREATE POLICY "anon_insert_signals" ON signals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_signals" ON signals;
CREATE POLICY "anon_update_signals" ON signals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_signals" ON signals;
CREATE POLICY "anon_delete_signals" ON signals FOR DELETE TO anon, authenticated USING (true);

-- Bot settings (single row)
CREATE TABLE IF NOT EXISTS bot_settings (
  id int PRIMARY KEY DEFAULT 1,
  account_balance numeric(18,2) NOT NULL DEFAULT 10000,
  risk_per_trade numeric(5,2) NOT NULL DEFAULT 1.0,
  max_daily_drawdown numeric(5,2) NOT NULL DEFAULT 10.0,
  min_confidence numeric(5,2) NOT NULL DEFAULT 80.0,
  max_open_positions int NOT NULL DEFAULT 5,
  trading_mode text NOT NULL DEFAULT 'MANUAL' CHECK (trading_mode IN ('AUTO','MANUAL','SEMIAUTO')),
  broker text NOT NULL DEFAULT 'OANDA',
  telegram_enabled boolean NOT NULL DEFAULT false,
  email_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT false,
  capital_preservation boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE bot_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_bot_settings" ON bot_settings;
CREATE POLICY "anon_select_bot_settings" ON bot_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_bot_settings" ON bot_settings;
CREATE POLICY "anon_insert_bot_settings" ON bot_settings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_bot_settings" ON bot_settings;
CREATE POLICY "anon_update_bot_settings" ON bot_settings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Economic events
CREATE TABLE IF NOT EXISTS economic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  currency text NOT NULL,
  impact text NOT NULL DEFAULT 'MEDIUM' CHECK (impact IN ('HIGH','MEDIUM','LOW')),
  actual text,
  forecast text NOT NULL DEFAULT '',
  previous text NOT NULL DEFAULT '',
  event_time timestamptz NOT NULL,
  sentiment_impact numeric(5,2) DEFAULT 0
);

ALTER TABLE economic_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_economic_events" ON economic_events;
CREATE POLICY "anon_select_economic_events" ON economic_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_economic_events" ON economic_events;
CREATE POLICY "anon_insert_economic_events" ON economic_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_economic_events" ON economic_events;
CREATE POLICY "anon_update_economic_events" ON economic_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_economic_events" ON economic_events;
CREATE POLICY "anon_delete_economic_events" ON economic_events FOR DELETE TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_opened_at ON trades(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_economic_events_time ON economic_events(event_time DESC);
