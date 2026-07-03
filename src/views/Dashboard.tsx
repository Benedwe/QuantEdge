import { useEffect, useMemo, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Target,
  Brain,
  Newspaper,
  Calendar,
  Zap,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { BotSettings, Candle, CurrencyPair, Signal, Trade } from '../lib/types';
import { generateCandles } from '../lib/market';
import { generateSignal, generateNews, generateEconomicEvents } from '../lib/ai';
import { saveTrade, updateSignalStatus } from '../lib/persistence';
import { Card, CardHeader, StatCard, ConfidenceBar, DirectionBadge, ImpactBadge, EmptyState } from '../components/ui';
import { CandleChart, Sparkline } from '../components/CandleChart';

interface Props {
  pairs: CurrencyPair[];
  trades: Trade[];
  settings: BotSettings;
  onTradesChange: (updater: (prev: Trade[]) => Trade[]) => void;
  refreshTrades: () => Promise<void>;
}

export function Dashboard({ pairs, trades, settings, onTradesChange, refreshTrades }: Props) {
  const [selectedPair, setSelectedPair] = useState(pairs[0].symbol);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [news] = useState(generateNews());
  const [events] = useState(generateEconomicEvents());
  const [executing, setExecuting] = useState<string | null>(null);

  const pair = pairs.find((p) => p.symbol === selectedPair)!;

  useEffect(() => {
    setCandles(generateCandles(selectedPair, 60, 60000));
  }, [selectedPair]);

  useEffect(() => {
    if (signals.length === 0) {
      setSignals([generateSignal(), generateSignal(), generateSignal()]);
    }
  }, [signals.length]);

  const openPositions = trades.filter((t) => t.status === 'OPEN');
  const closedTrades = trades.filter((t) => t.status === 'CLOSED');
  const totalPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);
  const openPnl = openPositions.reduce((s, t) => s + (t.pnl || 0), 0);
  const winRate = closedTrades.length > 0
    ? (closedTrades.filter((t) => t.pnl > 0).length / closedTrades.length) * 100
    : 0;

  const equityCurve = useMemo(() => {
    let eq = settings.account_balance;
    const points = [eq];
    [...closedTrades].reverse().forEach((t) => {
      eq -= t.pnl;
      points.push(eq);
    });
    return points.reverse();
  }, [closedTrades, settings.account_balance]);

  const executeSignal = async (signal: Signal) => {
    setExecuting(signal.id);
    const trade: Trade = {
      id: crypto.randomUUID(),
      symbol: signal.symbol,
      direction: signal.direction,
      status: 'OPEN',
      entry_price: (signal.entry_zone_low + signal.entry_zone_high) / 2,
      exit_price: null,
      stop_loss: signal.stop_loss,
      take_profit: signal.take_profit,
      lot_size: 0.5,
      confidence: signal.confidence,
      pnl: 0,
      pips: 0,
      opened_at: new Date().toISOString(),
      closed_at: null,
      strategy: 'AI Ensemble',
      notes: `Executed from signal (${signal.confidence.toFixed(0)}% confidence)`,
    };
    await saveTrade(trade);
    await updateSignalStatus(signal.id, 'EXECUTED');
    setSignals((prev) => prev.filter((s) => s.id !== signal.id));
    await refreshTrades();
    setExecuting(null);
  };

  const closeTrade = async (trade: Trade) => {
    const currentPair = pairs.find((p) => p.symbol === trade.symbol);
    const exitPrice = currentPair ? currentPair.price : trade.entry_price;
    const pipVal = trade.symbol.includes('JPY') ? 0.01 : 0.0001;
    const diff = trade.direction === 'BUY' ? exitPrice - trade.entry_price : trade.entry_price - exitPrice;
    const pips = diff / pipVal;
    const pnl = pips * trade.lot_size * (trade.symbol.includes('JPY') ? 9 : 10);
    const updated = { ...trade, status: 'CLOSED' as const, exit_price: exitPrice, pnl, pips, closed_at: new Date().toISOString() };
    await saveTrade(updated);
    onTradesChange((prev) => prev.map((tt) => (tt.id === trade.id ? updated : tt)));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Account Balance" value={`$${settings.account_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} change={((totalPnl + openPnl) / settings.account_balance) * 100} icon={<DollarSign className="w-4 h-4" />} accent="accent" />
        <StatCard label="Open P&L" value={`${openPnl >= 0 ? '+' : ''}$${openPnl.toFixed(2)}`} icon={<TrendingUp className="w-4 h-4" />} accent={openPnl >= 0 ? 'bull' : 'bear'} />
        <StatCard label="Win Rate" value={`${winRate.toFixed(1)}%`} icon={<Target className="w-4 h-4" />} accent="gold" />
        <StatCard label="Risk per Trade" value={`${settings.risk_per_trade.toFixed(1)}%`} icon={<Percent className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink-700/40">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-ink-100">{pair.symbol}</h3>
                    <span className={`text-sm font-mono ${pair.changePct >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                      {pair.price.toFixed(pair.symbol.includes('JPY') ? 2 : 4)}
                    </span>
                  </div>
                  <p className="text-xs text-ink-400 mt-0.5">
                    Spread: {pair.spread.toFixed(pair.symbol.includes('JPY') ? 3 : 5)} · Vol: {pair.volume.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <span className={pair.changePct >= 0 ? 'text-bull-400' : 'text-bear-400'}>
                    {pair.changePct >= 0 ? '+' : ''}{pair.changePct.toFixed(3)}%
                  </span>
                  <span className="text-ink-400 text-xs">
                    H: {pair.high.toFixed(pair.symbol.includes('JPY') ? 2 : 4)} L: {pair.low.toFixed(pair.symbol.includes('JPY') ? 2 : 4)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {pairs.slice(0, 6).map((p) => (
                  <button
                    key={p.symbol}
                    onClick={() => setSelectedPair(p.symbol)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      selectedPair === p.symbol
                        ? 'bg-accent-500/15 text-accent-400 border border-accent-500/20'
                        : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800/50'
                    }`}
                  >
                    {p.symbol}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4">
              <CandleChart candles={candles} symbol={selectedPair} height={300} />
            </div>
          </Card>

          {/* Open Positions */}
          <Card>
            <CardHeader title="Open Positions" subtitle={`${openPositions.length} active`} action={<Zap className="w-4 h-4 text-gold-400" />} />
            <div className="p-2">
              {openPositions.length === 0 ? (
                <EmptyState message="No open positions" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-ink-400 border-b border-ink-700/40">
                        <th className="text-left font-medium px-3 py-2">Symbol</th>
                        <th className="text-left font-medium px-3 py-2">Dir</th>
                        <th className="text-right font-medium px-3 py-2">Entry</th>
                        <th className="text-right font-medium px-3 py-2">SL</th>
                        <th className="text-right font-medium px-3 py-2">TP</th>
                        <th className="text-right font-medium px-3 py-2">Lots</th>
                        <th className="text-right font-medium px-3 py-2">Conf.</th>
                        <th className="text-right font-medium px-3 py-2">P&L</th>
                        <th className="text-right font-medium px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {openPositions.map((t) => (
                        <tr key={t.id} className="border-b border-ink-700/20 hover:bg-ink-800/30 transition-colors">
                          <td className="px-3 py-2.5 font-medium text-ink-100">{t.symbol}</td>
                          <td className="px-3 py-2.5"><DirectionBadge direction={t.direction} /></td>
                          <td className="px-3 py-2.5 text-right font-mono text-ink-200">{t.entry_price.toFixed(t.symbol.includes('JPY') ? 2 : 4)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-bear-400">{t.stop_loss.toFixed(t.symbol.includes('JPY') ? 2 : 4)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-bull-400">{t.take_profit.toFixed(t.symbol.includes('JPY') ? 2 : 4)}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-ink-300">{t.lot_size.toFixed(1)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="w-16 ml-auto"><ConfidenceBar value={t.confidence} /></div>
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono font-semibold ${(t.pnl || 0) >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                            {(t.pnl || 0) >= 0 ? '+' : ''}{(t.pnl || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              onClick={() => closeTrade(t)}
                              className="text-xs text-ink-400 hover:text-bear-400 transition-colors px-2 py-1 rounded hover:bg-bear-500/10"
                            >
                              Close
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* AI Signals */}
          <Card>
            <CardHeader title="Live AI Signals" subtitle="Ensemble model output" action={<Brain className="w-4 h-4 text-accent-400" />} />
            <div className="p-3 space-y-3">
              {signals.length === 0 ? (
                <EmptyState message="No active signals — scanning markets..." />
              ) : (
                signals.map((s) => (
                  <div key={s.id} className="bg-ink-800/40 rounded-lg p-3 border border-ink-700/40 card-hover">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-ink-100">{s.symbol}</span>
                        <DirectionBadge direction={s.direction} />
                      </div>
                      <span className="text-xs text-ink-400">{new Date(s.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="mb-2"><ConfidenceBar value={s.confidence} /></div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div>
                        <span className="text-ink-400">Entry</span>
                        <p className="font-mono text-ink-200">{((s.entry_zone_low + s.entry_zone_high) / 2).toFixed(s.symbol.includes('JPY') ? 2 : 4)}</p>
                      </div>
                      <div>
                        <span className="text-ink-400">TP</span>
                        <p className="font-mono text-bull-400">{s.take_profit.toFixed(s.symbol.includes('JPY') ? 2 : 4)}</p>
                      </div>
                      <div>
                        <span className="text-ink-400">SL</span>
                        <p className="font-mono text-bear-400">{s.stop_loss.toFixed(s.symbol.includes('JPY') ? 2 : 4)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => executeSignal(s)}
                      disabled={executing === s.id || s.confidence < settings.min_confidence}
                      className="btn-primary w-full text-xs py-1.5"
                    >
                      {executing === s.id ? 'Executing...' : s.confidence < settings.min_confidence ? `Below ${settings.min_confidence}% threshold` : 'Execute Trade'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Equity curve */}
          <Card>
            <CardHeader title="Equity Curve" subtitle="Closed trade history" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-ink-400">Total P&L</p>
                  <p className={`stat-value text-lg ${totalPnl >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                    {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                  </p>
                </div>
                <Sparkline data={equityCurve} color={totalPnl >= 0 ? '#10b981' : '#f43f5e'} width={160} height={50} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom row: News + Economic Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Market News & Sentiment" subtitle="Real-time sentiment analysis" action={<Newspaper className="w-4 h-4 text-gold-400" />} />
          <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
            {news.map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-ink-800/30 transition-colors">
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.sentiment > 20 ? 'bg-bull-400' : n.sentiment < -20 ? 'bg-bear-400' : 'bg-gold-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink-100 leading-snug">{n.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-ink-400">{n.source}</span>
                    <span className="text-xs text-ink-500">·</span>
                    <span className="text-xs text-ink-400">{new Date(n.time).toLocaleTimeString()}</span>
                    <span className="text-xs text-ink-500">·</span>
                    <span className="text-xs font-mono text-ink-300">{n.currencies.join(', ')}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-mono font-semibold ${n.sentiment > 0 ? 'text-bull-400' : n.sentiment < 0 ? 'text-bear-400' : 'text-ink-300'}`}>
                    {n.sentiment > 0 ? '+' : ''}{n.sentiment}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Economic Calendar" subtitle="High-impact events" action={<Calendar className="w-4 h-4 text-accent-400" />} />
          <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-ink-800/30 transition-colors">
                <div className="flex flex-col items-center w-12 shrink-0">
                  <span className="text-xs font-mono text-ink-300">{new Date(e.event_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span className="text-xs text-ink-400">{new Date(e.event_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="badge-neutral text-[10px]">{e.currency}</span>
                    <ImpactBadge impact={e.impact} />
                  </div>
                  <p className="text-sm text-ink-100 mt-1">{e.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-ink-400">
                    <span>F: <span className="text-ink-200 font-mono">{e.forecast}</span></span>
                    <span>P: <span className="text-ink-200 font-mono">{e.previous}</span></span>
                    {e.actual && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-bull-400" />A: <span className="text-bull-400 font-mono">{e.actual}</span></span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-mono font-semibold ${e.sentiment_impact > 0 ? 'text-bull-400' : e.sentiment_impact < 0 ? 'text-bear-400' : 'text-ink-300'}`}>
                    {e.sentiment_impact > 0 ? '+' : ''}{e.sentiment_impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent closed trades */}
      {closedTrades.length > 0 && (
        <Card>
          <CardHeader title="Trade History" subtitle={`${closedTrades.length} closed trades`} action={<Clock className="w-4 h-4 text-ink-400" />} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-400 border-b border-ink-700/40">
                  <th className="text-left font-medium px-4 py-2">Symbol</th>
                  <th className="text-left font-medium px-4 py-2">Dir</th>
                  <th className="text-left font-medium px-4 py-2">Strategy</th>
                  <th className="text-right font-medium px-4 py-2">Entry</th>
                  <th className="text-right font-medium px-4 py-2">Exit</th>
                  <th className="text-right font-medium px-4 py-2">Pips</th>
                  <th className="text-right font-medium px-4 py-2">P&L</th>
                  <th className="text-right font-medium px-4 py-2">Closed</th>
                </tr>
              </thead>
              <tbody>
                {closedTrades.slice(0, 10).map((t) => (
                  <tr key={t.id} className="border-b border-ink-700/20 hover:bg-ink-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-ink-100">{t.symbol}</td>
                    <td className="px-4 py-2.5"><DirectionBadge direction={t.direction} /></td>
                    <td className="px-4 py-2.5 text-ink-300 text-xs">{t.strategy}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink-300">{t.entry_price.toFixed(t.symbol.includes('JPY') ? 2 : 4)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink-300">{t.exit_price?.toFixed(t.symbol.includes('JPY') ? 2 : 4) ?? '-'}</td>
                    <td className={`px-4 py-2.5 text-right font-mono ${t.pips >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>{t.pips >= 0 ? '+' : ''}{t.pips.toFixed(1)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${t.pnl >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>{t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-ink-400">{t.closed_at ? new Date(t.closed_at).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
