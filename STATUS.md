# STATUS — NEAR AgentGuard

**REVIEW: approved (October, v4, 2026-11-13)** · Live 1080p UI capture v4 (supersedes v3).
Live 1080p UI screen capture v3 recorded under Xvfb (`x11grab` with real Chromium address bar), zero route interception or mocks, real on-chain `get_config` view call (`0.5 NEAR` per-tx cap, `2 NEAR` daily cap), visible typing + DOM assertions per scene, Chrome automation infobar suppressed (`ignoreDefaultArgs: ['--enable-automation']`), explicit pending state ("Signing on testnet..." + spinner) with no old verdict during in-flight runs, and live explorer pages on `explorer.testnet.near.org` and `testnet.near.rocks`.

## Demo Video Deliverables (v4, current)
- Repo: `media/near_agentguard_demo_live_20261113_v4.mp4` (also in shared artifacts `near-hackathon-2026/media/` and `near-agentguard/media/`)
- 1920x1080, H.264, silent (captions only, no AI voice) · `134.6s` · `6,465,120` bytes
- SHA-256: `97a78d1045aca1550b2271ce73c3f3e3a7055edd850a89ed7889f6b5ff0174dc`
- Recorder: `scripts/record_live_demo_1080p_v4.mjs` (real Chromium under Xvfb; zero route interception, zero setContent, zero mocks) · meta `evidence/video-record-meta-v4.json` · QA frames `evidence/video-frames-live-v4/qa-live-01..08.png`
- On-chain cap (`get_config` on `policy.gwagent894bd1e3.testnet`): `0.5 NEAR` per-tx, `2 NEAR` daily
- Transactions in the video (verified on testnet RPC):
  1. **ALLOW** `PASS` — `pay` 0.12 NEAR to `gwvendor4a20f8.testnet`: `BoDcriGQuWR2gM2dciSGibDA3LAj2S4KH4CeN4WwhYXa` — https://testnet.near.rocks/tx/BoDcriGQuWR2gM2dciSGibDA3LAj2S4KH4CeN4WwhYXa · https://testnet.nearblocks.io/txns/BoDcriGQuWR2gM2dciSGibDA3LAj2S4KH4CeN4WwhYXa
  2. **ATTACK** `BLOCKED` pre-sign (`scam.near` prompt injection, 4.5 NEAR) — no tx, 0 gas.
  3. **OVER-CAP** `BLOCKED` on-chain — `pay` 0.7 NEAR reverted by `spend_cap`: `89dpvqVp5ntrmEDQggWfmf28twR4fwga6UHF12dLscLt` — https://testnet.near.rocks/tx/89dpvqVp5ntrmEDQggWfmf28twR4fwga6UHF12dLscLt · https://testnet.nearblocks.io/txns/89dpvqVp5ntrmEDQggWfmf28twR4fwga6UHF12dLscLt
- Explorer note: `testnet.nearblocks.io` serves a Cloudflare challenge to the VPS IP, so the recording opens the live NEAR Rocks explorer and the official `explorer.testnet.near.org` selector.
- Earlier takes (v1–v3) were rejected in review and are kept outside git.

## Done
| Item | Status | Evidence |
| --- | --- | --- |
| Vault `near-mainnet-payout` | ✅ | inbox shredded |
| SUBMIT_DRAFT nearAddress | ✅ `b87adc…7df9` implicit | form allows named OR 64-hex (nearhackathon.com/HACKATHON.md) |
| spend_cap contract testnet | ✅ `policy.gwagent894bd1e3.testnet` | `get_config`: `0.5 NEAR` per-tx, `2 NEAR` daily |
| FC key scoped to `pay` | ✅ AddKey `4tj1DRne…` | `evidence/policy-contract.json` |
| Real PASS pay tx (v3 live video) | ✅ `2ymLMHXEAMpuQPagYJUctgHPMFXhEdexdpQaJMreGnyJ` | `0.12 NEAR` → `gwvendor4a20f8.testnet` |
| Attack blocked pre-sign (v3 live video) | ✅ `scam.near` `4.5 NEAR` → `BLOCKED` | `counterparty_block` + `prompt_injection_detected` |
| Over-cap blocked on-chain (v3 live video) | ✅ `Em5xspo92KJUyBm6JKYsMnQA2Ap4mHQ8KsAypyPiX9P8` | `0.7 NEAR` > `0.5 NEAR` cap → WASM trap (`ActionError`) |
| Transfer with FC | ✅ refused | `evidence/policy-contract.json` |
| Judge LLM CLI | ✅ `scripts/llm_guard_demo.js` | `README.md` |
| Dry 1Click | ✅ recaptured | `evidence/quote-dry.json` |
| Live 1080p Video Capture v3 | ✅ `8fb9a8c6…` (`134.56s`) | `media/near_agentguard_demo_live_20261113.mp4` + 8 QA frames |
| npm test | ✅ 17/17 | `test/*.test.js` |

## Still open (HITL)
1. Nico OK: public repo, X post, exact submit JSON (Nov 15 deadline).
