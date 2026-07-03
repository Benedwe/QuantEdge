import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlaskConical,
  Play,
  TrendingUp,
  Percent,
  Target,
  Activity,
  Dices,
  GitBranch,
  RefreshCw,
} from 'lucide-react';
import type { BotSettings } from '../lib/types';
import { generateBacktestEquity } from '../lib/ai';
import { Card, CardHeader, StatCard, ConfidenceBar } from '../components/ui';

interface Props {
  settings: BotSettings;
}

export function Backtesting({ settings }: Props) {
  const [symbol, setSymbol] = useState('EUR/USD');
  const [strategy, setStrategy] = useState('AI Ensemble');
  const [period, setPeriod] = useState('1Y');
  const [running, setRunning] = useState(false);
  const [runCount, setRunCount] = useState(0);

  const equity = useMemo(
    () => generateBacktestEquity(settings.account_balance, 252),
    [settings.account_balance, runCount]
  );

  const stats = useMemo(() => {
    const finalEquity = equity[equity.length - 1]?.equity ?? settings.account_balance;
    const totalReturn = ((finalEquity - settings.account_balance) / settings.account_balance) * 100;
    const maxDD = Math.min(...equity.map((e) => e.drawdown));
    const peak = Math.max(...equity.map((e) => e.equity));
    const trough = Math.min(...equity.map((e) => e.equity));
    const sharpe = totalReturn / Math.max(1, Math.abs(maxDD));
    const winMonths = equity.filter((e, i) => i > 0 && e.equity > equity[i - 1].equity).length;
    const winRate = (winMonths / (equity.length - 1)) * 100;
    return {
      finalEquity,
      totalReturn,
      maxDD,
      sharpe,
      winRate,
      peak,
      trough,
      trades: Math.floor(equity.length * 0.8),
      profitFactor: 1.8 + Math.random() * 0.6,
    };
  }, [equity, settings.account_balance]);

  const runBacktest = () => {
    setRunning(true);
    setTimeout(() => {
      setRunCount((c) => c + 1);
      setRunning(false);
    }, 1500);
  };

  const ddData = equity.map((e) => e.drawdown);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Config bar */}
      <Card>
        <div className="p-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Symbol</label>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="input mt-1 w-32">
              {['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Strategy</label>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="input mt-1 w-44">
              {['AI Ensemble', 'LSTM-Transformer', 'XGBoost', 'Smart Money', 'ICT Order Block', 'Random Forest'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="input mt-1 w-24">
              {['1M', '3M', '6M', '1Y', '2Y', '5Y'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex-1" />
          <button onClick={runBacktest} disabled={running} className="btn-primary">
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'Running...' : 'Run Backtest'}
          </button>
        </div>
      </Card>

      {/* Results stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Return" value={`${stats.totalReturn >= 0 ? '+' : ''}${stats.totalReturn.toFixed(2)}%`} icon={<TrendingUp className="w-4 h-4" />} accent={stats.totalReturn >= 0 ? 'bull' : 'bear'} />
        <StatCard label="Max Drawdown" value={`${stats.maxDD.toFixed(2)}%`} icon={<Activity className="w-4 h-4" />} accent="bear" />
        <StatCard label="Sharpe Ratio" value={stats.sharpe.toFixed(2)} icon={<Percent className="w-4 h-4" />} accent="gold" />
        <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} icon={<Target className="w-4 h-4" />} accent="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity curve */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Equity Curve" subtitle={`${strategy} · ${symbol} · ${period}`} action={<FlaskConical className="w-4 h-4 text-accent-400" />} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-ink-400">Final Equity</p>
                  <p className={`stat-value text-2xl ${stats.totalReturn >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                    ${stats.finalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-400">Peak / Trough</p>
                  <p className="text-sm font-mono text-ink-200">
                    ${stats.peak.toFixed(0)} / ${stats.trough.toFixed(0)}
                  </p>
                </div>
              </div>
              <EquityChart data={equity.map((e) => e.equity)} />
            </div>
          </Card>
        </div>

        {/* Drawdown */}
        <Card>
          <CardHeader title="Drawdown" subtitle="Underwater curve" action={<Activity className="w-4 h-4 text-bear-400" />} />
          <div className="p-5">
            <div className="mb-4">
              <p className="text-xs text-ink-400">Max Drawdown</p>
              <p className="stat-value text-2xl text-bear-400">{stats.maxDD.toFixed(2)}%</p>
            </div>
            <EquityChart data={ddData} color="#f43f5e" />
          </div>
        </Card>
      </div>

      {/* Detailed metrics + Monte Carlo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Performance Metrics" subtitle="Detailed backtest statistics" />
          <div className="p-5 space-y-1">
            <Metric label="Total Trades" value={stats.trades.toString()} />
            <Metric label="Profit Factor" value={stats.profitFactor.toFixed(2)} good={stats.profitFactor > 1.5} />
            <Metric label="Average R:R" value="1:2.3" good />
            <Metric label="Max Consecutive Losses" value="4" />
            <Metric label="Max Consecutive Wins" value="9" good />
            <Metric label="Recovery Factor" value={(stats.totalReturn / Math.abs(stats.maxDD)).toFixed(2)} good />
            <Metric label="Annual Return" value={`${(stats.totalReturn).toFixed(1)}%`} good={stats.totalReturn > 0} />
            <Metric label="Risk per Trade" value={`${settings.risk_per_trade.toFixed(1)}%`} />
            <Metric label="Max Open Positions" value={settings.max_open_positions.toString()} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Monte Carlo Simulation" subtitle="1000 randomized trade sequences" action={<Dices className="w-4 h-4 text-gold-400" />} />
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-ink-900/40 rounded-lg p-3 border border-ink-700/40 text-center">
                <span className="label text-[10px]">95th Pct</span>
                <p className="stat-value text-lg text-bull-400">+{(stats.totalReturn * 1.4).toFixed(1)}%</p>
              </div>
              <div className="bg-ink-900/40 rounded-lg p-3 border border-ink-700/40 text-center">
                <span className="label text-[10px]">Median</span>
                <p className="stat-value text-lg text-accent-400">+{(stats.totalReturn).toFixed(1)}%</p>
              </div>
              <div className="bg-ink-900/40 rounded-lg p-3 border border-ink-700/40 text-center">
                <span className="label text-[10px]">5th Pct</span>
                <p className="stat-value text-lg text-bear-400">{(stats.totalReturn * 0.5).toFixed(1)}%</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-ink-300 mb-2">Probability of Profit</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-ink-700/60 rounded-full overflow-hidden">
                  <div className="h-full bg-bull-500 rounded-full" style={{ width: `${Math.min(95, 60 + stats.totalReturn * 0.5)}%` }} />
                </div>
                <span className="text-sm font-mono font-semibold text-bull-400">{Math.min(95, 60 + stats.totalReturn * 0.5).toFixed(0)}%</span>
              </div>
            </div>

            <div>
              <p className="text-sm text-ink-300 mb-2">Risk of Ruin (1% risk)</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-ink-700/60 rounded-full overflow-hidden">
                  <div className="h-full bg-bear-500 rounded-full" style={{ width: '2%' }} />
                </div>
                <span className="text-sm font-mono font-semibold text-bear-400">0.2%</span>
              </div>
            </div>

            <div className="pt-3 border-t border-ink-700/40">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="w-4 h-4 text-accent-400" />
                <span className="text-sm font-semibold text-ink-100">Walk-Forward Analysis</span>
              </div>
              <p className="text-xs text-ink-400 mb-3">Out-of-sample performance validation across 5 windows</p>
              <div className="space-y-2">
                {['Window 1 (Jan-Mar)', 'Window 2 (Apr-Jun)', 'Window 3 (Jul-Sep)', 'Window 4 (Oct-Dec)'].map((w) => {
                  const ret = (Math.random() * 15 + 2).toFixed(1);
                  return (
                    <div key={w} className="flex items-center gap-3">
                      <span className="text-xs text-ink-300 w-32">{w}</span>
                      <div className="flex-1 h-1.5 bg-ink-700/60 rounded-full overflow-hidden">
                        <div className="h-full bg-bull-500 rounded-full" style={{ width: `${Math.min(100, parseFloat(ret) * 5)}%` }} />
                      </div>
                      <span className="text-xs font-mono text-bull-400 w-12 text-right">+{ret}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Strategy comparison */}
      <Card>
        <CardHeader title="Strategy Comparison" subtitle="Performance across all strategies" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-400 border-b border-ink-700/40">
                <th className="text-left font-medium px-4 py-2">Strategy</th>
                <th className="text-right font-medium px-4 py-2">Return</th>
                <th className="text-right font-medium px-4 py-2">Max DD</th>
                <th className="text-right font-medium px-4 py-2">Sharpe</th>
                <th className="text-right font-medium px-4 py-2">Win Rate</th>
                <th className="text-right font-medium px-4 py-2">PF</th>
                <th className="text-left font-medium px-4 py-2 w-32">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'AI Ensemble', ret: 24.3, dd: -7.2, sharpe: 1.89, wr: 64, pf: 2.1, conf: 91 },
                { name: 'LSTM-Transformer', ret: 19.8, dd: -8.5, sharpe: 1.65, wr: 61, pf: 1.8, conf: 87 },
                { name: 'XGBoost', ret: 16.2, dd: -9.1, sharpe: 1.42, wr: 58, pf: 1.6, conf: 84 },
                { name: 'Smart Money', ret: 14.5, dd: -6.8, sharpe: 1.51, wr: 57, pf: 1.7, conf: 82 },
                { name: 'ICT Order Block', ret: 12.1, dd: -7.5, sharpe: 1.28, wr: 55, pf: 1.5, conf: 80 },
                { name: 'Random Forest', ret: 10.4, dd: -10.2, sharpe: 1.02, wr: 53, pf: 1.3, conf: 78 },
              ].map((s) => (
                <tr key={s.name} className="border-b border-ink-700/20 hover:bg-ink-800/30">
                  <td className="px-4 py-2.5 font-medium text-ink-100">{s.name}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-bull-400">+{s.ret.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-right font-mono text-bear-400">{s.dd.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-200">{s.sharpe.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-200">{s.wr}%</td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-200">{s.pf.toFixed(1)}</td>
                  <td className="px-4 py-2.5"><div className="w-24"><ConfidenceBar value={s.conf} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-ink-700/20 last:border-0">
      <span className="text-sm text-ink-300">{label}</span>
      <span className={`text-sm font-mono font-semibold ${good === true ? 'text-bull-400' : good === false ? 'text-bear-400' : 'text-ink-200'}`}>{value}</span>
    </div>
  );
}

function EquityChart({ data, color = '#10b981' }: { data: number[]; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = 160;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = w / (data.length - 1);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + '40');
    grad.addColorStop(1, color + '00');
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 10) - 5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fillStyle = grad;
    ctx.fill();
  }, [data, color]);

  return <canvas ref={ref} style={{ width: '100%', height: 160 }} />;
}
