const demos = {
  good: { payee: 'gwvendor4a20f8.testnet', amount_near: 0.12, prior: null },
  cap: { payee: 'gwvendor4a20f8.testnet', amount_near: 0.7, prior: null },
  attack: { demo: 'attack' },
};
const $ = (id) => document.getElementById(id);

async function refresh() {
  const h = await fetch('/api/health').then((r) => r.json());
  $('badge-mode').textContent = `${(h.network || 'testnet').toUpperCase()} · ${h.live_chain ? 'LIVE CHAIN' : 'DRY'}`;
  $('badge-budget').textContent = `${h.budget.remaining_near} / ${h.budget.daily_near} NEAR left · ${h.budget.per_tx_near} NEAR/tx cap`;
  if ($('agent-line')) {
    $('agent-line').textContent = `agent ${h.agent_account || '—'} → FC ${h.key?.receiver_id || '—'} · methods ${(h.key?.method_names || []).join(',')} · cap ${h.budget.per_tx_near} NEAR/tx`;
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function render(r) {
  window.__runSeq = (window.__runSeq || 0) + 1;
  const resEl = $('results');
  resEl.hidden = false;
  const v = $('verdict');
  v.textContent = r.verdict;
  const pass = r.verdict === 'PASS' || r.verdict === 'PASS_MOCK';
  const blocked = /BLOCK|FAIL|WARN/i.test(r.verdict);
  v.className = 'verdict ' + (pass ? 'PASS' : blocked ? 'BLOCK' : 'REVISE');
  $('verdict-meta').textContent = `${r.reason || ''} · ${r.ms}ms · ${r.honesty || ''}`;

  const payeeShown = r.payee || r.receipt?.payee || '—';
  const amountShown = r.amount_near ?? r.receipt?.amount_near ?? '—';
  const txHash = r.receipt?.tx_hash || null;
  const explorerLive =
    r.receipt?.explorer_live ||
    (txHash ? `https://testnet.near.rocks/tx/${txHash}` : null);
  const explorerSelector =
    r.receipt?.explorer_selector ||
    (txHash ? `https://explorer.testnet.near.org/transactions/${txHash}` : null);
  const explorerNearblocks =
    r.receipt?.explorer ||
    (txHash ? `https://testnet.nearblocks.io/txns/${txHash}` : null);

  $('stats').innerHTML = [
    ['Payee', payeeShown],
    ['Amount', `${amountShown} NEAR`],
    ['Payee check', r.counterparty?.decision || '—'],
    ['FC receiver', r.key?.receiver_id || '—'],
    ['Transfer NEAR?', String(r.key?.can_transfer_near)],
    ['Tx hash', txHash || '— (pre-sign block)'],
  ]
    .map(([l, n]) => `<div class="stat"><span class="stat-n">${esc(n)}</span><span class="stat-l">${l}</span></div>`)
    .join('');

  let reply = '';
  if (explorerLive) {
    reply += `EXPLORER (NEAR Rocks live):\n${explorerLive}\nEXPLORER (Official Selector):\n${explorerSelector}\nEXPLORER (Nearblocks):\n${explorerNearblocks}\n\n`;
  }
  if (r.llm?.plan) {
    reply += `LLM plan: payee=${r.llm.plan.payee} amount=${r.llm.plan.amount_near}\n\n`;
  }
  reply += r.receipt
    ? `Receipt ${r.receipt.id}\n${JSON.stringify(
        {
          status: r.receipt.status,
          payee: r.receipt.payee,
          amount_near: r.receipt.amount_near,
          tx_hash: r.receipt.tx_hash,
          explorer_live: explorerLive,
          explorer_selector: explorerSelector,
          explorer_nearblocks: explorerNearblocks,
          policy_account: r.receipt.policy_account,
          note: r.receipt.note,
        },
        null,
        2
      )}`
    : `Payee=${payeeShown} · Amount=${amountShown} NEAR · ${r.spend?.reason || r.counterparty?.reasons?.join('; ') || '(no receipt)'}`;
  $('reply').textContent = reply;

  const exp = $('explorer-panel');
  if (exp) {
    if (explorerLive) {
      exp.hidden = false;
      exp.innerHTML = `<h2>Explorer (${txHash ? (pass ? 'On-Chain Success' : 'On-Chain Contract Revert') : ''})</h2>
        <a class="explorer-url" id="explorer-link" href="${esc(explorerLive)}" target="_blank" rel="noopener">${esc(explorerLive)}</a>
        <a class="explorer-url" id="explorer-selector-link" href="${esc(explorerSelector)}" target="_blank" rel="noopener" style="margin-top:8px">${esc(explorerSelector)}</a>
        <p class="hint">Live on-chain verification for tx ${esc(txHash)} on NEAR Testnet.</p>`;
    } else {
      exp.hidden = true;
      exp.innerHTML = '';
    }
  }

  const b = r.budget || {};
  const pct = b.daily_near ? Math.min(100, Math.round((b.spent_near / b.daily_near) * 100)) : 0;
  $('budget-panel').innerHTML = `
    <div class="budget-row"><span>Contract</span><span>${esc(r.onchain_policy?.policy_account || r.key?.receiver_id || 'policy.gwagent894bd1e3.testnet')}</span></div>
    <div class="budget-row"><span>Daily</span><span>${b.daily_near} NEAR</span></div>
    <div class="budget-row"><span>Per-tx</span><span>${b.per_tx_near} NEAR</span></div>
    <div class="budget-row"><span>Spent</span><span>${b.spent_near} NEAR</span></div>
    <div class="budget-row"><span>Remaining</span><span>${b.remaining_near} NEAR</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div>`;
  $('timeline').innerHTML = (r.timeline || [])
    .map(
      (t) => `<li class="t ${t.status}">
      <span class="t-step">${t.step}</span>
      <div><div class="t-head">${esc(t.kind)}</div><div class="t-why">${esc(t.detail || '')}${t.explorer ? `<div class="t-url">${esc(t.explorer)}</div>` : ''}</div></div>
      <span class="chip ${/block|fail|refused/i.test(t.status) ? 'blocked' : 'allowed'}">${esc(t.status)}</span>
    </li>`
    )
    .join('');

  resEl.dataset.runSeq = String(window.__runSeq);
  resEl.dataset.verdict = r.verdict || '';
  resEl.dataset.reason = r.reason || '';
  resEl.dataset.payee = String(payeeShown);
  resEl.dataset.amount = String(amountShown);
  resEl.dataset.tx = txHash || '';

  refresh();
  return { explorer: explorerLive, verdict: r.verdict, tx: txHash };
}

async function run(body) {
  $('run').disabled = true;
  $('run').textContent = 'Signing on testnet...';
  const resEl = $('results');
  if (resEl) {
    resEl.hidden = true;
    resEl.dataset.runSeq = '';
    resEl.dataset.tx = '';
    resEl.dataset.verdict = '';
  }
  const pendingRow = $('pending-row');
  if (pendingRow) {
    pendingRow.hidden = false;
    const txt = $('pending-text');
    if (txt) {
      txt.textContent = `Submitting pay(${body.amount_near || body.amount || '...'} NEAR) to policy contract on testnet...`;
    }
  }
  try {
    const r = await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((x) => x.json());
    return render(r);
  } finally {
    $('run').disabled = false;
    $('run').textContent = 'Run guard';
    if (pendingRow) {
      pendingRow.hidden = true;
    }
  }
}

document.querySelectorAll('.demo').forEach((btn) => {
  btn.addEventListener('click', () => {
    const d = demos[btn.dataset.demo];
    if (d.payee) {
      $('payee').value = d.payee;
      $('amount').value = d.amount_near;
    }
    run(d);
  });
});
$('run').addEventListener('click', () =>
  run({ payee: $('payee').value.trim(), amount_near: Number($('amount').value), prior: null })
);
refresh().catch(console.error);
