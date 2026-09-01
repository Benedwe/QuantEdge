export type BrokerDirection = 'BUY' | 'SELL';

export interface OandaCredentials {
  api_key: string;
  account_id: string;
  environment: 'Practice' | 'Trade' | string;
}

export interface BrokerOrderInput {
  symbol: string;
  direction: BrokerDirection;
  lotSize: number;
  stopLoss?: number;
  takeProfit?: number;
  apiKey?: string;
  accountId?: string;
  environment?: string;
}

export interface BrokerExecutionResult {
  ok: boolean;
  broker: 'OANDA';
  orderId?: string;
  message: string;
  details?: Record<string, unknown>;
}

export function normalizeBrokerSymbol(symbol: string): string {
  return symbol.trim().replace(/\s+/g, '').replace('/', '_').replace(/-/g, '_').toUpperCase();
}

export function symbolToInstrument(symbol: string): string {
  return normalizeBrokerSymbol(symbol);
}

export function normalizePairSymbol(symbol: string): string {
  return symbol
    .trim()
    .replace(/_/g, '/')
    .replace(/\s+/g, '')
    .toUpperCase();
}

export function buildOandaMarketOrderRequest({
  symbol,
  direction,
  lotSize,
  stopLoss,
  takeProfit,
}: BrokerOrderInput): {
  order: {
    type: 'MARKET';
    instrument: string;
    units: string;
    side: BrokerDirection;
  };
  takeProfitOnFill?: { price: string; timeInForce: 'GTC' };
  stopLossOnFill?: { price: string; timeInForce: 'GTC' };
} {
  const instrument = normalizeBrokerSymbol(symbol);
  const units = String(Math.round(Math.max(100, lotSize * 100000)));

  return {
    order: {
      type: 'MARKET',
      instrument,
      units,
      side: direction,
    },
    ...(takeProfit !== undefined
      ? { takeProfitOnFill: { price: takeProfit.toFixed(5), timeInForce: 'GTC' } }
      : {}),
    ...(stopLoss !== undefined
      ? { stopLossOnFill: { price: stopLoss.toFixed(5), timeInForce: 'GTC' } }
      : {}),
  };
}

export function buildOandaOrderPayload(
  direction: 'BUY' | 'SELL' | BrokerDirection,
  symbol: string,
  lotSize: number,
  accountBalance: number,
): ReturnType<typeof buildOandaMarketOrderRequest> {
  const side = direction.toUpperCase() as BrokerDirection;
  const units = String(Math.max(100, Math.round((lotSize * 100000) / Math.max(1, accountBalance / 10000))));

  return {
    order: {
      type: 'MARKET',
      instrument: normalizeBrokerSymbol(symbol),
      units,
      side,
    },
  };
}

export async function validateOandaConnection(credentials: Partial<OandaCredentials>): Promise<void> {
  const apiKey = credentials.api_key?.trim();
  const accountId = credentials.account_id?.trim();
  const environment = credentials.environment ?? 'Practice';

  if (!apiKey || !accountId) {
    throw new Error('Missing OANDA API token or account ID.');
  }

  const baseUrl = environment === 'Trade' ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com';
  const response = await fetch(`${baseUrl}/v3/accounts/${encodeURIComponent(accountId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OANDA validation failed: ${response.status} ${message}`);
  }
}

export async function submitOandaOrder(order: BrokerOrderInput): Promise<BrokerExecutionResult> {
  const apiKey = order.apiKey?.trim();
  const accountId = order.accountId?.trim();
  const environment = order.environment ?? 'Practice';

  if (!apiKey || !accountId) {
    return {
      ok: false,
      broker: 'OANDA',
      message: 'Missing OANDA API credentials for execution.',
    };
  }

  const baseUrl = environment === 'Trade' ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com';
  const payload = buildOandaMarketOrderRequest(order);

  const response = await fetch(`${baseUrl}/v3/accounts/${encodeURIComponent(accountId)}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const details = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      broker: 'OANDA',
      message: details?.errorMessage ?? details?.message ?? 'OANDA order rejected by the broker.',
      details,
    };
  }

  return {
    ok: true,
    broker: 'OANDA',
    orderId: details?.orderCreateTransaction?.id ?? details?.lastTransactionID ?? 'pending',
    message: 'Order submitted successfully.',
    details,
  };
}

export function getBrokerApiBaseUrl(environment: string | undefined): string {
  return environment === 'Trade' ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com';
}
