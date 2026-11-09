'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { SpendPolicy } = require('../lib/policy');

describe('spend policy', () => {
  it('allows under caps', () => {
    const p = new SpendPolicy({ perTxNear: 1, dailyNear: 5 });
    assert.equal(p.check({ amountNear: 0.5 }).decision, 'allow');
  });
  it('blocks over per-tx with code', () => {
    const p = new SpendPolicy({ perTxNear: 1, dailyNear: 5 });
    const r = p.check({ amountNear: 2 });
    assert.equal(r.decision, 'block');
    assert.equal(r.code, 'per_tx_cap');
  });
  it('token allowlist code', () => {
    const p = new SpendPolicy();
    const r = p.check({ token: 'USDT', amountNear: 0.1 });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'token_allowlist');
  });
  it('daily cap', () => {
    const p = new SpendPolicy({ perTxNear: 1, dailyNear: 0.5 });
    p.record({ amount_near: 0.5 });
    assert.equal(p.check({ amountNear: 0.1 }).code, 'daily_cap');
  });
  it('warn near ceiling', () => {
    const p = new SpendPolicy({ perTxNear: 1, dailyNear: 5 });
    assert.equal(p.check({ amountNear: 0.9 }).decision, 'warn');
  });
});
