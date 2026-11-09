'use strict';
const { SpendPolicy } = require('../lib/policy');
const { runPayment, attackDemo } = require('../lib/agent');
const { describeFunctionCallKey } = require('../lib/keys');
const { quoteIntent } = require('../lib/intents');

(async () => {
  const policy = new SpendPolicy({ perTxNear: 1, dailyNear: 5 });
  const key = describeFunctionCallKey({
    accountId: process.env.NEAR_AGENT_ACCOUNT || 'demo',
    receiverId: 'wrap.near',
  });
  console.log('ATTACK', (await attackDemo(policy, null)).verdict);
  console.log('CAP', (await runPayment({ policy, key, payee: 'wrap.near', amountNear: 9, skipQuote: true })).verdict);
  const q = await quoteIntent({});
  console.log('QUOTE', q.ok ? q.price : q.reason);
})();
