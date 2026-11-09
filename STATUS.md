# STATUS — NEAR AgentGuard

**REVIEW: pending** · Hermes RR1 pass (2026-11-09 19:01 UTC). On-chain spend_cap deployed; real FC pay tx; LLM attack blocked; payout id filled. Video still interim (caption cards with full URLs — need live UI screen capture for October).

## Done
| Item | Status | Evidence |
| --- | --- | --- |
| Vault `near-mainnet-payout` | ✅ | inbox shredded |
| SUBMIT_DRAFT nearAddress | ✅ `b87adc…7df9` implicit | form allows named OR 64-hex (nearhackathon.com/HACKATHON.md) |
| spend_cap contract testnet | ✅ `policy.gwagent894bd1e3.testnet` | evidence/policy-contract.json |
| FC key scoped to `pay` | ✅ AddKey `4tj1DRne…` | same |
| Real PASS pay tx | ✅ `9CQuUD8S…` → vendor `gwvendor4a20f8.testnet` | evidence/pay-good.json |
| Over-cap on-chain | ✅ blocked | policy-contract.json over_cap |
| Transfer with FC | ✅ refused | same |
| LLM good + attack | ✅ vendor 0.11 / scam.near 4.5 → BLOCKED | evidence/llm-plan-*.json, pay-llm.json |
| Judge LLM CLI | ✅ `scripts/llm_guard_demo.js` | README |
| Dry 1Click | ✅ recaptured | evidence/quote-dry.json |
| README network split | ✅ | README.md |
| npm test | ✅ 17/17 | |

## Still open
1. Re-record **live UI** screen capture (current media/ is interim caption cards with full explorer URLs — not a typed Run Guard session).
2. Nico OK: public repo, X post, exact submit JSON.
