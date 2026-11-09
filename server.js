'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { SpendPolicy } = require('./lib/policy');
const { describeFunctionCallKey } = require('./lib/keys');
const { runPayment, runAgentTask, attackDemo } = require('./lib/agent');
const { checkCounterparty } = require('./lib/counterparty');
const { quoteIntent } = require('./lib/intents');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3091);
const publicDir = path.join(__dirname, 'public');

const policy = new SpendPolicy({
  perTxNear: Number(process.env.PER_TX_NEAR || 1),
  dailyNear: Number(process.env.DAILY_SPEND_NEAR || 5),
});

function loadKey() {
  return describeFunctionCallKey({
    accountId: process.env.NEAR_AGENT_ACCOUNT || 'unconfigured',
    receiverId: process.env.NEAR_FC_RECEIVER || 'wrap.near',
    publicKey: process.env.NEAR_FC_PUBLIC_KEY || null,
    methodNames: ['ft_transfer', 'storage_deposit', 'near_deposit'],
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

function send(res, code, body, type = 'application/json') {
  const data = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', (c) => {
      n += c.length;
      if (n > 1e6) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const p = url.pathname.replace(/\/$/, '') || '/';

  if (req.method === 'GET' && (p === '/api/health' || p === '/health')) {
    const key = loadKey();
    return send(res, 200, {
      ok: true,
      service: 'goalworld-near-agentguard',
      mode: process.env.NEAR_MODE || 'testnet',
      network: process.env.NEAR_NETWORK || 'testnet',
      rpc: process.env.NEAR_RPC_URL || 'https://rpc.testnet.near.org',
      agent_account: process.env.NEAR_AGENT_ACCOUNT || null,
      tracks: ['agents', 'security'],
      budget: policy.snapshot(),
      key: {
        type: key.type,
        account_id: key.account_id,
        receiver_id: key.receiver_id,
        method_names: key.method_names,
        can_transfer_near: key.can_transfer_near,
        public_key: key.public_key,
      },
      omni: Boolean(process.env.OMNI_API_KEY),
      honesty: 'Testnet + dry 1Click — no mainnet; no fabricated prices',
      hackathon: 'NEAR HACKATHON 2026',
    });
  }

  if (req.method === 'GET' && p === '/api/budget') return send(res, 200, policy.snapshot());
  if (req.method === 'GET' && p === '/api/key') return send(res, 200, loadKey());

  if (req.method === 'POST' && p === '/api/counterparty') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const prior =
        body.prior === undefined || body.prior === null ? null : Number(body.prior);
      return send(res, 200, await checkCounterparty(body.account_id, { priorInteractions: prior }));
    } catch (e) {
      return send(res, 400, { error: String(e.message || e) });
    }
  }

  if (req.method === 'POST' && p === '/api/quote') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const q = await quoteIntent(body);
      return send(res, q.ok ? 200 : 502, q);
    } catch (e) {
      return send(res, 502, { ok: false, reason: String(e.message || e), price: null });
    }
  }

  if (req.method === 'POST' && p === '/api/pay') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const key = loadKey();
      if (body.demo === 'attack') {
        return send(res, 200, await attackDemo(policy, process.env.OMNI_API_KEY));
      }
      if (body.task) {
        return send(
          res,
          200,
          await runAgentTask({
            policy,
            key,
            task: body.task,
            apiKey: process.env.OMNI_API_KEY,
          })
        );
      }
      const prior =
        body.prior === undefined || body.prior === null ? null : Number(body.prior);
      const result = await runPayment({
        policy,
        key,
        payee: body.payee || process.env.NEAR_AGENT_ACCOUNT || 'wrap.testnet',
        amountNear: body.amount_near ?? 0.25,
        token: body.token || 'NEAR',
        priorInteractions: prior,
        forceHuman: Boolean(body.force_human),
      });
      return send(res, 200, result);
    } catch (e) {
      return send(res, 400, { error: String(e.message || e) });
    }
  }

  let filePath =
    p === '/'
      ? path.join(publicDir, 'index.html')
      : path.join(publicDir, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(publicDir)) return send(res, 403, { error: 'forbidden' });
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, { error: 'not found' });
    send(res, 200, data.toString('utf8'), MIME[path.extname(filePath)] || 'application/octet-stream');
  });
}

const server = http.createServer((req, res) => {
  handler(req, res).catch((e) => send(res, 500, { error: String(e.message || e) }));
});

if (require.main === module) {
  server.listen(PORT, HOST, () => console.log(`near-agentguard http://${HOST}:${PORT}`));
}

module.exports = { server, policy };
