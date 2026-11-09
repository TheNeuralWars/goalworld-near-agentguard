'use strict';

/** Spend-cap policy: per-tx, daily, token allowlist, human warn/block. */
class SpendPolicy {
  constructor({ perTxNear = 1, dailyNear = 5, allowTokens = ['NEAR', 'USDC'] } = {}) {
    this.perTxNear = Number(perTxNear);
    this.dailyNear = Number(dailyNear);
    this.allow = new Set(allowTokens);
    this.day = utcDay();
    this.spentNear = 0;
    this.receipts = [];
  }

  _roll() {
    const d = utcDay();
    if (d !== this.day) {
      this.day = d;
      this.spentNear = 0;
    }
  }

  remaining() {
    this._roll();
    return round4(Math.max(0, this.dailyNear - this.spentNear));
  }

  check({ token = 'NEAR', amountNear }) {
    this._roll();
    const amount = Number(amountNear);
    if (!this.allow.has(token)) return { ok: false, decision: 'block', reason: `token ${token} not allowlisted` };
    if (!(amount > 0)) return { ok: false, decision: 'block', reason: 'amount must be > 0' };
    if (amount > this.perTxNear) {
      return { ok: false, decision: 'block', reason: `exceeds per-tx cap ${this.perTxNear} ${token}` };
    }
    if (this.spentNear + amount > this.dailyNear) {
      return {
        ok: false,
        decision: 'block',
        reason: `exceeds daily cap (spent ${round4(this.spentNear)} / ${this.dailyNear})`,
      };
    }
    if (amount > this.perTxNear * 0.8) {
      return { ok: true, decision: 'warn', reason: 'near per-tx ceiling — human confirm recommended', remaining: this.remaining() };
    }
    return { ok: true, decision: 'allow', reason: 'within caps', remaining: this.remaining() };
  }

  record(receipt) {
    this._roll();
    this.spentNear = round4(this.spentNear + Number(receipt.amount_near || 0));
    this.receipts.push(receipt);
    return receipt;
  }

  snapshot() {
    this._roll();
    return {
      day: this.day,
      per_tx_near: this.perTxNear,
      daily_near: this.dailyNear,
      spent_near: round4(this.spentNear),
      remaining_near: this.remaining(),
      allow_tokens: [...this.allow],
      receipts: this.receipts.slice(-20),
    };
  }
}

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}
function round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

module.exports = { SpendPolicy };
