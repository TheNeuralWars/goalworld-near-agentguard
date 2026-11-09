# Architecture — AgentGuard (NEAR)

```
UI / curl
  → server.js /api/pay
      → counterparty.check   (blocklist / score)
      → policy.check         (per-tx + daily)
      → human warn gate
      → keys.assertCanSign   (FC key scope)
      → intents.quote (dry)
      → intents.execute (mock_settled only if dry)
      → policy.record receipt
```

## Why FC keys

A NEAR function-call access key can call one contract’s methods with a gas allowance. It **cannot** transfer native NEAR or add keys. The human keeps full-access on the treasury account; the agent holds only the FC key scoped to `intents.near` methods `quote` / `execute`.

## Attack demo

Prompt-injected agent attempts `payee=scam.near` with a large amount → counterparty `block` → no quote, no receipt.
