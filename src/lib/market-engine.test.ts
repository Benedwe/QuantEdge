import { describe, it, expect } from 'vitest';
import { buildMarketState, buildSignals, executeTradePlan, type MarketFrame } from './market-engine';

describe('market engine', () => {
  it('fuses short, medium, and long frame bias into a single signal', () => {
    const market = buildMarketState('EUR/USD');

    const signal = buildSignals(market, 3)[0];

    expect(signal).toBeTruthy();
    expect(signal.symbol).toBe('EUR/USD');
    expect(['BUY', 'SELL']).toContain(signal.direction);
    expect(signal.confidence).toBeGreaterThanOrEqual(70);
    expect(signal.confidence).toBeLessThanOrEqual(99);
    expect(signal.entry_zone_low).toBeLessThan(signal.entry_zone_high);
    expect(signal.take_profit).not.toBeNaN();
    expect(signal.stop_loss).not.toBeNaN();
  });

  it('creates a trade execution payload from the market state', () => {
    const market = buildMarketState('GBP/USD');
    const signal = buildSignals(market, 1)[0];

    const trade = executeTradePlan(signal, market, { riskPerTrade: 1, balance: 10000 });

    expect(trade.symbol).toBe('GBP/USD');
    expect(['BUY', 'SELL']).toContain(trade.direction);
    expect(trade.entry_price).toBeGreaterThan(0);
    expect(trade.stop_loss).toBeGreaterThan(0);
    expect(trade.take_profit).toBeGreaterThan(0);
    expect(trade.lot_size).toBeGreaterThan(0);
    expect(trade.confidence).toBeGreaterThan(0);
  });

  it('marks multi-timeframe frames as active market data', () => {
    const frames: MarketFrame[] = [
      { label: 'M1', trend: 1, momentum: 0.8, volatility: 0.7, support: 1.08, resistance: 1.09 },
      { label: 'H1', trend: 0.9, momentum: 0.6, volatility: 0.6, support: 1.07, resistance: 1.1 },
      { label: 'D1', trend: 0.7, momentum: 0.5, volatility: 0.5, support: 1.06, resistance: 1.11 },
    ];

    const market = {
      symbol: 'EUR/USD',
      price: 1.085,
      frames,
      volumeProxy: 3800,
      newsBias: 0.2,
      calendarImpact: 0.6,
      timestamp: Date.now(),
    };

    const signal = buildSignals(market, 1)[0];

    expect(signal.models.some((m) => m.name.includes('Multi'))).toBe(true);
    expect(signal.indicators.some((i) => i.name.includes('Multi'))).toBe(true);
  });
});
