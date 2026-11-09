'use strict';

/**
 * NEAR Intents adapter — mock by default.
 * Honest: no testnet for Intents (HACKATHON.md Q-007). Live path is dry-run quote shaped.
 */
function quoteIntent({ fromToken = 'NEAR', toToken = 'USDC', amountNear, dry = true }) {
  const amount = Number(amountNear);
  const feeBps = 20; // 0.2% without 1Click JWT (Q-006)
  const fee = round6(amount * (feeBps / 10000));
  return {
    mode: 'mock',
    dry: Boolean(dry),
    route: 'near-intents',
    from: { token: fromToken, amount },
    to: { token: toToken, amount: round6(amount - fee) },
    fee: { bps: feeBps, amount: fee, token: fromToken },
    note: dry
      ? 'DRY quote only — no mainnet tx. Intents has no testnet (Q-007).'
      : 'LIVE execute refused in this pack without Nico OK + tiny mainnet budget.',
  };
}

function executeIntent(quote, { keyCheck }) {
  if (!keyCheck?.ok) {
    return { ok: false, status: 'refused', reason: keyCheck?.reason || 'FC key check failed', receipt: null };
  }
  if (!quote?.dry) {
    return {
      ok: false,
      status: 'refused',
      reason: 'refusing non-dry execute (no mainnet spend without Nico OK)',
      receipt: null,
    };
  }
  const receipt = {
    id: `mock-intent-${Date.now()}`,
    status: 'mock_settled',
    amount_near: quote.from.amount,
    token: quote.from.token,
    received: quote.to,
    fee: quote.fee,
    explorer: null,
    ts: new Date().toISOString(),
  };
  return { ok: true, status: 'mock_settled', reason: 'dry mock settlement', receipt };
}

function round6(n) {
  return Math.round(Number(n) * 1e6) / 1e6;
}

module.exports = { quoteIntent, executeIntent };
