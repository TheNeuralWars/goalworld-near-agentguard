'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { SpendPolicy } = require('./lib/policy');
const { createFunctionCallKey } = require('./lib/keys');
const { runPayment, attackDemo } = require('./lib/agent');
const { checkCounterparty } = require('./lib/counterparty');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3091);
const publicDir = path.join(__dirname, 'public');

const policy = new SpendPolicy({
  perTxNear: Number(process.env.PER_TX_NEAR || 1),
  dailyNear: Number(process.env.DAILY_SPEND_NEAR || 5),
});
const key = createFunctionCallKey();

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
    return send(res, 200, {
      ok: true,
      service: 'goalworld-near-agentguard',
      mode: process.env.NEAR_MODE || 'mock',
      network: process.env.NEAR_NETWORK || 'testnet',
      tracks: ['agents', 'security'],
      budget: policy.snapshot(),
      key: {
        type: key.type,
        receiver_id: key.receiver_id,
        method_names: key.method_names,
        can_transfer_near: key.can_transfer_near,
      },
      honesty: 'MOCK Intents dry-run — no mainnet tx; payout .near not invented',
      hackathon: 'NEAR HACKATHON 2026',
    });
  }

  if (req.method === 'GET' && p === '/api/budget') return send(res, 200, policy.snapshot());
  if (req.method === 'GET' && p === '/api/key') {
    return send(res, 200, key);
  }

  if (req.method === 'POST' && p === '/api/counterparty') {
    const raw = await readBody(req);
    const body = raw ? JSON.parse(raw) : {};
    return send(res, 200, checkCounterparty(body.account_id, { priorInteractions: body.prior || 0 }));
  }

  if (req.method === 'POST' && p === '/api/pay') {
    const raw = await readBody(req);
    const body = raw ? JSON.parse(raw) : {};
    if (body.demo === 'attack') return send(res, 200, attackDemo(policy));
    const result = runPayment({
      policy,
      key,
      payee: body.payee || 'intents.near',
      amountNear: body.amount_near ?? 0.25,
      token: body.token || 'NEAR',
      toToken: body.to_token || 'USDC',
      priorInteractions: body.prior || 2,
      forceHuman: Boolean(body.force_human),
    });
    return send(res, 200, result);
  }

  let filePath = p === '/' ? path.join(publicDir, 'index.html') : path.join(publicDir, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
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

module.exports = { server, policy, key };
