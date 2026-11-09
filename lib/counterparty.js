'use strict';

/**
 * Counterparty check before an agent pays (security track hint).
 * Signals are mockable; live would hit NEAR RPC / shared blocklist.
 */
const BLOCKLIST = new Set(['scam.near', 'drain.near', 'evil-market.near']);
const KNOWN_OK = new Set(['intents.near', 'market.near', 'agent.goalworld.testnet']);

function checkCounterparty(accountId, { priorInteractions = 0 } = {}) {
  const id = String(accountId || '').toLowerCase();
  const reasons = [];
  let score = 50;

  if (!id || !/^[a-z0-9._-]+$/.test(id)) {
    return { decision: 'block', score: 0, reasons: ['invalid account id'] };
  }
  if (BLOCKLIST.has(id)) {
    return { decision: 'block', score: 0, reasons: ['shared blocklist hit', 'known-bad demo address'] };
  }
  if (KNOWN_OK.has(id)) {
    score += 30;
    reasons.push('known allow / protocol account');
  }
  if (id.endsWith('.near') && id.split('.').length === 2) {
    score += 5;
    reasons.push('named mainnet-style account');
  }
  if (priorInteractions > 0) {
    score += Math.min(20, priorInteractions * 5);
    reasons.push(`prior interactions=${priorInteractions}`);
  } else {
    score -= 10;
    reasons.push('no prior interactions with this agent');
  }
  // Fresh / unknown contract heuristic
  if (id.includes('new') || id.includes('temp')) {
    score -= 25;
    reasons.push('fresh/temp naming heuristic');
  }

  let decision = 'allow';
  if (score < 35) decision = 'block';
  else if (score < 55) decision = 'warn';

  return { decision, score, reasons, account_id: id };
}

module.exports = { checkCounterparty, BLOCKLIST, KNOWN_OK };
