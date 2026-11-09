'use strict';
const { SpendPolicy } = require('../lib/policy');
const { runPayment, attackDemo } = require('../lib/agent');

const policy = new SpendPolicy({ perTxNear: 1, dailyNear: 5 });
console.log('GOOD', runPayment({ policy, payee: 'intents.near', amountNear: 0.25, priorInteractions: 3 }).verdict);
console.log('CAP', runPayment({ policy, payee: 'intents.near', amountNear: 9, priorInteractions: 3 }).verdict);
console.log('ATTACK', attackDemo(policy).verdict);
