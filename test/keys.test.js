"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { describeFunctionCallKey, assertCanSign } = require("../lib/keys");

describe("keys", () => {
  it("describes FC key", () => {
    const k = describeFunctionCallKey({ accountId: "a.testnet", receiverId: "policy.example.testnet" });
    assert.equal(k.can_transfer_near, false);
  });
  it("assertCanSign scopes method", () => {
    const k = describeFunctionCallKey({
      accountId: "a.testnet",
      receiverId: "policy.example.testnet",
      methodNames: ["pay"],
    });
    assert.equal(assertCanSign(k, { receiverId: "policy.example.testnet", method: "pay" }).ok, true);
    assert.equal(assertCanSign(k, { receiverId: "policy.example.testnet", method: "add_key" }).ok, false);
  });
});
