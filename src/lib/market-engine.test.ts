import { describe, it, expect } from 'vitest';
import { buildMarketState, buildSignals, executeTradePlan, evaluateMarketRegime, shouldAutoExecute, type MarketFrame } from './market-engine';

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

  it('blocks execution when auto mode or capital preservation is unsafe', () => {
    const market = buildMarketState('EUR/USD');
    const strongSignal = { ...buildSignals(market, 1)[0], confidence: 91, entry_zone_low: market.price - 0.002, entry_zone_high: market.price + 0.002, stop_loss: market.price - 0.004, take_profit: market.price + 0.006 };
    const weakSignal = { ...strongSignal, confidence: 88 };

    expect(shouldAutoExecute(strongSignal, { min_confidence: 80, trading_mode: 'AUTO', capital_preservation: false, max_open_positions: 5, account_balance: 10000, risk_per_trade: 1, max_daily_drawdown: 10, broker: 'OANDA', telegram_enabled: false, email_enabled: false, push_enabled: false, id: 1, updated_at: new Date().toISOString() }, 2)).toBe(true);
    expect(shouldAutoExecute(strongSignal, { min_confidence: 80, trading_mode: 'SEMIAUTO', capital_preservation: false, max_open_positions: 5, account_balance: 10000, risk_per_trade: 1, max_daily_drawdown: 10, broker: 'OANDA', telegram_enabled: false, email_enabled: false, push_enabled: false, id: 1, updated_at: new Date().toISOString() }, 2)).toBe(false);
    expect(shouldAutoExecute(weakSignal, { min_confidence: 90, trading_mode: 'AUTO', capital_preservation: true, max_open_positions: 5, account_balance: 10000, risk_per_trade: 1, max_daily_drawdown: 10, broker: 'OANDA', telegram_enabled: false, email_enabled: false, push_enabled: false, id: 1, updated_at: new Date().toISOString() }, 1)).toBe(false);
  });

  it('classifies a market regime based on volatility and trend', () => {
    expect(evaluateMarketRegime({ symbol: 'EUR/USD', price: 1.085, frames: [{ label: 'M1', trend: 0.75, momentum: 0.7, volatility: 0.65, support: 1.08, resistance: 1.09 }, { label: 'M5', trend: 0.6, momentum: 0.5, volatility: 0.55, support: 1.08, resistance: 1.09 }, { label: 'H1', trend: 0.7, momentum: 0.6, volatility: 0.6, support: 1.08, resistance: 1.09 }, { label: 'H4', trend: 0.5, momentum: 0.4, volatility: 0.4, support: 1.08, resistance: 1.09 }, { label: 'D1', trend: 0.8, momentum: 0.7, volatility: 0.5, support: 1.08, resistance: 1.09 }], volumeProxy: 5000, newsBias: 0.3, calendarImpact: 0.7, timestamp: Date.now() })).toBe('Trending');
    expect(evaluateMarketRegime({ symbol: 'GBP/USD', price: 1.27, frames: [{ label: 'M1', trend: 0.1, momentum: 0.15, volatility: 0.7, support: 1.26, resistance: 1.28 }, { label: 'M5', trend: -0.05, momentum: 0.1, volatility: 0.7, support: 1.26, resistance: 1.28 }, { label: 'H1', trend: 0.08, momentum: -0.02, volatility: 0.75, support: 1.26, resistance: 1.28 }, { label: 'H4', trend: -0.1, momentum: 0.05, volatility: 0.7, support: 1.26, resistance: 1.28 }, { label: 'D1', trend: 0.05, momentum: -0.02, volatility: 0.72, support: 1.26, resistance: 1.28 }], volumeProxy: 2600, newsBias: 0.05, calendarImpact: 0.1, timestamp: Date.now() })).toBe('Ranging');
  });
});
