export type BrokerId = 'OANDA' | 'MT5' | 'IC_MARKETS' | 'EXNESS' | 'FXCM';

export interface BrokerConfig {
  id: BrokerId;
  name: string;
  display: string;
  description: string;
  website: string;
  docsUrl: string;
  apiBaseUrl: string;
  authType: 'bearer' | 'api_key' | 'login';
  fields: BrokerField[];
  features: string[];
  regulation: string;
  minDeposit: string;
  color: string;
}

export interface BrokerField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  placeholder: string;
  required: boolean;
  options?: string[];
}

export interface BrokerConnection {
  id: string;
  broker: BrokerId;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  credentials: Record<string, string>;
  account_id: string | null;
  balance: number | null;
  leverage: string | null;
  server: string | null;
  last_sync: string | null;
  error: string | null;
  created_at: string;
}

export const BROKERS: BrokerConfig[] = [
  {
    id: 'OANDA',
    name: 'OANDA',
    display: 'OANDA',
    description: 'REST API v20 with streaming pricing and trade execution',
    website: 'https://www.oanda.com',
    docsUrl: 'https://developer.oanda.com/rest-live-v20/introduction/',
    apiBaseUrl: 'https://api-fxtrade.oanda.com/v3',
    authType: 'bearer',
    fields: [
      { key: 'api_key', label: 'API Token', type: 'password', placeholder: 'Enter OANDA API token', required: true },
      { key: 'account_id', label: 'Account ID', type: 'text', placeholder: '001-001-123456-001', required: true },
      { key: 'environment', label: 'Environment', type: 'select', placeholder: 'Practice', required: true, options: ['Practice', 'Trade'] },
    ],
    features: ['REST v20 API', 'Streaming Pricing', 'Market & Limit Orders', 'Historical Candles', 'Real-time Account Summary'],
    regulation: 'CFTC, NFA, FCA, ASIC, IIROC',
    minDeposit: '$0',
    color: '#1B365D',
  },
  {
    id: 'MT5',
    name: 'MetaTrader 5',
    display: 'MetaTrader 5',
    description: 'MetaTrader 5 terminal via WebAPI for automated trading',
    website: 'https://www.metatrader5.com',
    docsUrl: 'https://www.metatrader5.com/en/metaeditor/help/integration/webapi',
    apiBaseUrl: 'https://trade.metaquotes.net:443',
    authType: 'login',
    fields: [
      { key: 'login', label: 'MT5 Login', type: 'text', placeholder: '12345678', required: true },
      { key: 'password', label: 'Password', type: 'password', placeholder: 'Trading password', required: true },
      { key: 'server', label: 'Server', type: 'text', placeholder: 'ICMarketsSC-Demo', required: true },
    ],
    features: ['WebAPI Integration', 'MQL5 Expert Advisors', 'Market & Pending Orders', 'Real-time Ticks', 'Position Management'],
    regulation: 'Multi-broker platform',
    minDeposit: 'Varies by broker',
    color: '#FF6B00',
  },
  {
    id: 'IC_MARKETS',
    name: 'IC Markets',
    display: 'IC Markets',
    description: 'Raw spreads via cTrader Open API and MT5 bridge',
    website: 'https://www.icmarkets.com',
    docsUrl: 'https://openapi.ctrader.com/',
    apiBaseUrl: 'https://openapi.ctrader.com',
    authType: 'api_key',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'ctrader client id', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'ctrader client secret', required: true },
      { key: 'account_id', label: 'Account ID', type: 'text', placeholder: 'ctrader account id', required: true },
    ],
    features: ['cTrader Open API', 'Raw Spreads from 0.0', 'MT5 Bridge Support', 'FIX Protocol', 'Sub-ms Execution'],
    regulation: 'ASIC, CySEC, SCB',
    minDeposit: '$200',
    color: '#00A4E4',
  },
  {
    id: 'EXNESS',
    name: 'Exness',
    display: 'Exness',
    description: 'Exness Open API for account data and trade execution',
    website: 'https://www.exness.com',
    docsUrl: 'https://api-docs.exness.com/',
    apiBaseUrl: 'https://api.exness.com',
    authType: 'bearer',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Exness API key', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'Exness API secret', required: true },
      { key: 'account_type', label: 'Account Type', type: 'select', placeholder: 'Standard', required: true, options: ['Standard', 'Pro', 'Raw Spread', 'Zero'] },
    ],
    features: ['Open API v2', 'Instant Withdrawals', 'MT4 & MT5 Support', 'Real-time Equity', 'Multi-currency'],
    regulation: 'FCA, CySEC, FSA',
    minDeposit: '$10',
    color: '#00B14F',
  },
  {
    id: 'FXCM',
    name: 'FXCM',
    display: 'FXCM',
    description: 'Trading Station API with REST and FIX protocol support',
    website: 'https://www.fxcm.com',
    docsUrl: 'https://api-docs.fxcm.com/',
    apiBaseUrl: 'https://api-demo.fxcm.com:443',
    authType: 'bearer',
    fields: [
      { key: 'api_token', label: 'API Token', type: 'password', placeholder: 'FXCM API token', required: true },
      { key: 'account_id', label: 'Account ID', type: 'text', placeholder: 'FXCM account id', required: true },
      { key: 'environment', label: 'Environment', type: 'select', placeholder: 'Demo', required: true, options: ['Demo', 'Real'] },
    ],
    features: ['Trading Station API', 'REST & FIX 4.4', 'Real-time Pricing', 'Order Management', 'Historical Data'],
    regulation: 'FCA, ASIC, FSCA',
    minDeposit: '$50',
    color: '#0A6B3B',
  },
];

export function getBroker(id: string): BrokerConfig | undefined {
  return BROKERS.find((b) => b.id === id);
}

export function getBrokerByDisplay(display: string): BrokerConfig | undefined {
  return BROKERS.find((b) => b.display === display || b.name === display);
}
