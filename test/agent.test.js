'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { SpendPolicy } = require('../lib/policy');
const { runPayment, attackDemo } = require('../lib/agent');

describe('agent', () => {
  it('PASS_MOCK happy path dry intent', () => {
    const p = new SpendPolicy();
    const r = runPayment({ policy: p, payee: 'intents.near', amountNear: 0.2, priorInteractions: 3 });
    assert.equal(r.verdict, 'PASS_MOCK');
    assert.equal(r.receipt.status, 'mock_settled');
    assert.equal(r.key.can_transfer_near, false);
  });
  it('blocks blocklisted payee (attack demo)', () => {
    const p = new SpendPolicy();
    const r = attackDemo(p);
    assert.equal(r.verdict, 'BLOCKED');
    assert.equal(r.reason, 'counterparty_block');
    assert.equal(r.receipt, null);
  });
  it('blocks overspend', () => {
    const p = new SpendPolicy({ perTxNear: 1, dailyNear: 5 });
    const r = runPayment({ policy: p, payee: 'intents.near', amountNear: 3, priorInteractions: 5 });
    assert.equal(r.verdict, 'BLOCKED');
  });
  it('warn path needs human', () => {
    const p = new SpendPolicy({ perTxNear: 1, dailyNear: 5 });
    const r = runPayment({ policy: p, payee: 'intents.near', amountNear: 0.9, priorInteractions: 5 });
    assert.equal(r.verdict, 'WARN_HUMAN');
  });
});
