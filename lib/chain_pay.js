'use strict';
/**
 * Sign a real testnet pay() against the spend_cap policy contract using the FC key.
 * Zero attached deposit — FC-key safe.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const nearAPI = require('near-api-js');
const { keyStores, KeyPair, connect, utils } = nearAPI;

function loadFcCredential() {
  const accountId = process.env.NEAR_AGENT_ACCOUNT;
  if (!accountId) return null;
  const p = path.join(os.homedir(), '.near-credentials', 'testnet', `${accountId}.fc.json`);
  if (!fs.existsSync(p)) return null;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  return j;
}

async function signPolicyPay({ payee, amountNear }) {
  const cred = loadFcCredential();
  if (!cred?.private_key) {
    return { ok: false, reason: 'fc_credential_missing', hash: null };
  }
  const policy = process.env.NEAR_POLICY_ACCOUNT || process.env.NEAR_FC_RECEIVER || cred.receiver_id;
  if (!policy) return { ok: false, reason: 'policy_account_missing', hash: null };

  const kp = KeyPair.fromString(cred.private_key);
  const store = new keyStores.InMemoryKeyStore();
  await store.setKey('testnet', cred.account_id, kp);
  const near = await connect({
    networkId: 'testnet',
    nodeUrl: process.env.NEAR_RPC_URL || 'https://rpc.testnet.near.org',
    keyStore: store,
  });
  const account = await near.account(cred.account_id);
  const amount = utils.format.parseNearAmount(String(amountNear));
  if (!amount) return { ok: false, reason: 'bad_amount', hash: null };

  try {
    const outcome = await account.functionCall({
      contractId: policy,
      methodName: 'pay',
      args: { payee, amount },
      gas: '50000000000000',
      attachedDeposit: '0',
    });
    const hash = outcome?.transaction?.hash || outcome?.transaction_outcome?.id || null;
    return {
      ok: true,
      hash,
      explorer: hash ? `https://testnet.nearblocks.io/txns/${hash}` : null,
      explorer_live: hash ? `https://testnet.near.rocks/tx/${hash}` : null,
      explorer_selector: hash ? `https://explorer.testnet.near.org/transactions/${hash}` : null,
      policy,
      payee,
      amount_near: Number(amountNear),
      status: 'onchain_pay',
    };
  } catch (e) {
    const msg = String(e.message || e);
    const failHash = e?.transaction_outcome?.id || e?.transaction?.hash || null;
    return {
      ok: false,
      reason: msg.slice(0, 500),
      hash: failHash,
      explorer: failHash ? `https://testnet.nearblocks.io/txns/${failHash}` : null,
      explorer_live: failHash ? `https://testnet.near.rocks/tx/${failHash}` : null,
      explorer_selector: failHash ? `https://explorer.testnet.near.org/transactions/${failHash}` : null,
      policy,
      payee,
      amount_near: Number(amountNear),
      onchain_blocked: /per_tx_cap|daily_cap|payee_not_allowlisted|insufficient_vault|WebAssembly trap|ExecutionError|FunctionCallError/i.test(msg),
    };
  }
}

module.exports = { signPolicyPay, loadFcCredential };
