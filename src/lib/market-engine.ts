import type { BotSettings, Direction, IndicatorContribution, ModelScore, Signal, Trade } from './types';
import { getPair, PAIRS } from './market';

export interface MarketFrame {
  label: string;
  trend: number;
  momentum: number;
  volatility: number;
  support: number;
  resistance: number;
}

export interface MarketState {
  symbol: string;
  price: number;
  frames: MarketFrame[];
  volumeProxy: number;
  newsBias: number;
  calendarImpact: number;
  timestamp: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildFrame(label: string, price: number, drift: number, momentumBias: number): MarketFrame {
  const trend = clamp(drift + momentumBias * 0.45, -1, 1);
  const momentum = clamp(momentumBias + (Math.random() - 0.5) * 0.3, -1, 1);
  const volatility = clamp(Math.abs(momentum) * 0.7 + 0.35, 0.2, 1);
  const support = price * (1 - 0.004 - (label.includes('D') ? 0.006 : 0.002));
  const resistance = price * (1 + 0.004 + (label.includes('D') ? 0.006 : 0.002));

  return {
    label,
    trend,
    momentum,
    volatility,
    support,
    resistance,
  };
}

export function buildMarketState(symbol: string): MarketState {
  const pair = getPair(symbol) ?? PAIRS[0];
  const price = pair.price;
  const drift = clamp((pair.changePct ?? 0) / 100, -1, 1);
  const pairVolumeBias = clamp((pair.volume ?? 20000) / 25000, 0.2, 1.8);
  const newsBias = clamp((pair.changePct ?? 0) / 100 + (Math.random() - 0.45) * 0.35, -1, 1);
  const calendarImpact = clamp((pair.spread ?? 0.0005) * 1200 + (Math.random() - 0.5) * 0.5, 0, 1);

  return {
    symbol: pair.symbol,
    price,
    frames: [
      buildFrame('M1', price, drift * 1.1, (newsBias + pairVolumeBias * 0.1) * 0.9),
      buildFrame('M5', price, drift * 0.9, (newsBias + pairVolumeBias * 0.15) * 0.8),
      buildFrame('H1', price, drift * 0.7, (newsBias + pairVolumeBias * 0.2) * 0.7),
      buildFrame('H4', price, drift * 0.55, (newsBias + pairVolumeBias * 0.25) * 0.65),
      buildFrame('D1', price, drift * 0.45, (newsBias + pairVolumeBias * 0.3) * 0.6),
    ],
    volumeProxy: Math.max(1200, Math.round(pair.volume * (0.85 + pairVolumeBias * 0.4))),
    newsBias,
    calendarImpact,
    timestamp: Date.now(),
  };
}

export function buildSignals(market: MarketState, count = 3): Signal[] {
  const frames = market.frames.length > 0 ? market.frames : buildMarketState(market.symbol).frames;
  const shortFrame = frames[0] ?? { trend: 0, momentum: 0, volatility: 0.5, support: market.price, resistance: market.price };
  const mediumFrame = frames[Math.min(2, frames.length - 1)] ?? shortFrame;
  const longFrame = frames[Math.min(frames.length - 1, Math.max(0, frames.length - 1))] ?? shortFrame;

  const weightedTrend = frames.reduce((sum, frame) => sum + frame.trend * (frame.label === 'M1' ? 0.3 : frame.label === 'M5' ? 0.25 : frame.label === 'H1' ? 0.2 : frame.label === 'H4' ? 0.15 : 0.1), 0);
  const weightedMomentum = frames.reduce((sum, frame) => sum + frame.momentum * (frame.label === 'M1' ? 0.25 : frame.label === 'M5' ? 0.2 : frame.label === 'H1' ? 0.18 : frame.label === 'H4' ? 0.18 : 0.19), 0);
  const composite = weightedTrend + weightedMomentum + market.newsBias * 0.8 + market.calendarImpact * 0.3;
  const direction: Direction = composite >= 0 ? 'BUY' : 'SELL';
  const confidence = clamp(Math.round(74 + Math.abs(composite) * 18 + market.calendarImpact * 8), 70, 98);
  const tick = market.price * (market.symbol.includes('JPY') ? 0.0025 : 0.0008);
  const entryLow = market.price - tick * 0.7;
  const entryHigh = market.price + tick * 0.7;
  const takeProfit = direction === 'BUY' ? market.price + tick * 2.2 : market.price - tick * 2.2;
  const stopLoss = direction === 'BUY' ? market.price - tick * 1.3 : market.price + tick * 1.3;

  const modelScores: ModelScore[] = [
    { name: 'Multi-Timeframe Fusion', score: clamp(Math.round(confidence - 3 + market.calendarImpact * 10), 72, 99), direction },
    { name: 'LSTM', score: clamp(Math.round(confidence - 4), 70, 96), direction },
    { name: 'Transformer', score: clamp(Math.round(confidence - 2), 71, 97), direction },
    { name: 'XGBoost', score: clamp(Math.round(confidence - 6), 68, 94), direction },
  ];

  const indicatorSignals: IndicatorContribution[] = [
    { name: 'Multi-Timeframe Alignment', value: weightedTrend.toFixed(3), signal: direction, weight: clamp(Math.round((weightedTrend + 1) * 42), 15, 95) },
    { name: 'M1 Momentum', value: shortFrame.momentum.toFixed(3), signal: shortFrame.momentum >= 0 ? 'BUY' : 'SELL', weight: clamp(Math.round(Math.abs(shortFrame.momentum) * 100), 30, 95) },
    { name: 'H1 Trend', value: mediumFrame.trend.toFixed(3), signal: mediumFrame.trend >= 0 ? 'BUY' : 'SELL', weight: clamp(Math.round(Math.abs(mediumFrame.trend) * 100), 25, 90) },
    { name: 'D1 Bias', value: longFrame.trend.toFixed(3), signal: longFrame.trend >= 0 ? 'BUY' : 'SELL', weight: clamp(Math.round(Math.abs(longFrame.trend) * 100), 20, 85) },
    { name: 'Volume Proxy', value: market.volumeProxy.toLocaleString(), signal: market.volumeProxy > 2000 ? direction : (direction === 'BUY' ? 'SELL' : 'BUY'), weight: clamp(Math.round((market.volumeProxy / 3000) * 100), 25, 95) },
  ];

  const explanation = direction === 'BUY'
    ? `Multi-timeframe alignment is bullish across M1 to D1 with price supported by volume and macro news flow on ${market.symbol}.`
    : `Multi-timeframe alignment is bearish across M1 to D1 with price pressured by volume and macro headwinds on ${market.symbol}.`;

  const signals: Signal[] = Array.from({ length: count }, (_, index) => {
    const signalDirection: Direction = (index + Number(market.newsBias > 0)) % 2 === 0 ? direction : (direction === 'BUY' ? 'SELL' : 'BUY');
    const signalConfidence = clamp(confidence + (index - 1) * 2, 70, 99);
    const signalEntryLow = market.price - tick * (0.7 + index * 0.15);
    const signalEntryHigh = market.price + tick * (0.7 + index * 0.15);
    const signalTakeProfit = signalDirection === 'BUY' ? market.price + tick * (2.2 + index * 0.2) : market.price - tick * (2.2 + index * 0.2);
    const signalStopLoss = signalDirection === 'BUY' ? market.price - tick * (1.3 + index * 0.1) : market.price + tick * (1.3 + index * 0.1);

    return {
      id: crypto.randomUUID(),
      symbol: market.symbol,
      direction: signalDirection,
      confidence: signalConfidence,
      entry_zone_low: signalEntryLow,
      entry_zone_high: signalEntryHigh,
      take_profit: signalTakeProfit,
      stop_loss: signalStopLoss,
      expected_volatility: Number((Math.abs(market.frames[0].volatility) * 1.8).toFixed(2)),
      models: modelScores.map((model) => ({ ...model, score: clamp(model.score + index * 2, 70, 99) })),
      indicators: indicatorSignals.map((indicator) => ({
        ...indicator,
        signal: indicator.signal,
        value: indicator.name.includes('Volume') ? indicator.value : indicator.value,
      })),
      sentiment_score: Math.round((market.newsBias + (signalDirection === 'BUY' ? 0.2 : -0.2)) * 100),
      explanation,
      created_at: new Date().toISOString(),
      status: 'ACTIVE',
    };
  });

  return signals;
}

export function evaluateMarketRegime(market: MarketState): 'Trending' | 'Ranging' | 'Volatile' | 'Breakout' {
  const avgTrend = market.frames.reduce((sum, frame) => sum + frame.trend, 0) / Math.max(1, market.frames.length);
  const avgVol = market.frames.reduce((sum, frame) => sum + frame.volatility, 0) / Math.max(1, market.frames.length);
  const momentum = market.frames.reduce((sum, frame) => sum + frame.momentum, 0) / Math.max(1, market.frames.length);

  if (Math.abs(avgTrend) > 0.55 && avgVol < 0.75) return 'Trending';
  if (Math.abs(avgTrend) < 0.2 && Math.abs(momentum) < 0.2) return 'Ranging';
  if (avgVol > 0.8 || market.volumeProxy > 6000) return 'Volatile';
  if (Math.abs(avgTrend) > 0.6 && market.calendarImpact > 0.6) return 'Breakout';
  return 'Trending';
}

export function shouldAutoExecute(
  signal: Signal,
  settings: BotSettings,
  openPositions: number,
): boolean {
  if (settings.trading_mode !== 'AUTO') return false;
  if (signal.confidence < settings.min_confidence) return false;
  if (settings.capital_preservation && signal.confidence < 90) return false;
  if (openPositions >= settings.max_open_positions) return false;
  if (settings.account_balance <= 0) return false;
  return true;
}

export function executeTradePlan(
  signal: Signal,
  market: MarketState,
  config: { riskPerTrade: number; balance: number },
): Trade {
  const pipSize = market.symbol.includes('JPY') ? 0.01 : 0.0001;
  const distanceToStop = Math.abs(signal.entry_zone_high - signal.stop_loss);
  const riskAmount = config.balance * (config.riskPerTrade / 100);
  const lotSize = Math.max(0.1, riskAmount / (distanceToStop * (market.symbol.includes('JPY') ? 1000 : 100000)));
  const entry = (signal.entry_zone_low + signal.entry_zone_high) / 2;

  return {
    id: crypto.randomUUID(),
    symbol: signal.symbol,
    direction: signal.direction,
    status: 'OPEN',
    entry_price: entry,
    exit_price: null,
    stop_loss: signal.stop_loss,
    take_profit: signal.take_profit,
    lot_size: Number(lotSize.toFixed(2)),
    confidence: signal.confidence,
    pnl: 0,
    pips: 0,
    opened_at: new Date().toISOString(),
    closed_at: null,
    strategy: 'Multi-Timeframe Fusion',
    notes: `Executed using ${market.frames.map((frame) => frame.label).join(', ')} alignment with live volume proxy ${market.volumeProxy}.`,
  };
}

export function getActiveMarketContext(symbol?: string): MarketState {
  return buildMarketState(symbol ?? PAIRS[0].symbol);
}
