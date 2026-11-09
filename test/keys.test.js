'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createFunctionCallKey, assertCanSign } = require('../lib/keys');

describe('fc keys', () => {
  it('cannot transfer NEAR', () => {
    const k = createFunctionCallKey();
    assert.equal(k.can_transfer_near, false);
    assert.equal(k.can_add_key, false);
  });
  it('signs only allowlisted method on receiver', () => {
    const k = createFunctionCallKey();
    assert.equal(assertCanSign(k, { receiverId: 'intents.near', method: 'execute' }).ok, true);
    assert.equal(assertCanSign(k, { receiverId: 'other.near', method: 'execute' }).ok, false);
    assert.equal(assertCanSign(k, { receiverId: 'intents.near', method: 'add_key' }).ok, false);
  });
});
