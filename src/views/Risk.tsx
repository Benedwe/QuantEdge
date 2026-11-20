import { useMemo, useState } from 'react';
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  Calculator,
  Activity,
  Lock,
  Gauge,
} from 'lucide-react';
import type { BotSettings, CurrencyPair, Trade } from '../lib/types';
import { Card, CardHeader, StatCard, DirectionBadge } from '../components/ui';
import { Sparkline } from '../components/CandleChart';

interface Props {
  trades: Trade[];
  settings: BotSettings;
  pairs: CurrencyPair[];
}

export function Risk({ trades, settings, pairs }: Props) {
  const [entryPrice, setEntryPrice] = useState('1.0875');
  const [stopPrice, setStopPrice] = useState('1.0850');
  const [symbol, setSymbol] = useState('EUR/USD');
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');

  const openPositions = trades.filter((t) => t.status === 'OPEN');
  const closedTrades = trades.filter((t) => t.status === 'CLOSED');

  const totalPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);
  const openPnl = openPositions.reduce((s, t) => s + (t.pnl || 0), 0);

  const riskAmount = settings.account_balance * (settings.risk_per_trade / 100);
  const maxDailyLoss = settings.account_balance * (settings.max_daily_drawdown / 100);

  // Exposure by symbol
  const exposure = useMemo(() => {
    const map = new Map<string, number>();
    openPositions.forEach((t) => {
      const notional = t.lot_size * 100000 * t.entry_price;
      map.set(t.symbol, (map.get(t.symbol) ?? 0) + notional);
    });
    return Array.from(map.entries()).map(([sym, notional]) => ({
      symbol: sym,
      notional,
      pct: (notional / settings.account_balance) * 100,
    }));
  }, [openPositions, settings.account_balance]);

  // Drawdown history (simulated)
  const ddHistory = useMemo(() => {
    let peak = settings.account_balance;
    let eq = settings.account_balance;
    return [...closedTrades].reverse().map((t) => {
      eq -= t.pnl;
      peak = Math.max(peak, eq);
      return ((eq - peak) / peak) * 100;
    });
  }, [closedTrades, settings.account_balance]);

  const maxDD = ddHistory.length ? Math.min(...ddHistory) : 0;

  // Position sizing calculator
  const entry = parseFloat(entryPrice) || 0;
  const stop = parseFloat(stopPrice) || 0;
  const pipVal = symbol.includes('JPY') ? 0.01 : 0.0001;
  const stopPips = Math.abs(entry - stop) / pipVal;
  const pipValuePerLot = symbol.includes('JPY') ? 9 : 10;
  const riskPerLot = stopPips * pipValuePerLot;
  const recommendedLots = riskPerLot > 0 ? riskAmount / riskPerLot : 0;
  const potentialLoss = recommendedLots * riskPerLot;
  const rr = 2; // assume 1:2 RR
  const potentialProfit = potentialLoss * rr;

  const dailyLossUsed = openPnl < 0 ? Math.abs(openPnl) : 0;
  const dailyLossPct = (dailyLossUsed / maxDailyLoss) * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Account Balance" value={`$${settings.account_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={<Shield className="w-4 h-4" />} accent="accent" />
        <StatCard label="Risk per Trade" value={`$${riskAmount.toFixed(2)}`} subtitle={`${settings.risk_per_trade}% of balance`} icon={<Calculator className="w-4 h-4" />} />
        <StatCard label="Max Daily Drawdown" value={`${settings.max_daily_drawdown.toFixed(1)}%`} subtitle={`$${maxDailyLoss.toFixed(0)} limit`} icon={<TrendingDown className="w-4 h-4" />} accent="bear" />
        <StatCard label="Max Drawdown (realized)" value={`${maxDD.toFixed(2)}%`} icon={<AlertTriangle className="w-4 h-4" />} accent={Math.abs(maxDD) > settings.max_daily_drawdown ? 'bear' : 'gold'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Position Sizing Calculator */}
        <Card>
          <CardHeader title="Position Size Calculator" subtitle="Dynamic risk-based sizing" action={<Calculator className="w-4 h-4 text-accent-400" />} />
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Symbol</label>
                <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="input mt-1">
                  {pairs.map((p) => <option key={p.symbol} value={p.symbol}>{p.symbol}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Direction</label>
                <select value={direction} onChange={(e) => setDirection(e.target.value as 'BUY' | 'SELL')} className="input mt-1">
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </div>
              <div>
                <label className="label">Entry Price</label>
                <input type="number" step="0.0001" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} className="input mt-1 font-mono" />
              </div>
              <div>
                <label className="label">Stop Loss</label>
                <input type="number" step="0.0001" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} className="input mt-1 font-mono" />
              </div>
            </div>

            <div className="bg-ink-900/40 rounded-lg p-4 border border-ink-700/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-300">Stop distance</span>
                <span className="font-mono text-ink-100">{stopPips.toFixed(1)} pips</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-300">Risk per lot</span>
                <span className="font-mono text-bear-400">${riskPerLot.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-300">Risk amount ({settings.risk_per_trade}%)</span>
                <span className="font-mono text-gold-400">${riskAmount.toFixed(2)}</span>
              </div>
              <div className="pt-3 border-t border-ink-700/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-ink-100">Recommended Position</span>
                  <span className="text-lg font-mono font-bold text-accent-400">{recommendedLots.toFixed(2)} lots</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-400">Potential loss / profit (1:2)</span>
                  <span>
                    <span className="font-mono text-bear-400">-${potentialLoss.toFixed(2)}</span>
                    <span className="text-ink-500 mx-1">/</span>
                    <span className="font-mono text-bull-400">+${potentialProfit.toFixed(2)}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Daily Drawdown Monitor */}
        <Card>
          <CardHeader title="Daily Drawdown Protection" subtitle="Auto-stop after threshold" action={<Lock className="w-4 h-4 text-gold-400" />} />
          <div className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-ink-300">Daily loss used</span>
                <span className={`font-mono font-semibold ${dailyLossPct > 70 ? 'text-bear-400' : 'text-ink-200'}`}>
                  ${dailyLossUsed.toFixed(2)} / ${maxDailyLoss.toFixed(2)}
                </span>
              </div>
              <div className="h-3 bg-ink-700/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${dailyLossPct > 70 ? 'bg-bear-500' : dailyLossPct > 40 ? 'bg-gold-500' : 'bg-bull-500'}`}
                  style={{ width: `${Math.min(100, dailyLossPct)}%` }}
                />
              </div>
              <p className="text-xs text-ink-400 mt-2">
                {dailyLossPct > 70
                  ? 'Approaching daily limit — capital preservation recommended'
                  : 'Within safe daily loss range'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-ink-900/40 rounded-lg p-3 border border-ink-700/40">
                <span className="label text-[10px]">Open P&L</span>
                <p className={`stat-value text-lg ${openPnl >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                  {openPnl >= 0 ? '+' : ''}${openPnl.toFixed(2)}
                </p>
              </div>
              <div className="bg-ink-900/40 rounded-lg p-3 border border-ink-700/40">
                <span className="label text-[10px]">Realized P&L</span>
                <p className={`stat-value text-lg ${totalPnl >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                  {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="bg-ink-900/40 rounded-lg p-3 border border-ink-700/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-ink-300">Drawdown history</span>
                <span className="text-xs text-ink-400">Last {ddHistory.length} trades</span>
              </div>
              {ddHistory.length > 1 ? (
                <Sparkline data={ddHistory} color="#f43f5e" width={300} height={50} />
              ) : (
                <p className="text-xs text-ink-400 py-4 text-center">Insufficient data</p>
              )}
            </div>

            <div className={`rounded-lg p-3 border flex items-center gap-3 ${settings.capital_preservation ? 'bg-bull-500/10 border-bull-500/20' : 'bg-ink-900/40 border-ink-700/40'}`}>
              <Shield className={`w-5 h-5 ${settings.capital_preservation ? 'text-bull-400' : 'text-ink-400'}`} />
              <div>
                <p className="text-sm font-medium text-ink-100">Capital Preservation Mode</p>
                <p className="text-xs text-ink-400">{settings.capital_preservation ? 'Active — reduced position sizes, higher confidence threshold' : 'Inactive — normal risk parameters'}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Exposure breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Portfolio Exposure" subtitle="Notional by symbol" action={<Activity className="w-4 h-4 text-accent-400" />} />
          <div className="p-5">
            {exposure.length === 0 ? (
              <p className="text-sm text-ink-400 py-8 text-center">No open positions</p>
            ) : (
              <div className="space-y-3">
                {exposure.map((e) => (
                  <div key={e.symbol}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-ink-200">{e.symbol}</span>
                      <span className="text-sm font-mono text-ink-300">${e.notional.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({e.pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-ink-700/60 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-500 rounded-full" style={{ width: `${Math.min(100, e.pct)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Risk Metrics" subtitle="Risk-adjusted performance" action={<Gauge className="w-4 h-4 text-gold-400" />} />
          <div className="p-5 space-y-3">
            {(() => {
              const wins = closedTrades.filter((t) => t.pnl > 0);
              const losses = closedTrades.filter((t) => t.pnl < 0);
              const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
              const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0;
              const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;
              const expectancy = closedTrades.length ? totalPnl / closedTrades.length : 0;
              const sharpe = Math.abs(totalPnl) > 0 && closedTrades.length > 1
                ? (totalPnl / closedTrades.length) / Math.sqrt(closedTrades.reduce((s, t) => s + Math.pow(t.pnl - totalPnl / closedTrades.length, 2), 0) / closedTrades.length)
                : 0;
              return (
                <>
                  <MetricRow label="Profit Factor" value={profitFactor.toFixed(2)} good={profitFactor >= 1.5} />
                  <MetricRow label="Avg Win / Avg Loss" value={`$${avgWin.toFixed(2)} / $${avgLoss.toFixed(2)}`} good={avgWin > avgLoss} />
                  <MetricRow label="Expectancy per Trade" value={`$${expectancy.toFixed(2)}`} good={expectancy > 0} />
                  <MetricRow label="Sharpe Ratio (approx)" value={sharpe.toFixed(2)} good={sharpe > 1} />
                  <MetricRow label="Open Positions" value={`${openPositions.length} / ${settings.max_open_positions}`} good={openPositions.length < settings.max_open_positions} />
                  <MetricRow label="Risk-Reward Target" value="1:2" good={true} />
                </>
              );
            })()}
          </div>
        </Card>
      </div>

      {/* Open positions risk table */}
      {openPositions.length > 0 && (
        <Card>
          <CardHeader title="Position Risk Analysis" subtitle="Per-trade risk exposure" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-ink-400 border-b border-ink-700/40">
                  <th className="text-left font-medium px-4 py-2">Symbol</th>
                  <th className="text-left font-medium px-4 py-2">Dir</th>
                  <th className="text-right font-medium px-4 py-2">Lots</th>
                  <th className="text-right font-medium px-4 py-2">Entry</th>
                  <th className="text-right font-medium px-4 py-2">Stop</th>
                  <th className="text-right font-medium px-4 py-2">Risk (pips)</th>
                  <th className="text-right font-medium px-4 py-2">Risk ($)</th>
                  <th className="text-right font-medium px-4 py-2">R:R</th>
                </tr>
              </thead>
              <tbody>
                {openPositions.map((t) => {
                  const pipV = t.symbol.includes('JPY') ? 0.01 : 0.0001;
                  const riskPips = Math.abs(t.entry_price - t.stop_loss) / pipV;
                  const riskUsd = riskPips * t.lot_size * (t.symbol.includes('JPY') ? 9 : 10);
                  const rewardPips = Math.abs(t.take_profit - t.entry_price) / pipV;
                  const rr = riskPips > 0 ? rewardPips / riskPips : 0;
                  return (
                    <tr key={t.id} className="border-b border-ink-700/20 hover:bg-ink-800/30">
                      <td className="px-4 py-2.5 font-medium text-ink-100">{t.symbol}</td>
                      <td className="px-4 py-2.5"><DirectionBadge direction={t.direction} /></td>
                      <td className="px-4 py-2.5 text-right font-mono text-ink-300">{t.lot_size.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-ink-300">{t.entry_price.toFixed(t.symbol.includes('JPY') ? 2 : 4)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-bear-400">{t.stop_loss.toFixed(t.symbol.includes('JPY') ? 2 : 4)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-ink-300">{riskPips.toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-bear-400">${riskUsd.toFixed(2)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-semibold ${rr >= 2 ? 'text-bull-400' : 'text-gold-400'}`}>1:{rr.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function MetricRow({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-ink-700/20 last:border-0">
      <span className="text-sm text-ink-300">{label}</span>
      <span className={`text-sm font-mono font-semibold ${good ? 'text-bull-400' : 'text-gold-400'}`}>{value}</span>
    </div>
  );
}
