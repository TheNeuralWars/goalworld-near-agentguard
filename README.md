# AgentGuard — GoalWorld on NEAR

**Hackathon:** [NEAR HACKATHON](https://nearhackathon.com/) (deadline 2026-11-14 23:59 UTC = **15 Nov 00:59 Rome**)  
**Tracks:** `agents` + `security`  
**Org:** TheNeuralWars / GoalWorld  

> Give Hermes agents a wallet they can *use* — not one that can drain the treasury. Function-call keys, spend caps, counterparty checks, dry NEAR Intents.

Patterns inspired by `goalchain-agentpay` (HashKey pack) — **that repo is not modified**.

## 30-second jury path

```bash
git clone <repo> && cd goalworld-near-agentguard
npm test          # all green
npm start         # http://127.0.0.1:3091
```

1. **01 · ALLOW** → `PASS_MOCK`, dry Intent receipt, FC key `can_transfer_near=false`.
2. **02 · CAP** → `BLOCKED` over per-tx.
3. **03 · ATTACK** → pay `scam.near` → `BLOCKED` (counterparty blocklist).

`GET /api/health` shows caps remaining + key scope.

## Architecture

| Piece | Role |
| --- | --- |
| `lib/keys.js` | Function-call key model (scoped receiver + methods; no transfer/add_key) |
| `lib/policy.js` | Per-tx + daily spend caps, token allowlist |
| `lib/counterparty.js` | allow / warn / block scoring + shared blocklist |
| `lib/intents.js` | Dry NEAR Intents quote/execute mock (no testnet for Intents — Q-007) |
| `lib/agent.js` | Guard loop + attack demo |
| `public/` | Cinematic UI with remaining caps |

## Honesty

- **MOCK by default.** No mainnet tx, no wallet creation, no invented `.near` payout address.
- Intents path is **dry: true** quotes only (HACKATHON.md).
- Payout `.near` for the form: **Nico provides** — never fabricated.

## Demo video

`media/near_agentguard_demo.mp4` — screen + captions, no AI voice. X demo post is drafted in `SUBMIT_DRAFT.md` for Grok Bot / Nico — **not posted**.

## License

MIT.
