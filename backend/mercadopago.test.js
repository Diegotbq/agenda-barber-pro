'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PLAN, createSubscriptionCheckout } = require('./mercadopago');

test('billing plan is BRL 19.90 monthly', () => {
  assert.deepEqual(PLAN, {
    amount: 19.90,
    currency: 'BRL',
    frequency: 1,
    frequencyType: 'months',
  });
});

test('checkout rejects missing or invalid payer data before network access', async () => {
  await assert.rejects(
    createSubscriptionCheckout({ email: 'invalid', tenantId: 'barber-1', backUrl: 'https://example.com' }),
    /valid payer email/
  );
  await assert.rejects(
    createSubscriptionCheckout({ email: 'owner@example.com', tenantId: '', backUrl: 'https://example.com' }),
    /valid tenantId/
  );
  await assert.rejects(
    createSubscriptionCheckout({ email: 'owner@example.com', tenantId: 'barber-1', backUrl: 'http://example.com' }),
    /HTTPS URL/
  );
});
