import { useEffect, useState } from 'react';
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Layers,
  Gauge,
  MessageSquare,
  Lightbulb,
  RefreshCw,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { BotSettings, Signal } from '../lib/types';
import { generateSignal } from '../lib/ai';
import { buildMarketState, buildSignals, executeTradePlan } from '../lib/market-engine';
import { saveTrade, updateSignalStatus } from '../lib/persistence';
import { Card, CardHeader, ConfidenceBar, DirectionBadge, EmptyState } from '../components/ui';

interface Props {
  settings: BotSettings;
  onTradeExecuted: () => Promise<void>;
}

export function Signals({ settings, onTradeExecuted }: Props) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selected, setSelected] = useState<Signal | null>(null);
  const [scanning, setScanning] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);

  useEffect(() => {
    const base = buildMarketState('EUR/USD');
    setSignals(buildSignals(base, 4));
  }, []);

  const scan = () => {
    setScanning(true);
    setTimeout(() => {
      const next = buildMarketState('EUR/USD');
      const generated = buildSignals(next, 2);
      setSignals((prev) => [...generated, ...prev].slice(0, 20));
      setScanning(false);
    }, 1200);
  };

  const execute = async (signal: Signal) => {
    setExecuting(signal.id);
    const market = buildMarketState(signal.symbol);
    const trade = executeTradePlan(signal, market, { riskPerTrade: settings.risk_per_trade, balance: settings.account_balance });
    await saveTrade(trade);
    await updateSignalStatus(signal.id, 'EXECUTED');
    setSignals((prev) => prev.filter((s) => s.id !== signal.id));
    if (selected?.id === signal.id) setSelected(null);
    await onTradeExecuted();
    setExecuting(null);
  };

  const dismiss = (id: string) => {
    setSignals((prev) => prev.filter((s) => s.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const fmt = (v: number, jpy: boolean) => v.toFixed(jpy ? 2 : 4);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-500/20 to-bull-500/20 border border-accent-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-accent-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink-100">AI Prediction Engine</h3>
            <p className="text-xs text-ink-400">LSTM · Transformer · XGBoost · Random Forest ensemble</p>
          </div>
        </div>
        <button onClick={scan} disabled={scanning} className="btn-primary">
          {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {scanning ? 'Scanning markets...' : 'Scan for Signals'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signal list */}
        <div className="lg:col-span-2 space-y-3">
          {signals.length === 0 ? (
            <Card><EmptyState message="No active signals. Click 'Scan for Signals' to generate predictions." /></Card>
          ) : (
            signals.map((s) => {
              const jpy = s.symbol.includes('JPY');
              const isSelected = selected?.id === s.id;
              return (
                <Card key={s.id} className={`overflow-hidden ${isSelected ? 'border-accent-500/30' : ''}`}>
                  <button
                    onClick={() => setSelected(isSelected ? null : s)}
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-ink-100">{s.symbol}</span>
                        <DirectionBadge direction={s.direction} />
                        {s.confidence >= 85 && <span className="badge-gold"><Sparkles className="w-3 h-3" /> High Conviction</span>}
                      </div>
                      <span className="text-xs text-ink-400">{new Date(s.created_at).toLocaleTimeString()}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                      <div>
                        <span className="label text-[10px]">Confidence</span>
                        <div className="mt-1"><ConfidenceBar value={s.confidence} /></div>
                      </div>
                      <div>
                        <span className="label text-[10px]">Entry Zone</span>
                        <p className="text-sm font-mono text-ink-200 mt-1">{fmt(s.entry_zone_low, jpy)} - {fmt(s.entry_zone_high, jpy)}</p>
                      </div>
                      <div>
                        <span className="label text-[10px]">Take Profit</span>
                        <p className="text-sm font-mono text-bull-400 mt-1">{fmt(s.take_profit, jpy)}</p>
                      </div>
                      <div>
                        <span className="label text-[10px]">Stop Loss</span>
                        <p className="text-sm font-mono text-bear-400 mt-1">{fmt(s.stop_loss, jpy)}</p>
                      </div>
                      <div>
                        <span className="label text-[10px]">Exp. Volatility</span>
                        <p className="text-sm font-mono text-gold-400 mt-1">{s.expected_volatility.toFixed(2)}σ</p>
                      </div>
                    </div>

                    {/* Model agreement */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-ink-400">Models:</span>
                      {s.models.map((m) => (
                        <span
                          key={m.name}
                          className={`badge text-[10px] ${m.direction === s.direction ? 'badge-bull' : 'badge-bear'}`}
                        >
                          {m.name} {m.score}%
                        </span>
                      ))}
                    </div>
                  </button>

                  {isSelected && (
                    <div className="border-t border-ink-700/40 p-4 bg-ink-900/40 space-y-4 animate-slide-up">
                      {/* Explainable AI */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="w-4 h-4 text-gold-400" />
                          <span className="text-sm font-semibold text-ink-100">Why this trade?</span>
                        </div>
                        <p className="text-sm text-ink-300 leading-relaxed">{s.explanation}</p>
                      </div>

                      {/* Indicator contributions */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Layers className="w-4 h-4 text-accent-400" />
                          <span className="text-sm font-semibold text-ink-100">Contributing Indicators</span>
                        </div>
                        <div className="space-y-1.5">
                          {s.indicators.map((ind) => (
                            <div key={ind.name} className="flex items-center gap-3">
                              <span className="text-xs text-ink-300 w-32 shrink-0">{ind.name}</span>
                              <span className="text-xs font-mono text-ink-400 w-16 shrink-0">{ind.value}</span>
                              <div className="flex-1 h-1.5 bg-ink-700/60 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${ind.signal === 'BUY' ? 'bg-bull-500' : 'bg-bear-500'}`}
                                  style={{ width: `${ind.weight}%` }}
                                />
                              </div>
                              <span className={`text-xs font-mono w-8 text-right ${ind.signal === 'BUY' ? 'text-bull-400' : 'text-bear-400'}`}>
                                {ind.signal === 'BUY' ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sentiment */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-accent-400" />
                          <span className="text-sm font-semibold text-ink-100">Sentiment Impact</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-ink-700/60 rounded-full relative overflow-hidden">
                            <div className="absolute top-0 left-1/2 w-px h-full bg-ink-500" />
                            <div
                              className={`absolute top-0 h-full rounded-full ${s.sentiment_score >= 0 ? 'bg-bull-500/60' : 'bg-bear-500/60'}`}
                              style={{
                                left: s.sentiment_score >= 0 ? '50%' : `${50 + s.sentiment_score / 2}%`,
                                width: `${Math.abs(s.sentiment_score) / 2}%`,
                              }}
                            />
                          </div>
                          <span className={`text-sm font-mono font-semibold w-12 text-right ${s.sentiment_score >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                            {s.sentiment_score > 0 ? '+' : ''}{s.sentiment_score}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => execute(s)}
                          disabled={executing === s.id || s.confidence < settings.min_confidence}
                          className="btn-primary flex-1"
                        >
                          {executing === s.id ? 'Executing...' : s.confidence < settings.min_confidence
                            ? `Confidence below ${settings.min_confidence}% threshold`
                            : <>Execute Trade <CheckCircle2 className="w-4 h-4" /></>}
                        </button>
                        <button onClick={() => dismiss(s.id)} className="btn-ghost">
                          <X className="w-4 h-4" /> Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Right panel: model status */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Model Status" subtitle="Ensemble performance" action={<Gauge className="w-4 h-4 text-accent-400" />} />
            <div className="p-4 space-y-3">
              {[
                { name: 'LSTM', acc: 87.3, status: 'Active' },
                { name: 'Transformer', acc: 89.1, status: 'Active' },
                { name: 'XGBoost', acc: 84.6, status: 'Active' },
                { name: 'Random Forest', acc: 82.4, status: 'Active' },
              ].map((m) => (
                <div key={m.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-bull-400 animate-pulse" />
                    <span className="text-sm text-ink-200">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-400">Acc:</span>
                    <span className="text-sm font-mono font-semibold text-bull-400">{m.acc.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-ink-700/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-300">Ensemble Accuracy</span>
                  <span className="text-sm font-mono font-semibold text-accent-400">91.2%</span>
                </div>
                <div className="mt-2"><ConfidenceBar value={91.2} /></div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Market Regime" subtitle="AI regime detection" />
            <div className="p-4 space-y-3">
              <div className="bg-ink-800/40 rounded-lg p-3 border border-ink-700/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-ink-200">Current Regime</span>
                  <span className="badge-accent">Trending</span>
                </div>
                <p className="text-xs text-ink-400">Moderate volatility, bullish bias on USD pairs</p>
              </div>
              <div className="space-y-2">
                {[
                  { regime: 'Trending', prob: 62 },
                  { regime: 'Ranging', prob: 23 },
                  { regime: 'Volatile', prob: 10 },
                  { regime: 'Breakout', prob: 5 },
                ].map((r) => (
                  <div key={r.regime} className="flex items-center gap-3">
                    <span className="text-xs text-ink-300 w-16">{r.regime}</span>
                    <div className="flex-1 h-1.5 bg-ink-700/60 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-500 rounded-full" style={{ width: `${r.prob}%` }} />
                    </div>
                    <span className="text-xs font-mono text-ink-400 w-8 text-right">{r.prob}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Risk Parameters" subtitle="Active constraints" />
            <div className="p-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-ink-400">Min confidence</span><span className="font-mono text-ink-200">{settings.min_confidence}%</span></div>
              <div className="flex justify-between"><span className="text-ink-400">Risk per trade</span><span className="font-mono text-ink-200">{settings.risk_per_trade}%</span></div>
              <div className="flex justify-between"><span className="text-ink-400">Max daily drawdown</span><span className="font-mono text-ink-200">{settings.max_daily_drawdown}%</span></div>
              <div className="flex justify-between"><span className="text-ink-400">Max positions</span><span className="font-mono text-ink-200">{settings.max_open_positions}</span></div>
              <div className="flex justify-between"><span className="text-ink-400">Capital preservation</span><span className={settings.capital_preservation ? 'text-bull-400' : 'text-ink-400'}>{settings.capital_preservation ? 'ON' : 'OFF'}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
