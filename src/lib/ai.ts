import type {
  Direction,
  EconomicEvent,
  IndicatorContribution,
  ModelScore,
  NewsItem,
  Signal,
} from './types';
import { getPair, PAIRS } from './market';

const INDICATOR_NAMES = ['RSI(14)', 'MACD(12,26)', 'Bollinger Bands', 'EMA(50)', 'EMA(200)', 'ATR(14)', 'Fibonacci 61.8%', 'Support/Resistance', 'Order Block', 'Fair Value Gap', 'Liquidity Zone', 'Stochastic'];

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genModels(direction: Direction): ModelScore[] {
  const names = ['LSTM', 'Transformer', 'XGBoost', 'Random Forest'];
  return names.map((name) => ({
    name,
    score: Math.round(rand(72, 96)),
    direction: Math.random() > 0.2 ? direction : (direction === 'BUY' ? 'SELL' : 'BUY'),
  }));
}

function genIndicators(direction: Direction): IndicatorContribution[] {
  const count = Math.floor(rand(5, 8));
  const chosen = [...INDICATOR_NAMES].sort(() => Math.random() - 0.5).slice(0, count);
  return chosen.map((name) => ({
    name,
    value: name.includes('RSI')
      ? rand(25, 75).toFixed(1)
      : name.includes('MACD')
      ? rand(-0.0008, 0.0008).toFixed(4)
      : name.includes('ATR')
      ? rand(0.0008, 0.002).toFixed(4)
      : rand(0.5, 2).toFixed(3),
    signal: Math.random() > 0.25 ? direction : (direction === 'BUY' ? 'SELL' : 'BUY'),
    weight: Math.round(rand(15, 35)),
  }));
}

function genExplanation(symbol: string, direction: Direction, confidence: number): string {
  const reasons = [
    `Multiple timeframe alignment confirms ${direction === 'BUY' ? 'bullish' : 'bearish'} momentum on ${symbol}.`,
    `LSTM and Transformer models agree on ${direction} with ${confidence.toFixed(0)}% consensus.`,
    `Smart money concept detected a ${direction === 'BUY' ? 'demand' : 'supply'} order block near current price.`,
    `Liquidity sweep completed; price likely to reverse toward ${direction === 'BUY' ? 'higher' : 'lower'} levels.`,
    `Fair value gap unfilled on H1 supports ${direction} bias.`,
  ];
  return pick(reasons) + ' ' + pick(reasons);
}

export function generateSignal(symbol?: string): Signal {
  const pair = symbol ? getPair(symbol)! : pick(PAIRS);
  const direction: Direction = Math.random() > 0.5 ? 'BUY' : 'SELL';
  const confidence = Math.round(rand(78, 95));
  const price = pair.price;
  const vol = symbol?.includes('JPY') ? 0.3 : 0.003;
  const entryLow = price - vol * 0.5;
  const entryHigh = price + vol * 0.5;
  const tp = direction === 'BUY' ? price + vol * 3 : price - vol * 3;
  const sl = direction === 'BUY' ? price - vol * 1.5 : price + vol * 1.5;
  const sentiment = Math.round(rand(-60, 60));
  return {
    id: crypto.randomUUID(),
    symbol: pair.symbol,
    direction,
    confidence,
    entry_zone_low: entryLow,
    entry_zone_high: entryHigh,
    take_profit: tp,
    stop_loss: sl,
    expected_volatility: Math.round(rand(0.8, 2.5) * 100) / 100,
    models: genModels(direction),
    indicators: genIndicators(direction),
    sentiment_score: sentiment,
    explanation: genExplanation(pair.symbol, direction, confidence),
    created_at: new Date().toISOString(),
    status: 'ACTIVE',
  };
}

export function generateSignals(count: number): Signal[] {
  return Array.from({ length: count }, () => generateSignal());
}

export function generateNews(): NewsItem[] {
  const titles = [
    { title: 'Fed signals patience on rate cuts amid sticky inflation', cur: ['USD'], sent: -45 },
    { title: 'ECB considers June easing as eurozone growth slows', cur: ['EUR'], sent: -30 },
    { title: 'BoJ intervention rumors intensify as yen hits 157', cur: ['JPY'], sent: 55 },
    { title: 'UK GDP beats expectations, pound rallies', cur: ['GBP'], sent: 65 },
    { title: 'Australian employment surges, RBA hawkish tilt', cur: ['AUD'], sent: 50 },
    { title: 'Oil prices stabilize, loonie finds support', cur: ['CAD'], sent: 25 },
    { title: 'Swiss National Bank reaffirms FX intervention readiness', cur: ['CHF'], sent: 20 },
    { title: 'Risk-on sentiment lifts commodity currencies', cur: ['AUD', 'NZD'], sent: 40 },
    { title: 'Geopolitical tensions rise, safe-haven flows increase', cur: ['USD', 'JPY', 'CHF'], sent: -35 },
    { title: 'NZD rallies after strong trade surplus data', cur: ['NZD'], sent: 45 },
  ];
  const sources = ['Reuters', 'Bloomberg', 'FXStreet', 'DailyFX', 'Investing.com'];
  return titles.map((t, i) => ({
    id: crypto.randomUUID(),
    title: t.title,
    source: pick(sources),
    sentiment: t.sent,
    impact: Math.abs(t.sent) > 40 ? 'HIGH' : Math.abs(t.sent) > 20 ? 'MEDIUM' : 'LOW',
    time: new Date(Date.now() - i * 1000 * 60 * Math.floor(rand(5, 90))).toISOString(),
    currencies: t.cur,
  }));
}

export function generateEconomicEvents(): EconomicEvent[] {
  const events = [
    { title: 'Non-Farm Payrolls', cur: 'USD', impact: 'HIGH' as const, f: '180K', p: '175K' },
    { title: 'CPI m/m', cur: 'USD', impact: 'HIGH' as const, f: '0.3%', p: '0.4%' },
    { title: 'ECB Press Conference', cur: 'EUR', impact: 'HIGH' as const, f: '-', p: '-' },
    { title: 'BoE Official Bank Rate', cur: 'GBP', impact: 'HIGH' as const, f: '5.25%', p: '5.25%' },
    { title: 'Unemployment Rate', cur: 'AUD', impact: 'MEDIUM' as const, f: '4.1%', p: '4.0%' },
    { title: 'Trade Balance', cur: 'CAD', impact: 'LOW' as const, f: '1.2B', p: '0.8B' },
    { title: 'Retail Sales m/m', cur: 'EUR', impact: 'MEDIUM' as const, f: '0.2%', p: '-0.1%' },
    { title: 'BoJ Summary of Opinions', cur: 'JPY', impact: 'MEDIUM' as const, f: '-', p: '-' },
  ];
  return events.map((e, i) => ({
    id: crypto.randomUUID(),
    title: e.title,
    currency: e.cur,
    impact: e.impact,
    actual: i < 2 ? (Math.random() > 0.5 ? e.f : e.p) : null,
    forecast: e.f,
    previous: e.p,
    event_time: new Date(Date.now() + (i - 3) * 1000 * 60 * 60 * Math.floor(rand(1, 8))).toISOString(),
    sentiment_impact: Math.round(rand(-50, 50)),
  }));
}

export function generateBacktestEquity(initial: number, points: number): { time: number; equity: number; drawdown: number }[] {
  let equity = initial;
  let peak = initial;
  const out: { time: number; equity: number; drawdown: number }[] = [];
  for (let i = 0; i < points; i++) {
    const win = Math.random() > 0.38;
    const rr = rand(1.5, 3.2);
    const riskAmt = equity * 0.01;
    equity += win ? riskAmt * rr : -riskAmt;
    equity += rand(-equity * 0.001, equity * 0.001);
    peak = Math.max(peak, equity);
    const dd = ((equity - peak) / peak) * 100;
    out.push({ time: Date.now() - (points - i) * 86400000, equity, drawdown: dd });
  }
  return out;
}
