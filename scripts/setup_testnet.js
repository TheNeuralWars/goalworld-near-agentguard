#!/usr/bin/env node
'use strict';
/**
 * Free NEAR testnet agent account + function-call access key.
 * Credentials → ~/.near-credentials/testnet/*.json mode 600 (never printed).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

async function main() {
  const nearAPI = require('near-api-js');
  const { keyStores, KeyPair, connect, utils } = nearAPI;

  const credDir = path.join(os.homedir(), '.near-credentials', 'testnet');
  fs.mkdirSync(credDir, { recursive: true, mode: 0o700 });

  const suffix = crypto.randomBytes(4).toString('hex');
  const accountId = `gwagent${suffix}.testnet`;
  const fullKeyPair = KeyPair.fromRandom('ed25519');
  const fcKeyPair = KeyPair.fromRandom('ed25519');
  const fullPub = fullKeyPair.getPublicKey().toString();
  const fcPub = fcKeyPair.getPublicKey().toString();

  // 1) Create via official helper faucet
  const helperRes = await fetch('https://helper.testnet.near.org/account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newAccountId: accountId, newAccountPublicKey: fullPub }),
  });
  const helperText = await helperRes.text();
  if (!helperRes.ok) {
    console.error('FAUCET_FAILED', helperRes.status, helperText.slice(0, 240));
    process.exit(1);
  }

  const keyStore = new keyStores.UnencryptedFileSystemKeyStore(credDir);
  await keyStore.setKey('testnet', accountId, fullKeyPair);

  const near = await connect({
    networkId: 'testnet',
    nodeUrl: process.env.NEAR_RPC_URL || 'https://rpc.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org',
    explorerUrl: 'https://testnet.nearblocks.io',
    keyStore,
  });

  let account;
  for (let i = 0; i < 20; i++) {
    try {
      account = await near.account(accountId);
      await account.getAccountBalance();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  if (!account) {
    console.error('ACCOUNT_NOT_VISIBLE', accountId);
    process.exit(1);
  }

  // 2) Add function-call key scoped to wrap.near
  let addKeyHash = null;
  try {
    const outcome = await account.addKey(
      fcPub,
      'wrap.near',
      ['ft_transfer', 'storage_deposit', 'near_deposit'],
      utils.format.parseNearAmount('0.25')
    );
    addKeyHash = outcome?.transaction?.hash || outcome?.transaction_outcome?.id || null;
  } catch (e) {
    console.error('ADD_FC_KEY_FAILED', String(e.message || e).slice(0, 300));
    process.exit(1);
  }

  const fcPath = path.join(credDir, `${accountId}.fc.json`);
  fs.writeFileSync(
    fcPath,
    JSON.stringify(
      {
        account_id: accountId,
        public_key: fcPub,
        private_key: fcKeyPair.toString(),
        receiver_id: 'wrap.near',
        method_names: ['ft_transfer', 'storage_deposit', 'near_deposit'],
      },
      null,
      2
    ),
    { mode: 0o600 }
  );
  fs.chmodSync(fcPath, 0o600);
  try {
    fs.chmodSync(path.join(credDir, `${accountId}.json`), 0o600);
  } catch {
    /* keystore may use different filename */
  }

  // 3) Prove FC key cannot Transfer native NEAR
  const fcStore = new keyStores.InMemoryKeyStore();
  await fcStore.setKey('testnet', accountId, fcKeyPair);
  const nearFc = await connect({
    networkId: 'testnet',
    nodeUrl: process.env.NEAR_RPC_URL || 'https://rpc.testnet.near.org',
    keyStore: fcStore,
  });
  let transferProof = { refused: false, error: null, hash: null };
  try {
    const fcAccount = await nearFc.account(accountId);
    const out = await fcAccount.sendMoney('wrap.near', utils.format.parseNearAmount('0.001'));
    transferProof = {
      refused: false,
      error: 'UNEXPECTED_SUCCESS',
      hash: out?.transaction?.hash || null,
    };
  } catch (e) {
    const msg = String(e.message || e);
    transferProof = {
      refused: true,
      error: msg.slice(0, 500),
      hash: null,
      note: 'Expected: FC key cannot Transfer',
    };
  }

  const evidence = {
    network: 'testnet',
    account_id: accountId,
    explorer_account: `https://testnet.nearblocks.io/address/${accountId}`,
    explorer_add_key_tx: addKeyHash ? `https://testnet.nearblocks.io/txns/${addKeyHash}` : null,
    add_key_hash: addKeyHash,
    fc_public_key: fcPub,
    fc_receiver: 'wrap.near',
    transfer_with_fc_key: transferProof,
    created_at: new Date().toISOString(),
  };
  const outDir = path.join(__dirname, '..', 'evidence');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'testnet-account.json'), JSON.stringify(evidence, null, 2));
  fs.writeFileSync(
    path.join(outDir, 'testnet.env'),
    `NEAR_NETWORK=testnet\nNEAR_AGENT_ACCOUNT=${accountId}\nNEAR_FC_PUBLIC_KEY=${fcPub}\nNEAR_FC_RECEIVER=wrap.near\n`
  );
  fs.chmodSync(path.join(outDir, 'testnet.env'), 0o600);

  console.log(
    JSON.stringify(
      {
        account_id: accountId,
        explorer_account: evidence.explorer_account,
        explorer_add_key_tx: evidence.explorer_add_key_tx,
        fc_public_key: fcPub,
        transfer_refused: transferProof.refused === true,
        evidence: 'evidence/testnet-account.json',
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('SETUP_FAILED', String(e.message || e).slice(0, 400));
  process.exit(1);
});
