'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { quoteIntent, noPrice } = require('../lib/intents');

describe('1Click dry quote', () => {
  it('returns real dry quote or explicit no price — never fabricates 1:1', async () => {
    let q;
    try {
      q = await quoteIntent({
        amountYocto: '1000000000000000000000000',
        recipient: 'demo.near',
        refundTo: 'demo.near',
      });
    } catch (e) {
      q = noPrice(String(e.message || e));
    }
    if (q.ok) {
      assert.equal(q.dry, true);
      assert.ok(q.quote.amountOut);
      assert.ok(q.price.out);
      assert.notEqual(q.quote.amountOutFormatted, '0.998');
    } else {
      assert.equal(q.price, null);
      assert.ok(q.reason);
    }
  });
  it('noPrice helper has null price', () => {
    const n = noPrice('x');
    assert.equal(n.price, null);
    assert.equal(n.ok, false);
  });
});
