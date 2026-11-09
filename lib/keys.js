'use strict';

/**
 * Function-call access key model (NEAR docs):
 * An account that holds only FC keys can't transfer NEAR or add keys.
 * Gas allowance can lock the agent out — we surface that honestly.
 */
function createFunctionCallKey({
  accountId = 'agent.goalworld.testnet',
  receiverId = 'intents.near',
  methodNames = ['quote', 'execute'],
  allowanceYocto = '250000000000000000000000', // 0.25 NEAR gas allowance (display)
} = {}) {
  return {
    type: 'function_call',
    account_id: accountId,
    receiver_id: receiverId,
    method_names: [...methodNames],
    allowance_yocto: allowanceYocto,
    can_transfer_near: false,
    can_add_key: false,
    can_delete_key: false,
    notes: [
      'FC key is scoped to one receiver contract + method allowlist.',
      'Cannot transfer native NEAR or rotate keys — human holds full-access.',
      'If gas allowance hits zero the agent locks itself out until human tops up.',
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
    return { ok: false, reason: `method '${method}' not in FC allowlist [${key.method_names}]` };
  }
  if (key.can_transfer_near) {
    return { ok: false, reason: 'refusing full-access-like key' };
  }
  return { ok: true };
}

module.exports = { createFunctionCallKey, assertCanSign };
