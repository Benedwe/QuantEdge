import { useState } from 'react';
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
} from 'lucide-react';
import type { BotSettings, TradingMode } from '../lib/types';
import { saveSettings } from '../lib/persistence';
import { Card, CardHeader, Toggle } from '../components/ui';

interface Props {
  settings: BotSettings;
  onSave: (s: BotSettings) => void;
}

const BROKERS = ['OANDA', 'MetaTrader 5', 'IC Markets', 'Exness', 'FXCM'];

export function SettingsView({ settings, onSave }: Props) {
  const [form, setForm] = useState<BotSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
              <label className="label">Broker</label>
              <select value={form.broker} onChange={(e) => update('broker', e.target.value)} className="input mt-1">
                {BROKERS.map((b) => <option key={b} value={b}>{b}</option>)}
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

      {/* Broker status */}
      <Card>
        <CardHeader title="Broker Connection" subtitle="API integration status" action={<Server className="w-4 h-4 text-bull-400" />} />
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-300">Broker</span>
            <span className="text-sm font-medium text-ink-100">{form.broker}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-300">Connection Status</span>
            <span className="flex items-center gap-1.5 text-sm text-bull-400">
              <span className="w-1.5 h-1.5 rounded-full bg-bull-400 animate-pulse" />
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-300">Latency</span>
            <span className="text-sm font-mono text-ink-200">12ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-300">API Key</span>
            <span className="text-sm font-mono text-ink-400">••••••••••••a3f9</span>
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
    </div>
  );
}
