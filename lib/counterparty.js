'use strict';

const { viewAccount, viewAccessKeyList } = require('./near_rpc');

const BLOCKLIST = new Set(['scam.near', 'drain.near', 'evil-market.near']);

/**
 * On-chain counterparty check (testnet RPC). No fake prior-interaction default.
 */
async function checkCounterparty(accountId, { priorInteractions = null } = {}) {
  const id = String(accountId || '').toLowerCase().trim();
  const reasons = [];
  let score = 40;

  if (!id || !/^[a-z0-9._-]+$/.test(id)) {
    return { decision: 'block', score: 0, reasons: ['invalid account id'], onchain: null };
  }
  if (BLOCKLIST.has(id)) {
    return {
      decision: 'block',
      score: 0,
      reasons: ['shared blocklist hit', 'known-bad demo address'],
      onchain: null,
    };
  }

  let onchain = null;
  try {
    onchain = await viewAccount(id);
  } catch (e) {
    const msg = String(e.message || e);
    // Transient RPC / wrong-network ids → block with explicit reason (not invent existence)
    return {
      decision: 'block',
      score: 0,
      reasons: [`rpc error: ${msg.slice(0, 160)}`],
      onchain: null,
    };
  }

  if (!onchain.exists) {
    return {
      decision: 'block',
      score: 0,
      reasons: ['account does not exist on NEAR testnet'],
      onchain,
    };
  }

  score += 25;
  reasons.push('view_account ok');
  const bal = BigInt(onchain.amount || '0');
  if (bal > 0n) {
    score += 5;
    reasons.push('nonzero balance');
  }
  if (onchain.code_hash && onchain.code_hash !== '11111111111111111111111111111111') {
    score += 5;
    reasons.push('has contract code');
    try {
      const keys = await viewAccessKeyList(id);
      reasons.push(`access_keys=${keys.length}`);
    } catch {
      /* optional */
    }
  }

  // priorInteractions: only if caller supplies a number; never default to 2
  if (priorInteractions === null || priorInteractions === undefined) {
    reasons.push('no prior-interaction signal supplied');
  } else if (Number(priorInteractions) > 0) {
    score += Math.min(15, Number(priorInteractions) * 3);
    reasons.push(`prior_interactions=${priorInteractions}`);
  } else {
    score -= 5;
    reasons.push('prior_interactions=0');
  }

  let decision = 'allow';
  if (score < 45) decision = 'block';
  else if (score < 60) decision = 'warn';

  return { decision, score, reasons, onchain, account_id: id };
}

module.exports = { checkCounterparty, BLOCKLIST };
