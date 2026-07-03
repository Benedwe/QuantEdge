import { supabase, supabaseReady } from './supabase';
import type { BotSettings, Signal, Trade } from './types';
import { generateSeedTrades } from './seed';
import type { BrokerConnection } from './brokers';

export const DEFAULT_SETTINGS: BotSettings = {
  id: 1,
  account_balance: 10000,
  risk_per_trade: 1.0,
  max_daily_drawdown: 10.0,
  min_confidence: 80.0,
  max_open_positions: 5,
  trading_mode: 'MANUAL',
  broker: 'OANDA',
  telegram_enabled: false,
  email_enabled: true,
  push_enabled: false,
  capital_preservation: false,
  updated_at: new Date().toISOString(),
};

export async function loadSettings(): Promise<BotSettings> {
  if (!supabaseReady) return DEFAULT_SETTINGS;
  const { data, error } = await supabase
    .from('bot_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) return DEFAULT_SETTINGS;
  return data as BotSettings;
}

export async function saveSettings(s: BotSettings): Promise<void> {
  if (!supabaseReady) return;
  await supabase.from('bot_settings').upsert({
    ...s,
    updated_at: new Date().toISOString(),
  });
}

export async function loadTrades(): Promise<Trade[]> {
  if (!supabaseReady) return generateSeedTrades(12);
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('opened_at', { ascending: false });
  if (error || !data || data.length === 0) {
    const seed = generateSeedTrades(12);
    await supabase.from('trades').insert(seed);
    return seed;
  }
  return data as Trade[];
}

export async function saveTrade(t: Trade): Promise<void> {
  if (!supabaseReady) return;
  await supabase.from('trades').upsert(t);
}

export async function updateTrade(id: string, patch: Partial<Trade>): Promise<void> {
  if (!supabaseReady) return;
  await supabase.from('trades').update(patch).eq('id', id);
}

export async function loadSignals(): Promise<Signal[]> {
  if (!supabaseReady) return [];
  const { data } = await supabase
    .from('signals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as Signal[];
}

export async function saveSignal(s: Signal): Promise<void> {
  if (!supabaseReady) return;
  await supabase.from('signals').insert(s);
}

export async function updateSignalStatus(id: string, status: Signal['status']): Promise<void> {
  if (!supabaseReady) return;
  await supabase.from('signals').update({ status }).eq('id', id);
}

export async function fetchBrokerConnections(): Promise<BrokerConnection[]> {
  if (!supabaseReady) return [];
  const { data } = await supabase
    .from('broker_connections')
    .select('*')
    .order('created_at', { ascending: true });
  return (data ?? []) as BrokerConnection[];
}

export async function saveBrokerConnection(conn: BrokerConnection): Promise<void> {
  if (!supabaseReady) return;
  await supabase.from('broker_connections').upsert(conn);
}

export async function deleteBrokerConnection(id: string): Promise<void> {
  if (!supabaseReady) return;
  await supabase.from('broker_connections').delete().eq('id', id);
}
