'use strict';

const { createFunctionCallKey, assertCanSign } = require('./keys');
const { checkCounterparty } = require('./counterparty');
const { quoteIntent, executeIntent } = require('./intents');

/**
 * AgentGuard loop: counterparty → spend policy → FC key → dry Intent → receipt.
 */
function runPayment({
  policy,
  payee,
  amountNear,
  token = 'NEAR',
  toToken = 'USDC',
  priorInteractions = 0,
  forceHuman = false,
  key = null,
}) {
  const timeline = [];
  const started = Date.now();
  const fcKey = key || createFunctionCallKey();

  const cp = checkCounterparty(payee, { priorInteractions });
  timeline.push({ step: 1, kind: 'counterparty', status: cp.decision, detail: `${payee} score=${cp.score}`, reasons: cp.reasons });

  if (cp.decision === 'block') {
    return done('BLOCKED', 'counterparty_block', null, timeline, started, policy, fcKey, cp);
  }

  const spend = policy.check({ token, amountNear });
  timeline.push({ step: 2, kind: 'spend_policy', status: spend.decision, detail: spend.reason });

  if (!spend.ok || spend.decision === 'block') {
    return done('BLOCKED', 'spend_cap', null, timeline, started, policy, fcKey, cp, spend);
  }

  if (spend.decision === 'warn' || cp.decision === 'warn' || forceHuman) {
    timeline.push({
      step: 3,
      kind: 'human_gate',
      status: 'warn',
      detail: 'human confirmation required — demo continues only for allow-path smoke',
    });
    // For warn: refuse auto-sign (security track requirement)
    return done('WARN_HUMAN', 'needs_human', null, timeline, started, policy, fcKey, cp, spend);
  }

  const keyCheck = assertCanSign(fcKey, { receiverId: 'intents.near', method: 'execute' });
  timeline.push({
    step: 3,
    kind: 'fc_key',
    status: keyCheck.ok ? 'ok' : 'blocked',
    detail: keyCheck.ok ? `scoped to ${fcKey.receiver_id}` : keyCheck.reason,
  });
  if (!keyCheck.ok) {
    return done('BLOCKED', 'fc_key', null, timeline, started, policy, fcKey, cp, spend);
  }

  const quote = quoteIntent({ fromToken: token, toToken, amountNear, dry: true });
  timeline.push({ step: 4, kind: 'intent_quote', status: 'ok', detail: `dry quote fee ${quote.fee.bps}bps` });

  const exec = executeIntent(quote, { keyCheck });
  timeline.push({ step: 5, kind: 'intent_execute', status: exec.ok ? 'mock_settled' : 'refused', detail: exec.reason });

  if (exec.ok && exec.receipt) {
    policy.record({
      ...exec.receipt,
      payee,
      amount_near: Number(amountNear),
    });
  }

  return done(exec.ok ? 'PASS_MOCK' : 'BLOCKED', exec.status, exec.receipt, timeline, started, policy, fcKey, cp, spend, quote);
}

function attackDemo(policy) {
  // Prompt-injected agent tries to pay a known-bad address
  return runPayment({
    policy,
    payee: 'scam.near',
    amountNear: 4.5,
    priorInteractions: 0,
  });
}

function done(verdict, reason, receipt, timeline, started, policy, key, cp, spend, quote) {
  return {
    verdict,
    reason,
    receipt,
    counterparty: cp || null,
    spend: spend || null,
    quote: quote || null,
    key: {
      type: key.type,
      receiver_id: key.receiver_id,
      method_names: key.method_names,
      can_transfer_near: key.can_transfer_near,
      notes: key.notes,
    },
    budget: policy.snapshot(),
    timeline,
    ms: Date.now() - started,
    honesty: 'MOCK Intents dry-run — no mainnet tx, no wallet created',
  };
}

module.exports = { runPayment, attackDemo };
