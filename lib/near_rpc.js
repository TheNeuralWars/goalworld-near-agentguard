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

async function viewPolicyConfig(policyAccount) {
  if (!policyAccount) return null;
  try {
    const [cfgRes, stateRes, blockRes] = await Promise.all([
      rpc('query', {
        request_type: 'call_function',
        finality: 'final',
        account_id: policyAccount,
        method_name: 'get_config',
        args_base64: Buffer.from('{}').toString('base64'),
      }),
      rpc('query', {
        request_type: 'view_state',
        finality: 'final',
        account_id: policyAccount,
        prefix_base64: Buffer.from('STATE').toString('base64'),
      }).catch(() => null),
      rpc('block', { finality: 'final' }).catch(() => null),
    ]);
    const raw = Buffer.from(cfgRes.result || []).toString('utf8');
    const parsed = JSON.parse(raw);
    const [owner, perTxYocto, dailyYocto, spentTodayYocto, allowlistEnabled] = parsed;
    const toNear = (y) => Math.round((Number(BigInt(y || '0')) / 1e24) * 10000) / 10000;
    const perTxNear = toNear(perTxYocto);
    const dailyNear = toNear(dailyYocto);
    let spentNear = toNear(spentTodayYocto);

    // Check if contract day_bucket is from a prior UTC day (roll_day runs on next pay)
    if (stateRes?.values?.length && blockRes?.header?.timestamp) {
      const stateRow = stateRes.values.find((v) => v.key === Buffer.from('STATE').toString('base64'));
      if (stateRow?.value) {
        const buf = Buffer.from(stateRow.value, 'base64');
        const ownerLen = buf.readUInt32LE(0);
        const dayBucketOffset = 4 + ownerLen + 16 + 16 + 16;
        if (buf.length >= dayBucketOffset + 8) {
          const contractDay = buf.readBigUInt64LE(dayBucketOffset);
          const currentDay = BigInt(blockRes.header.timestamp) / 86400000000000n;
          if (contractDay !== currentDay) {
            spentNear = 0;
          }
        }
      }
    }

    const remainingNear = Math.round(Math.max(0, dailyNear - spentNear) * 10000) / 10000;
    return {
      ok: true,
      policy_account: policyAccount,
      owner,
      per_tx_yocto: String(perTxYocto),
      daily_yocto: String(dailyYocto),
      spent_today_yocto: String(spentTodayYocto),
      per_tx_near: perTxNear,
      daily_near: dailyNear,
      spent_near: spentNear,
      remaining_near: remainingNear,
      allowlist_enabled: Boolean(allowlistEnabled),
      block_height: cfgRes.block_height || null,
    };
  } catch (e) {
    return {
      ok: false,
      policy_account: policyAccount,
      reason: String(e.message || e).slice(0, 200),
    };
  }
}

module.exports = {
  TESTNET_RPC,
  EXPLORER,
  rpc,
  viewAccount,
  viewAccessKeyList,
  viewPolicyConfig,
  explorerTx,
  explorerAccount,
};
