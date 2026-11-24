'use strict';

/**
 * Mercado Pago server-side adapter for Agenda Pro.
 * Node.js 18+ (uses built-in fetch). Never import this file in browser code.
 * Required secret: MERCADOPAGO_ACCESS_TOKEN.
 */
const API_BASE = 'https://api.mercadopago.com';
const PLAN = Object.freeze({ amount: 19.90, currency: 'BRL', frequency: 1, frequencyType: 'months' });

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function mpRequest(path, { method = 'GET', body, idempotencyKey } = {}) {
  const headers = {
    Authorization: `Bearer ${requiredEnv('MERCADOPAGO_ACCESS_TOKEN')}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'Mercado Pago request failed');
    error.status = response.status;
    error.details = payload;
    throw error;
  }
  return payload;
}

/**
 * Creates a hosted checkout for a customer who explicitly chose to subscribe.
 * The free trial is managed by Agenda Pro and is intentionally NOT sent to MP.
 * The returned init_point must be opened by the client only after this server
 * function has authenticated the user and verified their trial/tenant state.
 */
async function createSubscriptionCheckout({ email, tenantId, backUrl, idempotencyKey }) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TypeError('A valid payer email is required');
  }
  if (!tenantId || typeof tenantId !== 'string') {
    throw new TypeError('A valid tenantId is required');
  }
  if (!backUrl || !/^https:\/\//i.test(backUrl)) {
    throw new TypeError('backUrl must be an HTTPS URL');
  }

  const result = await mpRequest('/preapproval', {
    method: 'POST',
    idempotencyKey,
    body: {
      reason: 'Agenda Pro — assinatura mensal',
      external_reference: tenantId,
      payer_email: email,
      auto_recurring: {
        frequency: PLAN.frequency,
        frequency_type: PLAN.frequencyType,
        transaction_amount: PLAN.amount,
        currency_id: PLAN.currency,
      },
      back_url: backUrl,
      status: 'pending',
    },
  });

  if (!result.init_point || !result.id) {
    throw new Error('Mercado Pago did not return a valid subscription checkout');
  }
  return {
    provider: 'mercado_pago',
    subscriptionId: result.id,
    checkoutUrl: result.init_point,
    status: result.status || 'pending',
    externalReference: tenantId,
  };
}

async function getSubscription(subscriptionId) {
  if (!subscriptionId || typeof subscriptionId !== 'string') {
    throw new TypeError('subscriptionId is required');
  }
  return mpRequest(`/preapproval/${encodeURIComponent(subscriptionId)}`);
}

module.exports = {
  PLAN,
  createSubscriptionCheckout,
  getSubscription,
};
