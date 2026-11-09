'use strict';
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { server } = require('../server');

let base;
before(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => new Promise((r) => server.close(r)));

describe('server', () => {
  it('health', async () => {
    const h = await fetch(`${base}/api/health`).then((x) => x.json());
    assert.equal(h.ok, true);
    assert.deepEqual(h.tracks, ['agents', 'security']);
    assert.equal(h.key.can_transfer_near, false);
    assert.equal(h.network, 'testnet');
  });
  it('pay attack', async () => {
    const r = await fetch(`${base}/api/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demo: 'attack' }),
    }).then((x) => x.json());
    assert.equal(r.verdict, 'BLOCKED');
  });
  it('malformed json → 400', async () => {
    const res = await fetch(`${base}/api/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });
    assert.equal(res.status, 400);
  });
  it('ui', async () => {
    const html = await fetch(`${base}/`).then((x) => x.text());
    assert.match(html, /AgentGuard/);
  });
});
