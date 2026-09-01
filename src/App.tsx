import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Brain,
  Shield,
  FlaskConical,
  Settings,
  Activity,
  Wifi,
} from 'lucide-react';
import type { BotSettings, Trade, ViewKey } from './lib/types';
import { PAIRS, tickAll } from './lib/market';
import { fetchBrokerConnections, loadSettings, loadTrades, saveBrokerConnection } from './lib/persistence';
import { fetchOandaAccountSummary } from './lib/broker-api';
import { Dashboard } from './views/Dashboard';
import { Signals } from './views/Signals';
import { Risk } from './views/Risk';
import { Backtesting } from './views/Backtesting';
import { SettingsView } from './views/Settings';

const NAV: { key: ViewKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'signals', label: 'AI Signals', icon: Brain },
  { key: 'risk', label: 'Risk Management', icon: Shield },
  { key: 'backtesting', label: 'Backtesting', icon: FlaskConical },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [view, setView] = useState<ViewKey>('dashboard');
  const [pairs, setPairs] = useState(PAIRS);
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, t] = await Promise.all([loadSettings(), loadTrades()]);
      setSettings(s);
      setTrades(t);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPairs([...tickAll()]);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncBrokerState = async () => {
      const connections = await fetchBrokerConnections();
      if (cancelled) return;

      for (const connection of connections) {
        if (connection.broker !== 'OANDA' || connection.status !== 'CONNECTED') continue;

        try {
          const summary = await fetchOandaAccountSummary({
            api_key: connection.credentials.api_key,
            account_id: connection.account_id ?? undefined,
            environment: connection.credentials.environment,
          });

          if (cancelled) return;

          setSettings((prev) => prev ? { ...prev, account_balance: summary.balance, updated_at: new Date().toISOString() } : prev);

          const refreshed = {
            ...connection,
            balance: summary.balance,
            status: 'CONNECTED' as const,
            last_sync: summary.lastUpdated,
            error: null,
          };

          await saveBrokerConnection(refreshed);
        } catch (error) {
          console.warn('Broker sync failed:', error);
        }
      }
    };

    void syncBrokerState();
    const interval = setInterval(() => {
      void syncBrokerState();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const openPositions = trades.filter((t) => t.status === 'OPEN');
  const closedTrades = trades.filter((t) => t.status === 'CLOSED');
  const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const openPnl = openPositions.reduce((sum, t) => sum + (t.pnl || 0), 0);

  const refreshTrades = async () => {
    const t = await loadTrades();
    setTrades(t);
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 text-accent-400 animate-pulse" />
          <p className="text-sm text-ink-400">Initializing trading engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-ink-950">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-ink-900/80 border-r border-ink-700/40 flex flex-col">
        <div className="px-5 py-5 border-b border-ink-700/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-500 to-bull-500 flex items-center justify-center shadow-lg shadow-accent-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-ink-100 leading-tight">QuantEdge</h1>
              <p className="text-[10px] text-ink-400 uppercase tracking-wider">AI Forex Bot</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setView(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-accent-500/15 text-accent-400 border border-accent-500/20'
                    : 'text-ink-300 hover:text-ink-100 hover:bg-ink-800/50 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-ink-700/40 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-400">Connection</span>
            <span className="flex items-center gap-1.5 text-bull-400">
              <span className="w-1.5 h-1.5 rounded-full bg-bull-400 animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-400">Broker</span>
            <span className="text-ink-200 font-medium">{settings.broker}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-400">Mode</span>
            <span className={`font-medium ${settings.trading_mode === 'AUTO' ? 'text-bull-400' : settings.trading_mode === 'SEMIAUTO' ? 'text-gold-400' : 'text-ink-200'}`}>
              {settings.trading_mode}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-400">Open Positions</span>
            <span className="text-ink-200 font-mono">{openPositions.length}/{settings.max_open_positions}</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 shrink-0 bg-ink-900/60 border-b border-ink-700/40 flex items-center justify-between px-6 backdrop-blur-sm">
          <div>
            <h2 className="text-base font-semibold text-ink-100">
              {NAV.find((n) => n.key === view)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Wifi className="w-4 h-4 text-bull-400" />
              <span className="text-ink-300">Streaming</span>
            </div>
            <div className="text-sm">
              <span className="text-ink-400">Balance: </span>
              <span className="font-mono font-semibold text-ink-100">
                ${settings.account_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-ink-400">P&L: </span>
              <span className={`font-mono font-semibold ${totalPnl + openPnl >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                {(totalPnl + openPnl >= 0 ? '+' : '')}{(totalPnl + openPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {view === 'dashboard' && (
            <Dashboard
              pairs={pairs}
              trades={trades}
              settings={settings}
              onTradesChange={(updater) => setTrades(updater)}
              refreshTrades={refreshTrades}
            />
          )}
          {view === 'signals' && (
            <Signals settings={settings} onTradeExecuted={refreshTrades} />
          )}
          {view === 'risk' && <Risk trades={trades} settings={settings} pairs={pairs} />}
          {view === 'backtesting' && <Backtesting settings={settings} />}
          {view === 'settings' && (
            <SettingsView settings={settings} onSave={(s) => setSettings(s)} />
          )}
        </main>
      </div>
    </div>
  );
}
