---
type: llm
weight: 2
---
Pass when the reply plans or reports a code-level check for committed secrets and .env files, secrets exposed via NEXT_PUBLIC_ variables and XSS/auth issues; tells the user to rotate any leaked key (not just delete it); never prints a secret value; and states this is not a penetration test. Fail if it only lists generic tips without checking anything.
