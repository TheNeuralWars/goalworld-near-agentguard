'use strict';

/**
 * Real 1Click dry:true quote — never fabricate prices.
 * https://1click.chaindefuser.com/v0/quote
 */
const ONECLICK = process.env.ONECLICK_URL || 'https://1click.chaindefuser.com/v0/quote';

async function quoteIntent({
  amountYocto = '1000000000000000000000000', // 1 NEAR
  recipient = 'demo.near',
  refundTo = 'demo.near',
  originAsset = 'nep141:wrap.near',
  destinationAsset = 'nep141:usdt.tether-token.near',
} = {}) {
  const deadline = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const body = {
    dry: true,
    swapType: 'EXACT_INPUT',
    slippageTolerance: 100,
    originAsset,
    depositType: 'ORIGIN_CHAIN',
    destinationAsset,
    amount: String(amountYocto),
    recipient,
    recipientType: 'INTENTS',
    refundTo,
    refundType: 'ORIGIN_CHAIN',
    deadline,
  };
  const res = await fetch(ONECLICK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      ok: false,
      dry: true,
      mode: '1click',
      reason: `1Click non-JSON ${res.status}`,
      quote: null,
      price: null,
    };
  }
  if (!res.ok || !json.quote) {
    return {
      ok: false,
      dry: true,
      mode: '1click',
      reason: json.message || json.error || `1Click HTTP ${res.status}`,
      quote: null,
      price: null,
      raw: json,
    };
  }
  const q = json.quote;
  return {
    ok: true,
    dry: true,
    mode: '1click',
    route: 'near-intents-1click',
    request: body,
    quote: {
      amountIn: q.amountIn,
      amountInFormatted: q.amountInFormatted,
      amountInUsd: q.amountInUsd,
      amountOut: q.amountOut,
      amountOutFormatted: q.amountOutFormatted,
      amountOutUsd: q.amountOutUsd,
      minAmountOut: q.minAmountOut,
      timeEstimate: q.timeEstimate,
    },
    price: {
      // Honest: from API only
      in: `${q.amountInFormatted} (${originAsset})`,
      out: `${q.amountOutFormatted} (${destinationAsset})`,
      inUsd: q.amountInUsd,
      outUsd: q.amountOutUsd,
    },
    note: 'dry:true — no deposit address, no funds moved',
  };
}

/** If quote fails, return explicit no-price (never invent). */
function noPrice(reason) {
  return {
    ok: false,
    dry: true,
    mode: 'none',
    reason,
    quote: null,
    price: null,
    note: 'no price shown — refuse to fabricate',
  };
}

module.exports = { quoteIntent, noPrice, ONECLICK };
