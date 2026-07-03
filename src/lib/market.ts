import type { Candle, CurrencyPair } from './types';

const PAIR_DEFS: Omit<CurrencyPair, 'change' | 'changePct' | 'high' | 'low' | 'volume'>[] = [
  { symbol: 'EUR/USD', base: 'EUR', quote: 'USD', price: 1.0875, spread: 0.00012 },
  { symbol: 'GBP/USD', base: 'GBP', quote: 'USD', price: 1.2710, spread: 0.00015 },
  { symbol: 'USD/JPY', base: 'USD', quote: 'JPY', price: 157.42, spread: 0.012 },
  { symbol: 'AUD/USD', base: 'AUD', quote: 'USD', price: 0.6585, spread: 0.00010 },
  { symbol: 'USD/CAD', base: 'USD', quote: 'CAD', price: 1.3645, spread: 0.00014 },
  { symbol: 'USD/CHF', base: 'USD', quote: 'CHF', price: 0.9012, spread: 0.00013 },
  { symbol: 'NZD/USD', base: 'NZD', quote: 'USD', price: 0.6095, spread: 0.00011 },
  { symbol: 'EUR/GBP', base: 'EUR', quote: 'GBP', price: 0.8558, spread: 0.00010 },
];

const openPrices = new Map<string, number>();
const dayHighs = new Map<string, number>();
const dayLows = new Map<string, number>();
const volumes = new Map<string, number>();

PAIR_DEFS.forEach((p) => {
  openPrices.set(p.symbol, p.price);
  dayHighs.set(p.symbol, p.price);
  dayLows.set(p.symbol, p.price);
  volumes.set(p.symbol, Math.floor(Math.random() * 50000) + 10000);
});

export const PAIRS: CurrencyPair[] = PAIR_DEFS.map((p) => ({
  ...p,
  change: 0,
  changePct: 0,
  high: p.price,
  low: p.price,
  volume: volumes.get(p.symbol)!,
}));

export function getPair(symbol: string): CurrencyPair | undefined {
  return PAIRS.find((p) => p.symbol === symbol);
}

function volatility(symbol: string): number {
  if (symbol.includes('JPY')) return 0.04;
  return 0.0004;
}

export function tickPrice(pair: CurrencyPair): CurrencyPair {
  const vol = volatility(pair.symbol);
  const drift = (Math.random() - 0.5) * vol * 2;
  const newPrice = Math.max(0.0001, pair.price + drift);
  const open = openPrices.get(pair.symbol) ?? newPrice;
  const change = newPrice - open;
  const changePct = (change / open) * 100;
  const high = Math.max(dayHighs.get(pair.symbol) ?? newPrice, newPrice);
  const low = Math.min(dayLows.get(pair.symbol) ?? newPrice, newPrice);
  dayHighs.set(pair.symbol, high);
  dayLows.set(pair.symbol, low);
  const volume = (volumes.get(pair.symbol) ?? 10000) + Math.floor(Math.random() * 200);
  volumes.set(pair.symbol, volume);
  return { ...pair, price: newPrice, change, changePct, high, low, volume };
}

export function tickAll(): CurrencyPair[] {
  for (let i = 0; i < PAIRS.length; i++) {
    PAIRS[i] = tickPrice(PAIRS[i]);
  }
  return PAIRS;
}

export function generateCandles(symbol: string, count: number, intervalMs: number): Candle[] {
  const pair = getPair(symbol);
  const startPrice = pair ? pair.price : 1.0;
  const vol = volatility(symbol);
  const now = Date.now();
  const candles: Candle[] = [];
  let price = startPrice - vol * count * 0.3;
  for (let i = count - 1; i >= 0; i--) {
    const open = price;
    const move = (Math.random() - 0.48) * vol * 3;
    const close = Math.max(0.0001, open + move);
    const high = Math.max(open, close) + Math.random() * vol * 1.5;
    const low = Math.min(open, close) - Math.random() * vol * 1.5;
    candles.push({
      time: now - i * intervalMs,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 5000) + 1000,
    });
    price = close;
  }
  // anchor last candle close to current live price
  if (pair && candles.length) {
    candles[candles.length - 1].close = pair.price;
  }
  return candles;
}

export function pipSize(symbol: string): number {
  return symbol.includes('JPY') ? 0.01 : 0.0001;
}

export function priceToPips(symbol: string, diff: number): number {
  return diff / pipSize(symbol);
}
