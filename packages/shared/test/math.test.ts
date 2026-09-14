import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateExpenseShares, simplifyDebts, convertCurrency } from '../src/index.ts';
import type { Expense } from '../src/types/index.ts';

test('calculateExpenseShares: splits items and handles tax and service charge', () => {
  const mockExpense: Expense = {
    id: 'exp_1',
    trip_id: 'trip_1',
    title: 'Dinner at Shibuya Izakaya',
    date: '2026-09-14T12:00:00Z',
    amount: 100,
    currency: 'USD',
    exchange_rate: 1,
    base_currency_amount: 100,
    category: 'food',
    paid_by_user_id: 'alice',
    include_service_charge: true,
    service_charge_percent: 10,
    include_tax: true,
    tax_percent: 10,
    split_tax_equally: false,
    items: [
      { id: 'item_1', name: 'Ramen', amount: 40, quantity: 1 },
      { id: 'item_2', name: 'Sushi Platter', amount: 60, quantity: 1 },
    ],
    assignments: [
      { item_id: 'item_1', user_id: 'bob', percentage: 1 },
      { item_id: 'item_2', user_id: 'charlie', percentage: 1 },
    ],
    created_at: '2026-09-14T12:00:00Z',
    updated_at: '2026-09-14T12:00:00Z',
  };

  const shares = calculateExpenseShares(mockExpense);
  assert.equal(shares.length, 2);

  const bobShare = shares.find(s => s.user_id === 'bob');
  const charlieShare = shares.find(s => s.user_id === 'charlie');

  assert.ok(bobShare);
  assert.ok(charlieShare);

  assert.equal(bobShare.subtotal, 40);
  assert.equal(bobShare.service_charge, 4);
  assert.equal(bobShare.tax, 4);
  assert.equal(bobShare.total, 48);

  assert.equal(charlieShare.subtotal, 60);
  assert.equal(charlieShare.service_charge, 6);
  assert.equal(charlieShare.tax, 6);
  assert.equal(charlieShare.total, 72);
});

test('simplifyDebts: resolves circular / transitive debts to minimal transfers', () => {
  const balances = [
    { user_id: 'alice', total_paid: 30, total_owed: 0, net_balance: 30 },
    { user_id: 'bob', total_paid: 30, total_owed: 30, net_balance: 0 },
    { user_id: 'charlie', total_paid: 0, total_owed: 30, net_balance: -30 },
  ];

  const simplified = simplifyDebts(balances, 'USD');
  assert.equal(simplified.length, 1);
  assert.equal(simplified[0].from_user_id, 'charlie');
  assert.equal(simplified[0].to_user_id, 'alice');
  assert.equal(simplified[0].amount, 30);
});

test('convertCurrency: converts correctly between foreign currencies', () => {
  const rateMap = {
    USD: 1,
    JPY: 150,
    EUR: 0.90,
  };

  const inUSD = convertCurrency(15000, 'JPY', 'USD', rateMap);
  assert.equal(inUSD, 100);

  const inEUR = convertCurrency(100, 'USD', 'EUR', rateMap);
  assert.equal(inEUR, 90);

  const jpyToEur = convertCurrency(15000, 'JPY', 'EUR', rateMap);
  assert.equal(jpyToEur, 90);
});
