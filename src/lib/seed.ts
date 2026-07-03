import type { Trade } from './types';
import { PAIRS } from './market';

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const STRATEGIES = ['LSTM-Transformer', 'XGBoost Ensemble', 'Random Forest', 'Smart Money', 'ICT Order Block'];

export function generateSeedTrades(count: number): Trade[] {
  const trades: Trade[] = [];
  for (let i = 0; i < count; i++) {
    const pair = pick(PAIRS);
    const direction = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const isOpen = i < 4;
    const entry = pair.price + rand(-0.002, 0.002);
    const vol = pair.symbol.includes('JPY') ? 0.3 : 0.003;
    const sl = direction === 'BUY' ? entry - vol * 1.5 : entry + vol * 1.5;
    const tp = direction === 'BUY' ? entry + vol * 3 : entry - vol * 3;
    const lotSize = Math.round(rand(0.1, 2) * 10) / 10;
    const confidence = Math.round(rand(80, 95));
    const openedAt = new Date(Date.now() - rand(1, 72) * 3600000).toISOString();
    let pnl = 0;
    let pips = 0;
    let exitPrice: number | null = null;
    let closedAt: string | null = null;
    if (!isOpen) {
      const win = Math.random() > 0.4;
      pips = win ? rand(15, 60) : -rand(10, 25);
      const pipVal = pair.symbol.includes('JPY') ? 0.01 : 0.0001;
      exitPrice = direction === 'BUY' ? entry + pips * pipVal : entry - pips * pipVal;
      pnl = pips * lotSize * (pair.symbol.includes('JPY') ? 9 : 10);
      closedAt = new Date(Date.now() - rand(0, 48) * 3600000).toISOString();
    }
    trades.push({
      id: crypto.randomUUID(),
      symbol: pair.symbol,
      direction,
      status: isOpen ? 'OPEN' : 'CLOSED',
      entry_price: entry,
      exit_price: exitPrice,
      stop_loss: sl,
      take_profit: tp,
      lot_size: lotSize,
      confidence,
      pnl: Math.round(pnl * 100) / 100,
      pips: Math.round(pips * 10) / 10,
      opened_at: openedAt,
      closed_at: closedAt,
      strategy: pick(STRATEGIES),
      notes: null,
    });
  }
  return trades;
}
