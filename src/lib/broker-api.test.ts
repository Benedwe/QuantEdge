import { describe, it, expect } from 'vitest';
import {
  buildOandaMarketOrderRequest,
  buildOandaOrderPayload,
  normalizeBrokerSymbol,
  normalizePairSymbol,
  symbolToInstrument,
  parseOandaAccountSummary,
  parseOandaOrderStatus,
} from './broker-api';

describe('broker api integration', () => {
  it('normalizes a forex symbol into the broker instrument format', () => {
    expect(normalizeBrokerSymbol('EUR/USD')).toBe('EUR_USD');
    expect(normalizeBrokerSymbol('USD/JPY')).toBe('USD_JPY');
    expect(symbolToInstrument('EUR/USD')).toBe('EUR_USD');
    expect(normalizePairSymbol('EUR_USD')).toBe('EUR/USD');
  });

  it('builds a valid OANDA market order payload', () => {
    const order = buildOandaMarketOrderRequest({
      symbol: 'EUR/USD',
      direction: 'BUY',
      lotSize: 1.5,
      stopLoss: 1.085,
      takeProfit: 1.095,
    });

    expect(order.order.type).toBe('MARKET');
    expect(order.order.instrument).toBe('EUR_USD');
    expect(order.order.side).toBe('BUY');
    expect(order.order.units).toBe('150000');
    expect(order.takeProfitOnFill?.price).toBe('1.09500');
    expect(order.stopLossOnFill?.price).toBe('1.08500');
  });

  it('supports the legacy payload helper shape', () => {
    const payload = buildOandaOrderPayload('BUY', 'EUR/USD', 1.5, 10000);

    expect(payload.order.type).toBe('MARKET');
    expect(payload.order.instrument).toBe('EUR_USD');
    expect(payload.order.side).toBe('BUY');
    expect(Number(payload.order.units)).toBeGreaterThan(0);
  });

  it('parses live OANDA account summaries and order statuses', () => {
    const summary = parseOandaAccountSummary({
      account: {
        id: '123',
        balance: '25000.00',
        currency: 'USD',
      },
    });

    expect(summary.accountId).toBe('123');
    expect(summary.balance).toBe(25000);
    expect(summary.currency).toBe('USD');

    const order = parseOandaOrderStatus({
      order: {
        id: 'abc',
        instrument: 'EUR_USD',
        state: 'FILLED',
        side: 'buy',
        price: '1.1012',
        units: '1000',
      },
    });

    expect(order.orderId).toBe('abc');
    expect(order.status).toBe('FILLED');
    expect(order.symbol).toBe('EUR/USD');
    expect(order.side).toBe('BUY');
  });
});
