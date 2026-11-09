'use strict';

const TESTNET_RPC = process.env.NEAR_RPC_URL || 'https://rpc.testnet.near.org';
const EXPLORER = 'https://testnet.nearblocks.io';

async function rpc(method, params) {
  const res = await fetch(TESTNET_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'agentguard', method, params }),
  });
  const json = await res.json();
  if (json.error) {
    const err = new Error(json.error.message || JSON.stringify(json.error));
    err.rpc = json.error;
    throw err;
  }
  return json.result;
}

async function viewAccount(accountId) {
  try {
    const result = await rpc('query', {
      request_type: 'view_account',
      finality: 'final',
      account_id: accountId,
    });
    return {
      ok: true,
      account_id: accountId,
      amount: result.amount,
      locked: result.locked,
      storage_usage: result.storage_usage,
      code_hash: result.code_hash,
      block_height: result.block_height,
      exists: true,
    };
  } catch (e) {
    const msg = String(e.message || e);
    if (/does not exist|unknown account/i.test(msg)) {
      return { ok: false, account_id: accountId, exists: false, reason: 'account does not exist on testnet' };
    }
    throw e;
  }
}

async function viewAccessKeyList(accountId) {
  const result = await rpc('query', {
    request_type: 'view_access_key_list',
    finality: 'final',
    account_id: accountId,
  });
  return result.keys || [];
}

function explorerTx(hash) {
  return `${EXPLORER}/txns/${hash}`;
}
function explorerAccount(id) {
  return `${EXPLORER}/address/${id}`;
}

module.exports = {
  TESTNET_RPC,
  EXPLORER,
  rpc,
  viewAccount,
  viewAccessKeyList,
  explorerTx,
  explorerAccount,
};
