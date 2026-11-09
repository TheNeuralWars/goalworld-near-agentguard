'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { SpendPolicy } = require('../lib/policy');

describe('spend policy', () => {
  it('allows under caps', () => {
    const p = new SpendPolicy({ perTxNear: 1, dailyNear: 5 });
    assert.equal(p.check({ amountNear: 0.5 }).decision, 'allow');
  });
  it('blocks over per-tx', () => {
    const p = new SpendPolicy({ perTxNear: 1, dailyNear: 5 });
    assert.equal(p.check({ amountNear: 2 }).decision, 'block');
  });
  it('blocks unknown token', () => {
    const p = new SpendPolicy();
    assert.equal(p.check({ token: 'SCAM', amountNear: 0.1 }).ok, false);
  });
  it('blocks when daily exhausted', () => {
    const p = new SpendPolicy({ perTxNear: 1, dailyNear: 0.5 });
    p.record({ amount_near: 0.5 });
    assert.equal(p.check({ amountNear: 0.1 }).ok, false);
  });
});
