'use strict';

/**
 * Function-call access key model + helpers for near-api-js wiring.
 * Real AddKey happens in scripts/setup_testnet.js — this module describes + validates.
 */
function describeFunctionCallKey({
  accountId,
  receiverId,
  methodNames = ['ft_transfer', 'storage_deposit'],
  allowanceYocto = '250000000000000000000000',
  publicKey = null,
} = {}) {
  return {
    type: 'function_call',
    account_id: accountId,
    receiver_id: receiverId,
    method_names: [...methodNames],
    allowance_yocto: allowanceYocto,
    public_key: publicKey,
    can_transfer_near: false,
    can_add_key: false,
    can_delete_key: false,
    notes: [
      'FC key scoped to one receiver + method allowlist.',
      'Cannot Transfer native NEAR or AddKey — proven on testnet in evidence/.',
      'Gas allowance exhaustion locks the agent until human tops up.',
    ],
  };
}

function assertCanSign(key, { receiverId, method }) {
  if (!key || key.type !== 'function_call') {
    return { ok: false, reason: 'missing function-call key' };
  }
  if (key.receiver_id !== receiverId) {
    return { ok: false, reason: `FC key receiver ${key.receiver_id} ≠ ${receiverId}` };
  }
  if (!key.method_names.includes(method)) {
    return { ok: false, reason: `method '${method}' not in FC allowlist [${key.method_names.join(',')}]` };
  }
  if (key.can_transfer_near) {
    return { ok: false, reason: 'refusing full-access-like key' };
  }
  return { ok: true };
}

module.exports = { describeFunctionCallKey, assertCanSign, createFunctionCallKey: describeFunctionCallKey };
