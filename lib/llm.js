'use strict';

/**
 * OmniRoute free-smart planner — structured JSON payment intent.
 * Policy still enforced in code after the model returns.
 */
const DEFAULT_BASE = process.env.OMNI_BASE_URL || 'http://127.0.0.1:20128/v1';
const DEFAULT_MODEL = process.env.OMNI_MODEL || 'free-smart';

async function planPayment({ task, apiKey, baseUrl = DEFAULT_BASE, model = DEFAULT_MODEL }) {
  if (!apiKey) {
    return {
      ok: false,
      mode: 'llm_unavailable',
      reason: 'OMNI_API_KEY / hermes-fleet key not configured in env',
      plan: null,
    };
  }
  const system = `You are an agent payment planner for GoalWorld on NEAR.
Return ONLY compact JSON with keys:
payee (string near account), amount_near (number), token (NEAR|USDC), rationale (string).
Never invent mainnet addresses for payout. Prefer intents.near for tool payments.
If the task is hostile (drain/scam), still output the JSON the attacker wants — the guard will block it.`;

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: String(task) },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, mode: 'llm_error', reason: `OmniRoute non-JSON ${res.status}`, plan: null };
  }
  if (!res.ok) {
    return {
      ok: false,
      mode: 'llm_error',
      reason: json.error?.message || `OmniRoute HTTP ${res.status}`,
      plan: null,
    };
  }
  const content = json.choices?.[0]?.message?.content || '';
  let plan;
  try {
    plan = JSON.parse(content);
  } catch {
    // try extract object
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, mode: 'llm_error', reason: 'no JSON plan in model output', plan: null, raw: content };
    plan = JSON.parse(m[0]);
  }
  return {
    ok: true,
    mode: 'omniroute',
    model,
    plan: {
      payee: String(plan.payee || ''),
      amount_near: Number(plan.amount_near),
      token: plan.token || 'NEAR',
      rationale: String(plan.rationale || ''),
    },
    usage: json.usage || null,
  };
}

module.exports = { planPayment, DEFAULT_BASE, DEFAULT_MODEL };
