'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { describeFunctionCallKey, assertCanSign } = require('../lib/keys');

describe('fc keys', () => {
  it('cannot transfer NEAR', () => {
    const k = describeFunctionCallKey({ accountId: 'a.testnet', receiverId: 'wrap.near' });
    assert.equal(k.can_transfer_near, false);
  });
  it('signs only allowlisted method on receiver', () => {
    const k = describeFunctionCallKey({
      accountId: 'a.testnet',
      receiverId: 'wrap.near',
      methodNames: ['ft_transfer'],
    });
    assert.equal(assertCanSign(k, { receiverId: 'wrap.near', method: 'ft_transfer' }).ok, true);
    assert.equal(assertCanSign(k, { receiverId: 'other.near', method: 'ft_transfer' }).ok, false);
    assert.equal(assertCanSign(k, { receiverId: 'wrap.near', method: 'add_key' }).ok, false);
  });
});
