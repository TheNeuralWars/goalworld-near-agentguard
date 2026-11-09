#!/usr/bin/env node
'use strict';
const { runPayment, attackDemo } = require('../lib/agent');
const { describeFunctionCallKey } = require('../lib/keys');
const { SpendPolicy } = require('../lib/policy');

async function main() {
  const policy = new SpendPolicy({ perTxNear: 0.5, dailyNear: 2, warnNear: 0.4 });
  const key = describeFunctionCallKey({
    accountId: process.env.NEAR_AGENT_ACCOUNT || 'gwagent894bd1e3.testnet',
    receiverId: process.env.NEAR_FC_RECEIVER || 'policy.gwagent894bd1e3.testnet',
    publicKey: process.env.NEAR_FC_PUBLIC_KEY || null,
    methodNames: ['pay'],
  });
  const vendor = process.env.NEAR_VENDOR_ACCOUNT || 'gwvendor4a20f8.testnet';
  process.env.NEAR_LIVE_CHAIN = process.env.NEAR_LIVE_CHAIN || '0';
  console.log('ATTACK', (await attackDemo(policy, process.env.LLM_API_KEY || process.env.OMNI_API_KEY || null)).verdict);
  console.log('CAP', (await runPayment({ policy, key, payee: vendor, amountNear: 9, skipQuote: true })).verdict);
  const q = await runPayment({ policy, key, payee: vendor, amountNear: 0.2, skipQuote: false });
  console.log('QUOTE', q.quote?.ok ? `live 1Click dry: ${q.quote.price?.in} → ${q.quote.price?.out}` : `no_price ${q.quote?.reason || ''}`);
  console.log('GOOD', q.verdict, q.receipt?.status, q.receipt?.tx_hash || '');
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
