const demos = {
  good: { payee: 'intents.near', amount_near: 0.25, prior: 3 },
  cap: { payee: 'intents.near', amount_near: 3, prior: 3 },
  attack: { demo: 'attack' },
};
const $ = (id) => document.getElementById(id);

async function refresh() {
  const h = await fetch('/api/health').then((r) => r.json());
  $('badge-mode').textContent = (h.mode || 'mock').toUpperCase() + ' INTENTS';
  $('badge-budget').textContent = `${h.budget.remaining_near} / ${h.budget.daily_near} NEAR left`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function render(r) {
  $('results').hidden = false;
  const v = $('verdict');
  v.textContent = r.verdict;
  v.className = 'verdict ' + (r.verdict === 'PASS_MOCK' ? 'PASS' : 'REVISE');
  $('verdict-meta').textContent = `${r.reason || ''} · ${r.ms}ms · ${r.honesty || ''}`;
  $('stats').innerHTML = [
    ['Payee check', r.counterparty?.decision || '—'],
    ['FC receiver', r.key?.receiver_id || '—'],
    ['Transfer NEAR?', String(r.key?.can_transfer_near)],
  ]
    .map(([l, n]) => `<div class="stat"><span class="stat-n">${esc(n)}</span><span class="stat-l">${l}</span></div>`)
    .join('');
  $('reply').textContent = r.receipt
    ? `Receipt ${r.receipt.id}\n${JSON.stringify(r.receipt, null, 2)}`
    : r.spend?.reason || r.counterparty?.reasons?.join('; ') || '(no receipt)';
  const b = r.budget || {};
  const pct = b.daily_near ? Math.min(100, Math.round((b.spent_near / b.daily_near) * 100)) : 0;
  $('budget-panel').innerHTML = `
    <div class="budget-row"><span>Daily</span><span>${b.daily_near} NEAR</span></div>
    <div class="budget-row"><span>Per-tx</span><span>${b.per_tx_near} NEAR</span></div>
    <div class="budget-row"><span>Spent</span><span>${b.spent_near} NEAR</span></div>
    <div class="budget-row"><span>Remaining</span><span>${b.remaining_near} NEAR</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div>`;
  $('timeline').innerHTML = (r.timeline || [])
    .map(
      (t) => `<li class="t ${t.status}">
      <span class="t-step">${t.step}</span>
      <div><div class="t-head">${esc(t.kind)}</div><div class="t-why">${esc(t.detail || '')}</div></div>
      <span class="chip ${/block|refused/i.test(t.status) ? 'blocked' : 'allowed'}">${esc(t.status)}</span>
    </li>`
    )
    .join('');
  refresh();
}

async function run(body) {
  $('run').disabled = true;
  try {
    const r = await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((x) => x.json());
    render(r);
  } finally {
    $('run').disabled = false;
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
  run({ payee: $('payee').value.trim(), amount_near: Number($('amount').value), prior: 2 })
);
refresh().catch(console.error);
