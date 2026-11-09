# AgentGuard — GoalWorld on NEAR (testnet)

**Hackathon:** [NEAR HACKATHON](https://nearhackathon.com/) · deadline 2026-11-14 23:59 UTC (**15 Nov 00:59 Rome**)  
**Tracks:** `agents` + `security`  
**Network:** **testnet only** (free). Mainnet payout `.near` = Nico later (placeholder below).

## Baseline / disclosures (HACKATHON.md Q-002/Q-005)

- Patterns inspired by `TheNeuralWars/goalchain-agentpay` (HashKey) — **that repo is not modified**.
- Hermes fleet spend-gate ideas; UI tokens from GoalWorld cinematic demos.
- Libraries: `near-api-js`, Node 20+ fetch; AI planner via OmniRoute `free-smart` (local).
- AI-written code: most of this pack (disclosed).

## Do X → see Y (machine reader)

```bash
npm install
npm test
npm run setup:testnet    # free faucet account + FC key → ~/.near-credentials/testnet (600)
set -a; source evidence/testnet.env; set +a
export OMNI_API_KEY=…    # hermes-fleet / OmniRoute key via vault-run — never commit
npm start                # http://127.0.0.1:3091
```

| Do | See |
| --- | --- |
| `GET /api/health` | `network:testnet`, `agent_account`, FC key `can_transfer_near:false` |
| `POST /api/pay` `{"payee":"wrap.near","amount_near":0.2}` | Counterparty `view_account` + dry 1Click price (or `no price`) + receipt |
| `POST /api/pay` `{"payee":"scam.near","amount_near":1}` | `BLOCKED` / `counterparty_block` |
| `POST /api/pay` `{"amount_near":3,"payee":"wrap.near"}` | `BLOCKED` / `per_tx_cap` |
| `POST /api/pay` `{"demo":"attack"}` | LLM (if key) or direct block on `scam.near` |
| `POST /api/quote` `{}` | Real `dry:true` 1Click quote fields — never fabricated |
| evidence/testnet-account.json | explorer account + addKey tx; FC Transfer refused |

## Honesty

- Testnet RPC + real AddKey / FC key. **No mainnet.**
- 1Click quotes are `dry:true` only; if API fails → **no price** (never invent).
- Mainnet payout field for submit form: `MAINNET_PAYOUT_NEAR=` placeholder in SUBMIT_DRAFT (Nico fills later).

## License

MIT.
