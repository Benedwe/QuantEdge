import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Bell,
  Server,
  Save,
  CheckCircle2,
  Send,
  Mail,
  Smartphone,
  RefreshCw,
  ExternalLink,
  Plus,
  Trash2,
  Link2,
  X,
  Lock,
  Zap,
} from 'lucide-react';
import type { BotSettings, TradingMode } from '../lib/types';
import { saveSettings } from '../lib/persistence';
import {
  fetchBrokerConnections,
  saveBrokerConnection,
  deleteBrokerConnection,
} from '../lib/persistence';
import { BROKERS, type BrokerConfig, type BrokerConnection } from '../lib/brokers';
import { validateOandaConnection } from '../lib/broker-api';
import { Card, CardHeader, Toggle } from '../components/ui';

interface Props {
  settings: BotSettings;
  onSave: (s: BotSettings) => void;
}

const BROKER_DISPLAYS = ['OANDA', 'MetaTrader 5', 'IC Markets', 'Exness', 'FXCM'];

export function SettingsView({ settings, onSave }: Props) {
  const [form, setForm] = useState<BotSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<BrokerConfig | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchBrokerConnections().then(setConnections);
  }, []);

  const update = <K extends keyof BotSettings>(key: K, value: BotSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveSettings(form);
    onSave(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const openConnectModal = (broker: BrokerConfig) => {
    setSelectedBroker(broker);
    setCredentials({});
    setShowConnectModal(true);
  };

  const handleConnect = async () => {
    if (!selectedBroker) return;
    setConnecting(true);

    try {
      if (selectedBroker.id === 'OANDA') {
        await validateOandaConnection({
          api_key: credentials.api_key,
          account_id: credentials.account_id,
          environment: credentials.environment,
        });
      }

      const conn: BrokerConnection = {
        id: crypto.randomUUID(),
        broker: selectedBroker.id,
        status: 'CONNECTED',
        credentials,
        account_id: credentials.account_id || credentials.login || null,
        balance: form.account_balance,
        leverage: '1:100',
        server: credentials.server || (credentials.environment === 'Practice' || credentials.environment === 'Demo' ? 'Demo' : 'Live'),
        last_sync: new Date().toISOString(),
        error: null,
        created_at: new Date().toISOString(),
      };
      await saveBrokerConnection(conn);
      setConnections((prev) => [...prev.filter((c) => c.broker !== conn.broker), conn]);
      setShowConnectModal(false);
      setSelectedBroker(null);
      setCredentials({});
    } catch (error) {
      setConnections((prev) => [
        ...prev.filter((c) => c.broker !== selectedBroker.id),
        {
          id: crypto.randomUUID(),
          broker: selectedBroker.id,
          status: 'ERROR',
          credentials,
          account_id: credentials.account_id || credentials.login || null,
          balance: form.account_balance,
          leverage: '1:100',
          server: credentials.server || (credentials.environment === 'Practice' || credentials.environment === 'Demo' ? 'Demo' : 'Live'),
          last_sync: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Broker connection failed.',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    await deleteBrokerConnection(id);
    setConnections((prev) => prev.filter((c) => c.id !== id));
  };

  const connectedBrokers = new Set(connections.map((c) => c.broker));

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Trading Mode */}
      <Card>
        <CardHeader title="Trading Configuration" subtitle="Execution mode and broker" action={<SettingsIcon className="w-4 h-4 text-accent-400" />} />
        <div className="p-5 space-y-5">
          <div>
            <label className="label">Trading Mode</label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {(['MANUAL', 'SEMIAUTO', 'AUTO'] as TradingMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => update('trading_mode', mode)}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    form.trading_mode === mode
                      ? 'bg-accent-500/15 border-accent-500/30 text-accent-400'
                      : 'bg-ink-900/40 border-ink-700/40 text-ink-300 hover:border-ink-600'
                  }`}
                >
                  <div className="font-semibold">{mode === 'SEMIAUTO' ? 'SEMI-AUTO' : mode}</div>
                  <div className="text-xs text-ink-400 mt-1 font-normal">
                    {mode === 'MANUAL' && 'Approve every trade'}
                    {mode === 'SEMIAUTO' && 'Auto-execute above threshold'}
                    {mode === 'AUTO' && 'Fully automated'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Default Broker</label>
              <select value={form.broker} onChange={(e) => update('broker', e.target.value)} className="input mt-1">
                {BROKER_DISPLAYS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Account Balance ($)</label>
              <input
                type="number"
                value={form.account_balance}
                onChange={(e) => update('account_balance', parseFloat(e.target.value) || 0)}
                className="input mt-1 font-mono"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Broker Integrations */}
      <Card>
        <CardHeader
          title="Broker Integrations"
          subtitle="Link to live forex trading platforms"
          action={<Link2 className="w-4 h-4 text-accent-400" />}
        />
        <div className="p-5 space-y-4">
          {/* Connected brokers */}
          {connections.length > 0 && (
            <div className="space-y-3">
              {connections.map((conn) => {
                const broker = BROKERS.find((b) => b.id === conn.broker);
                if (!broker) return null;
                return (
                  <div key={conn.id} className="flex items-center justify-between p-4 rounded-lg bg-ink-900/40 border border-ink-700/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm" style={{ backgroundColor: `${broker.color}20`, color: broker.color }}>
                        {broker.display.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-ink-100">{broker.display}</p>
                          <span className="flex items-center gap-1 text-xs text-bull-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-bull-400 animate-pulse" />
                            Connected
                          </span>
                        </div>
                        <p className="text-xs text-ink-400 mt-0.5">
                          {conn.account_id && <span className="font-mono">Acct: {conn.account_id}</span>}
                          {conn.server && <span className="ml-2">Server: {conn.server}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={broker.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-ink-300 hover:text-accent-400 hover:bg-ink-800/50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Platform
                      </a>
                      <a
                        href={broker.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-ink-300 hover:text-accent-400 hover:bg-ink-800/50 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> API Docs
                      </a>
                      <button
                        onClick={() => handleDisconnect(conn.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-ink-300 hover:text-bear-400 hover:bg-bear-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Disconnect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Available brokers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BROKERS.filter((b) => !connectedBrokers.has(b.id)).map((broker) => (
              <div key={broker.id} className="p-4 rounded-lg bg-ink-900/30 border border-ink-700/30 hover:border-ink-600 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs" style={{ backgroundColor: `${broker.color}20`, color: broker.color }}>
                      {broker.display.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink-100">{broker.display}</p>
                      <p className="text-xs text-ink-400">{broker.regulation}</p>
                    </div>
                  </div>
                  <a
                    href={broker.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-400 hover:text-accent-400 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-xs text-ink-400 mb-3 leading-relaxed">{broker.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-500">Min deposit: {broker.minDeposit}</span>
                  <button
                    onClick={() => openConnectModal(broker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-accent-500/15 text-accent-400 hover:bg-accent-500/25 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Connect
                  </button>
                </div>
              </div>
            ))}
          </div>

          {connections.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-ink-400 pt-2">
              <Zap className="w-3.5 h-3.5 text-gold-400" />
              <span>Connected brokers can execute trades and sync account data in real time.</span>
            </div>
          )}
        </div>
      </Card>

      {/* Risk Management */}
      <Card>
        <CardHeader title="Risk Management" subtitle="Capital protection rules" action={<Shield className="w-4 h-4 text-gold-400" />} />
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Risk per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={form.risk_per_trade}
                onChange={(e) => update('risk_per_trade', parseFloat(e.target.value) || 0)}
                className="input mt-1 font-mono"
              />
              <p className="text-xs text-ink-400 mt-1">Recommended: 1-2% per trade</p>
            </div>
            <div>
              <label className="label">Max Daily Drawdown (%)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="25"
                value={form.max_daily_drawdown}
                onChange={(e) => update('max_daily_drawdown', parseFloat(e.target.value) || 0)}
                className="input mt-1 font-mono"
              />
              <p className="text-xs text-ink-400 mt-1">Auto-stops trading at this loss</p>
            </div>
            <div>
              <label className="label">Min Confidence Threshold (%)</label>
              <input
                type="number"
                step="1"
                min="50"
                max="99"
                value={form.min_confidence}
                onChange={(e) => update('min_confidence', parseFloat(e.target.value) || 0)}
                className="input mt-1 font-mono"
              />
              <p className="text-xs text-ink-400 mt-1">Only trade signals above this score</p>
            </div>
            <div>
              <label className="label">Max Open Positions</label>
              <input
                type="number"
                min="1"
                max="20"
                value={form.max_open_positions}
                onChange={(e) => update('max_open_positions', parseInt(e.target.value) || 1)}
                className="input mt-1 font-mono"
              />
              <p className="text-xs text-ink-400 mt-1">Concurrent position limit</p>
            </div>
          </div>

          <div className="bg-ink-900/40 rounded-lg p-4 border border-ink-700/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className={`w-5 h-5 ${form.capital_preservation ? 'text-bull-400' : 'text-ink-400'}`} />
                <div>
                  <p className="text-sm font-medium text-ink-100">Capital Preservation Mode</p>
                  <p className="text-xs text-ink-400">Reduces position sizes by 50% and raises confidence threshold to 90%</p>
                </div>
              </div>
              <Toggle checked={form.capital_preservation} onChange={(v) => update('capital_preservation', v)} />
            </div>
          </div>
        </div>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader title="Alerts & Notifications" subtitle="Trade and risk alerts" action={<Bell className="w-4 h-4 text-gold-400" />} />
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-3 bg-ink-900/40 rounded-lg border border-ink-700/40">
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5 text-accent-400" />
              <div>
                <p className="text-sm font-medium text-ink-100">Telegram Alerts</p>
                <p className="text-xs text-ink-400">Real-time trade signals and execution alerts</p>
              </div>
            </div>
            <Toggle checked={form.telegram_enabled} onChange={(v) => update('telegram_enabled', v)} />
          </div>
          <div className="flex items-center justify-between p-3 bg-ink-900/40 rounded-lg border border-ink-700/40">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-accent-400" />
              <div>
                <p className="text-sm font-medium text-ink-100">Email Alerts</p>
                <p className="text-xs text-ink-400">Daily reports and critical risk warnings</p>
              </div>
            </div>
            <Toggle checked={form.email_enabled} onChange={(v) => update('email_enabled', v)} />
          </div>
          <div className="flex items-center justify-between p-3 bg-ink-900/40 rounded-lg border border-ink-700/40">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-accent-400" />
              <div>
                <p className="text-sm font-medium text-ink-100">Push Notifications</p>
                <p className="text-xs text-ink-400">Mobile alerts for high-conviction signals</p>
              </div>
            </div>
            <Toggle checked={form.push_enabled} onChange={(v) => update('push_enabled', v)} />
          </div>
        </div>
      </Card>

      {/* Save bar */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-bull-400 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" /> Settings saved
          </span>
        )}
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Connect Modal */}
      {showConnectModal && selectedBroker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowConnectModal(false)}>
          <div className="w-full max-w-md mx-4 rounded-xl bg-ink-900 border border-ink-700/60 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs" style={{ backgroundColor: `${selectedBroker.color}20`, color: selectedBroker.color }}>
                  {selectedBroker.display.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink-100">Connect to {selectedBroker.display}</h3>
                  <p className="text-xs text-ink-400">{selectedBroker.description}</p>
                </div>
              </div>
              <button onClick={() => setShowConnectModal(false)} className="text-ink-400 hover:text-ink-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-500/10 border border-accent-500/20">
                <Lock className="w-4 h-4 text-accent-400 flex-shrink-0" />
                <p className="text-xs text-ink-300">
                  Credentials are encrypted and stored securely. You can disconnect at any time.
                </p>
              </div>

              {selectedBroker.fields.map((field) => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      value={credentials[field.key] || ''}
                      onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="input mt-1"
                    >
                      <option value="">{field.placeholder}</option>
                      {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={credentials[field.key] || ''}
                      onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="input mt-1 font-mono"
                    />
                  )}
                </div>
              ))}

              <div className="flex items-center gap-2 text-xs text-ink-400">
                <span>Need an API key?</span>
                <a href={selectedBroker.docsUrl} target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:text-accent-300 inline-flex items-center gap-1">
                  View API docs <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button onClick={() => setShowConnectModal(false)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-ink-800 text-ink-200 hover:bg-ink-700 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={connecting || !selectedBroker.fields.every((f) => !f.required || credentials[f.key])}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-accent-500 text-white hover:bg-accent-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {connecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  {connecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
