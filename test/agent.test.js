'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { SpendPolicy } = require('../lib/policy');
const { runPayment, attackDemo } = require('../lib/agent');
const { describeFunctionCallKey } = require('../lib/keys');

const payee = process.env.NEAR_AGENT_ACCOUNT || 'wrap.testnet';
const key = describeFunctionCallKey({
  accountId: process.env.NEAR_AGENT_ACCOUNT || 'test.agent.testnet',
  receiverId: process.env.NEAR_FC_RECEIVER || 'wrap.testnet',
  methodNames: ['ft_transfer', 'storage_deposit', 'near_deposit'],
});

describe('agent', () => {
  it('blocks blocklisted payee', async () => {
    const p = new SpendPolicy();
    const r = await attackDemo(p, null);
    assert.equal(r.verdict, 'BLOCKED');
    assert.equal(r.reason, 'counterparty_block');
  });
  it('blocks overspend with per_tx code', async () => {
    const p = new SpendPolicy({ perTxNear: 1, dailyNear: 5 });
    const r = await runPayment({
      policy: p,
      key,
      payee,
      amountNear: 3,
      priorInteractions: 3,
      skipQuote: true,
    });
    assert.equal(r.verdict, 'BLOCKED');
    assert.equal(r.reason, 'per_tx_cap');
  });
  it('warn path needs human', async () => {
    const p = new SpendPolicy({ perTxNear: 1, dailyNear: 5 });
    const r = await runPayment({
      policy: p,
      key,
      payee,
      amountNear: 0.9,
      priorInteractions: 5,
      skipQuote: true,
    });
    assert.equal(r.verdict, 'WARN_HUMAN');
  });
  it('does not default prior interactions to 2', async () => {
    const p = new SpendPolicy();
    const r = await runPayment({
      policy: p,
      key,
      payee,
      amountNear: 0.2,
      skipQuote: true,
    });
    assert.ok(['PASS', 'WARN_HUMAN', 'BLOCKED'].includes(r.verdict));
    const cpStep = r.timeline.find((t) => t.kind === 'counterparty');
    assert.ok(cpStep);
    const joined = (cpStep.reasons || []).join(' | ');
    assert.match(joined, /no prior-interaction|prior_interactions=/);
    assert.doesNotMatch(joined, /prior_interactions=2/);
  });
});
