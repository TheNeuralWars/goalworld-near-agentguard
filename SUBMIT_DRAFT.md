# NEAR HACKATHON submission draft — NOT submitted

Deadline: **2026-11-15 00:59 Europe/Rome** (= 14 Nov 23:59 UTC).  
API: `POST https://nearhackathon.com/api/applications` — only after Nico confirms exact payload.

## Payload draft (placeholders marked)

```json
{
  "requestId": "(uuidgen at submit time — reuse on retries)",
  "projectName": "AgentGuard — GoalWorld on NEAR",
  "leadName": "Diego Nicolas Lopez Del Bel",
  "email": "nico@goalworld.fun",
  "size": "1",
  "tracks": ["agents", "security"],
  "nearAddress": "«NICO PROVIDES .near — never invent»",
  "projectUrl": "https://github.com/TheNeuralWars/goalworld-near-agentguard",
  "demoUrl": "«X post URL after Nico/Grok Bot publish»",
  "idea": "GoalWorld AgentGuard on NEAR: Hermes agents earn/spend under human policy. Function-call keys scoped to intents.near cannot transfer native NEAR or rotate keys; spend caps and a counterparty allow/warn/block check stop drain and scam payees; dry NEAR Intents quotes settle a tool/API payment path with a receipt. Public smoke: constrain an agent wallet → block scam.near → approve one dry intent → receipt in UI. Built solo for NEAR HACKATHON. Mock labelled — no mainnet spend in the demo.",
  "consent": true
}
```

## X demo post draft (Grok Bot posts only with Nico OK)

> Agents with money need brakes. AgentGuard gives Hermes a NEAR function-call key + spend caps + counterparty checks, then a dry Intents quote — full-access stays with the human. Built for NEAR HACKATHON.  
> Demo + repo in thread.  
> @NEARProtocol #NEARHackathon

## Hard stops

- No submit without Nico OK on exact JSON.
- No public repo until October `REVIEW: approved` + Nico OK.
- No X post without Nico OK.
- Never create/invent `.near` payout account.
