# NEAR HACKATHON — STATUS

**REVIEW: pending** · October re-review target ≤ 13 Nov Rome  
**Build target:** 12 Nov 18:00 Rome · **Deadline submit:** 15 Nov 00:59 Rome

## Changelog vs October `changes_requested`

| Item | Fix | Evidence |
| --- | --- | --- |
| P0-a Real testnet | `near-api-js` setup: faucet account + FC AddKey + Transfer refusal | `scripts/setup_testnet.js`, `evidence/testnet-account.json` |
| P0-a On-chain payee | `view_account` / access keys via RPC | `lib/near_rpc.js`, `lib/counterparty.js` |
| P0-b 1Click dry | Real `POST 1click…/v0/quote` dry:true; else no price | `lib/intents.js`, `test/intents.test.js` |
| P0-c LLM | OmniRoute `free-smart` structured plan; policy still in code | `lib/llm.js`, `/api/pay` `{task}` |
| P1 prior=2 hole | `priorInteractions` default **null** (never 2) | `server.js`, agent tests |
| P1 reason codes | `token_allowlist` / `per_tx_cap` / `daily_cap` | `lib/policy.js` |
| P1 README | disclosures + do X→see Y | `README.md` |
| Payout | Placeholder only — Nico mainnet `.near` later | `SUBMIT_DRAFT.md` `MAINNET_PAYOUT_NEAR` |

## Needs from Nico

1. Mainnet `.near` payout (form) — later; leave placeholder.
2. OK public repo after October approved.
3. OK X demo post + video host.
4. Confirm exact submit JSON (`leadName` Diego Nicolas Lopez Del Bel kept).

## Hard limits

testnet free OK (Nico confirmed) · no mainnet · no submit · no public · no X · AgentPay untouched
