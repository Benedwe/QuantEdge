export type Direction = 'BUY' | 'SELL';
export type TradeStatus = 'OPEN' | 'CLOSED' | 'PENDING';
export type TradingMode = 'AUTO' | 'MANUAL' | 'SEMIAUTO';
export type SignalStatus = 'ACTIVE' | 'EXPIRED' | 'EXECUTED';
export type Impact = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CurrencyPair {
  symbol: string;
  base: string;
  quote: string;
  price: number;
  change: number;
  changePct: number;
  spread: number;
  high: number;
  low: number;
  volume: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  id: string;
  symbol: string;
  direction: Direction;
  status: TradeStatus;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number;
  take_profit: number;
  lot_size: number;
  confidence: number;
  pnl: number;
  pips: number;
  opened_at: string;
  closed_at: string | null;
  strategy: string;
  notes: string | null;
}

export interface ModelScore {
  name: string;
  score: number;
  direction: Direction;
}

export interface IndicatorContribution {
  name: string;
  value: string;
  signal: Direction;
  weight: number;
}

export interface Signal {
  id: string;
  symbol: string;
  direction: Direction;
  confidence: number;
  entry_zone_low: number;
  entry_zone_high: number;
  take_profit: number;
  stop_loss: number;
  expected_volatility: number;
  models: ModelScore[];
  indicators: IndicatorContribution[];
  sentiment_score: number;
  explanation: string;
  created_at: string;
  status: SignalStatus;
}

export interface BotSettings {
  id: number;
  account_balance: number;
  risk_per_trade: number;
  max_daily_drawdown: number;
  min_confidence: number;
  max_open_positions: number;
  trading_mode: TradingMode;
  broker: string;
  telegram_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  capital_preservation: boolean;
  updated_at: string;
}

export interface EconomicEvent {
  id: string;
  title: string;
  currency: string;
  impact: Impact;
  actual: string | null;
  forecast: string;
  previous: string;
  event_time: string;
  sentiment_impact: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  sentiment: number;
  impact: Impact;
  time: string;
  currencies: string[];
}

export type ViewKey =
  | 'dashboard'
  | 'signals'
  | 'risk'
  | 'backtesting'
  | 'settings';
