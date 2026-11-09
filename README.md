# GoalWorld AgentGuard — NEAR HACKATHON

**Tracks:** `security` (+ `agents`)  
**Network split:** agent + spend_cap contract on **NEAR testnet**; 1Click intent quotes use **mainnet `dry:true`** (no funds).  
**Mainnet payout (form):** `b87adcdee86dfb5a0fa5995a99b7bc6c54a0956a4969719c01107e7bc1de7df9` (64-hex implicit; form allows named `*.near` **or** implicit — https://nearhackathon.com/HACKATHON.md).  
**leadName:** Diego Nicolas Lopez Del Bel (kept as instructed).

## What it is
Hermes agents hold a **function-call access key** scoped to an on-chain **spend_cap** policy contract (`pay` only, 0 deposit). The human keeps full access. Caps + optional allowlist are enforced **on-chain**; the JS guard still blocks bad counterparties before signing.

## Accounts (testnet)
| Role | Account |
| --- | --- |
| Agent (FC key) | `gwagent894bd1e3.testnet` |
| Policy contract | `policy.gwagent894bd1e3.testnet` |
| Vendor payee (≠ agent) | `gwvendor4a20f8.testnet` |

Evidence: `evidence/policy-contract.json`, `evidence/pay-good.json` (real tx hash), `evidence/pay-llm.json`.

## Quick start
```bash
npm ci
npm test                 # 17/17
npm run demo             # ATTACK BLOCKED · CAP BLOCKED · QUOTE dry 1Click
npm start                # http://127.0.0.1:3191
```

Live on-chain pay (uses `~/.near-credentials/testnet/*.fc.json`):
```bash
set -a; . evidence/testnet.env; set +a
NEAR_LIVE_CHAIN=1 npm run demo
```

## LLM evidence (judge-reproducible)
Any OpenAI-compatible endpoint — **not** tied to VPS localhost:
```bash
LLM_BASE_URL=https://api.openai.com/v1 \
LLM_API_KEY=sk-... \
LLM_MODEL=gpt-4o-mini \
node scripts/llm_guard_demo.js
```
Saved transcripts: `evidence/llm-plan-good.json` (valid vendor payee), `evidence/llm-plan-attack.json` + `evidence/pay-llm.json` (model emits `scam.near` 4.5 → guard **BLOCKED**).

## Do X → see Y
| Call | Expected |
| --- | --- |
| `POST /api/pay` vendor 0.12 with `NEAR_LIVE_CHAIN=1` | `PASS` + `receipt.tx_hash` on testnet explorer |
| `POST /api/pay` `scam.near` | `BLOCKED` / `counterparty_block` |
| `POST /api/pay` amount 3 | `BLOCKED` / `per_tx_cap` |
| `POST /api/pay` `{"demo":"attack"}` + LLM key | LLM plans `scam.near` → guard **BLOCKED** |
| Dry 1Click | `evidence/quote-dry.json` — mainnet quote, `dry:true`, no spend |

## Baseline / AI disclosure
Reuses GoalWorld AgentPay / Hermes human-gate patterns. Contract: Rust `near-sdk` 5 (`contracts/spend_cap`). Some glue/docs drafted with AI; on-chain txs and RPC checks are real.

## License
MIT.
