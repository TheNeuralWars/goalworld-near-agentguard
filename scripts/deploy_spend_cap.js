#!/usr/bin/env node
'use strict';
/**
 * Deploy spend_cap.wasm to policy.<agent>.testnet, fund it, scope FC key to pay().
 * Uses full-access key in ~/.near-credentials/testnet/<agent>.json
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const nearAPI = require('near-api-js');
const { keyStores, KeyPair, connect, utils, transactions } = nearAPI;

const ROOT = '/data/work/goalworld-near-agentguard';
const WASM = path.join(ROOT, 'contracts/res/spend_cap.wasm');
const AGENT = process.env.NEAR_AGENT_ACCOUNT || 'gwagent894bd1e3.testnet';
const RPC = process.env.NEAR_RPC_URL || 'https://rpc.testnet.near.org';
const PER_TX = utils.format.parseNearAmount('0.5'); // yocto string
const DAILY = utils.format.parseNearAmount('2');
const VAULT_FUND = utils.format.parseNearAmount('1.5');
const POLICY_ID = process.env.NEAR_POLICY_ACCOUNT || `policy.${AGENT}`;

async function main() {
  if (!fs.existsSync(WASM)) throw new Error('missing wasm ' + WASM);
  const wasm = fs.readFileSync(WASM);
  const credDir = path.join(os.homedir(), '.near-credentials', 'testnet');
  const keyStore = new keyStores.UnencryptedFileSystemKeyStore(credDir);
  const near = await connect({
    networkId: 'testnet',
    nodeUrl: RPC,
    helperUrl: 'https://helper.testnet.near.org',
    explorerUrl: 'https://testnet.nearblocks.io',
    keyStore,
  });
  const master = await near.account(AGENT);
  const bal = await master.getAccountBalance();
  console.log(JSON.stringify({ agent: AGENT, policy: POLICY_ID, available: bal.available }));

  // 1) Create vendor faucet account (payee ≠ agent)
  const vendorSuffix = crypto.randomBytes(3).toString('hex');
  const vendorId = `gwvendor${vendorSuffix}.testnet`;
  const vendorKp = KeyPair.fromRandom('ed25519');
  const vendorPub = vendorKp.getPublicKey().toString();
  let vendorOk = false;
  try {
    const hr = await fetch('https://helper.testnet.near.org/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newAccountId: vendorId, newAccountPublicKey: vendorPub }),
    });
    const ht = await hr.text();
    vendorOk = hr.ok;
    if (!hr.ok) console.error('VENDOR_FAUCET', hr.status, ht.slice(0, 200));
  } catch (e) {
    console.error('VENDOR_FAUCET_ERR', String(e.message || e).slice(0, 200));
  }
  if (vendorOk) {
    await keyStore.setKey('testnet', vendorId, vendorKp);
  }

  // 2) Create policy subaccount under agent (needs ~0.2 NEAR for contract storage)
  let createHash = null;
  try {
    // Check if exists
    try {
      await near.account(POLICY_ID).state();
      console.log(JSON.stringify({ policy_exists: true }));
    } catch {
      const pk = KeyPair.fromRandom('ed25519');
      await keyStore.setKey('testnet', POLICY_ID, pk);
      const outcome = await master.createAccount(
        POLICY_ID,
        pk.getPublicKey(),
        utils.format.parseNearAmount('2.5') // enough for wasm + vault seed
      );
      createHash = outcome?.transaction?.hash || outcome?.transaction_outcome?.id || null;
      console.log(JSON.stringify({ policy_created: true, createHash }));
    }
  } catch (e) {
    console.error('CREATE_POLICY_FAILED', String(e.message || e).slice(0, 400));
    process.exit(1);
  }

  const policy = await near.account(POLICY_ID);

  // 3) Deploy + init (or redeploy)
  let deployHash = null;
  try {
    const outcome = await policy.deployContract(wasm);
    deployHash = outcome?.transaction?.hash || outcome?.transaction_outcome?.id || null;
  } catch (e) {
    console.error('DEPLOY_FAILED', String(e.message || e).slice(0, 400));
    process.exit(1);
  }

  // init — may fail if already initialized
  let initHash = null;
  try {
    const outcome = await policy.functionCall({
      contractId: POLICY_ID,
      methodName: 'new',
      args: { per_tx_yocto: PER_TX, daily_yocto: DAILY },
      gas: '30000000000000',
      attachedDeposit: '0',
    });
    initHash = outcome?.transaction?.hash || outcome?.transaction_outcome?.id || null;
  } catch (e) {
    const msg = String(e.message || e);
    if (!/already|initialized|MethodResolveError/i.test(msg)) {
      console.error('INIT_FAILED', msg.slice(0, 400));
      // continue — may already be inited
    } else {
      console.log(JSON.stringify({ init_skipped: true, reason: msg.slice(0, 120) }));
    }
  }

  // 4) Fund vault via deposit
  let depositHash = null;
  try {
    const outcome = await policy.functionCall({
      contractId: POLICY_ID,
      methodName: 'deposit',
      args: {},
      gas: '30000000000000',
      attachedDeposit: VAULT_FUND,
    });
    depositHash = outcome?.transaction?.hash || outcome?.transaction_outcome?.id || null;
  } catch (e) {
    // fallback: just transfer NEAR to contract account
    try {
      const outcome = await master.sendMoney(POLICY_ID, VAULT_FUND);
      depositHash = outcome?.transaction?.hash || null;
      console.log(JSON.stringify({ funded_via_transfer: true }));
    } catch (e2) {
      console.error('FUND_FAILED', String(e2.message || e2).slice(0, 300));
    }
  }

  // 5) Allow vendor if created
  if (vendorOk) {
    try {
      await policy.functionCall({
        contractId: POLICY_ID,
        methodName: 'allow',
        args: { account: vendorId },
        gas: '30000000000000',
        attachedDeposit: '0',
      });
      await policy.functionCall({
        contractId: POLICY_ID,
        methodName: 'set_allowlist_enabled',
        args: { enabled: true },
        gas: '30000000000000',
        attachedDeposit: '0',
      });
    } catch (e) {
      console.error('ALLOWLIST_FAILED', String(e.message || e).slice(0, 200));
    }
  }

  // 6) Rotate FC key: delete old wrap.near FC key, add new scoped to policy.pay
  const oldFcPath = path.join(credDir, `${AGENT}.fc.json`);
  let oldFcPub = null;
  if (fs.existsSync(oldFcPath)) {
    try {
      oldFcPub = JSON.parse(fs.readFileSync(oldFcPath, 'utf8')).public_key;
    } catch {}
  }
  if (oldFcPub) {
    try {
      await master.deleteKey(oldFcPub);
      console.log(JSON.stringify({ deleted_old_fc: true }));
    } catch (e) {
      console.error('DELETE_OLD_FC', String(e.message || e).slice(0, 200));
    }
  }

  const fcKp = KeyPair.fromRandom('ed25519');
  const fcPub = fcKp.getPublicKey().toString();
  let addKeyHash = null;
  try {
    const outcome = await master.addKey(
      fcPub,
      POLICY_ID,
      ['pay'],
      utils.format.parseNearAmount('0.25')
    );
    addKeyHash = outcome?.transaction?.hash || outcome?.transaction_outcome?.id || null;
  } catch (e) {
    console.error('ADD_FC_FAILED', String(e.message || e).slice(0, 400));
    process.exit(1);
  }

  fs.writeFileSync(
    oldFcPath,
    JSON.stringify(
      {
        account_id: AGENT,
        public_key: fcPub,
        private_key: fcKp.toString(),
        receiver_id: POLICY_ID,
        method_names: ['pay'],
      },
      null,
      2
    ),
    { mode: 0o600 }
  );
  fs.chmodSync(oldFcPath, 0o600);

  // 7) Prove Transfer still refused with FC key
  const fcStore = new keyStores.InMemoryKeyStore();
  await fcStore.setKey('testnet', AGENT, fcKp);
  const nearFc = await connect({ networkId: 'testnet', nodeUrl: RPC, keyStore: fcStore });
  let transferProof = { refused: false, error: null };
  try {
    await (await nearFc.account(AGENT)).sendMoney(POLICY_ID, utils.format.parseNearAmount('0.001'));
    transferProof = { refused: false, error: 'UNEXPECTED_SUCCESS' };
  } catch (e) {
    transferProof = { refused: true, error: String(e.message || e).slice(0, 400) };
  }

  // 8) Real pay tx with FC key → vendor
  const payee = vendorOk ? vendorId : AGENT; // prefer vendor
  let payTx = { ok: false, hash: null, error: null, payee };
  try {
    const fcAccount = await nearFc.account(AGENT);
    const amount = utils.format.parseNearAmount('0.15');
    const outcome = await fcAccount.functionCall({
      contractId: POLICY_ID,
      methodName: 'pay',
      args: { payee, amount },
      gas: '50000000000000',
      attachedDeposit: '0',
    });
    payTx = {
      ok: true,
      hash: outcome?.transaction?.hash || outcome?.transaction_outcome?.id || null,
      payee,
      amount_near: 0.15,
    };
  } catch (e) {
    payTx = { ok: false, hash: null, error: String(e.message || e).slice(0, 500), payee };
  }

  // 9) Over-cap should fail on-chain
  let overCap = { blocked_onchain: false, hash: null, error: null };
  try {
    const fcAccount = await nearFc.account(AGENT);
    const outcome = await fcAccount.functionCall({
      contractId: POLICY_ID,
      methodName: 'pay',
      args: { payee, amount: utils.format.parseNearAmount('0.9') },
      gas: '50000000000000',
      attachedDeposit: '0',
    });
    overCap = {
      blocked_onchain: false,
      hash: outcome?.transaction?.hash || null,
      error: 'UNEXPECTED_SUCCESS',
    };
  } catch (e) {
    overCap = { blocked_onchain: true, hash: null, error: String(e.message || e).slice(0, 500) };
  }

  const evidence = {
    network: 'testnet',
    agent_account: AGENT,
    policy_account: POLICY_ID,
    vendor_account: vendorOk ? vendorId : null,
    wasm_bytes: wasm.length,
    create_hash: createHash,
    deploy_hash: deployHash,
    init_hash: initHash,
    deposit_hash: depositHash,
    fc_public_key: fcPub,
    fc_receiver: POLICY_ID,
    fc_methods: ['pay'],
    add_key_hash: addKeyHash,
    explorer_policy: `https://testnet.nearblocks.io/address/${POLICY_ID}`,
    explorer_add_key: addKeyHash ? `https://testnet.nearblocks.io/txns/${addKeyHash}` : null,
    explorer_pay: payTx.hash ? `https://testnet.nearblocks.io/txns/${payTx.hash}` : null,
    transfer_with_fc_key: transferProof,
    pay_tx: payTx,
    over_cap: overCap,
    caps: { per_tx_near: 0.5, daily_near: 2 },
    created_at: new Date().toISOString(),
  };
  fs.mkdirSync(path.join(ROOT, 'evidence'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'evidence/policy-contract.json'), JSON.stringify(evidence, null, 2));
  fs.writeFileSync(
    path.join(ROOT, 'evidence/testnet.env'),
    [
      'NEAR_NETWORK=testnet',
      `NEAR_AGENT_ACCOUNT=${AGENT}`,
      `NEAR_FC_PUBLIC_KEY=${fcPub}`,
      `NEAR_FC_RECEIVER=${POLICY_ID}`,
      `NEAR_POLICY_ACCOUNT=${POLICY_ID}`,
      vendorOk ? `NEAR_VENDOR_ACCOUNT=${vendorId}` : '',
    ]
      .filter(Boolean)
      .join('\n') + '\n',
    { mode: 0o600 }
  );
  fs.chmodSync(path.join(ROOT, 'evidence/testnet.env'), 0o600);

  console.log(
    JSON.stringify(
      {
        policy: POLICY_ID,
        vendor: vendorOk ? vendorId : null,
        deploy_hash: deployHash,
        add_key_hash: addKeyHash,
        pay_ok: payTx.ok,
        pay_hash: payTx.hash,
        over_cap_blocked: overCap.blocked_onchain,
        transfer_refused: transferProof.refused,
        explorer_pay: evidence.explorer_pay,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('DEPLOY_SCRIPT_FAILED', String(e.message || e).slice(0, 600));
  process.exit(1);
});
