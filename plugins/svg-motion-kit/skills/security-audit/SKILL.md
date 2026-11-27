---
name: security-audit
description: Find frontend security mistakes visible in the code. Covers API keys and tokens in source (always masked), committed .env files, secrets exposed through NEXT_PUBLIC_/VITE_ variables, XSS sinks (dangerouslySetInnerHTML, v-html, innerHTML, eval) including uploaded SVG rendered as markup, tokens in localStorage, client-only route guards, Next API routes and server actions that write without an auth check, unverified webhooks, open redirects, missing security headers (CSP, frame, referrer), public source maps, and a missing lockfile. Use for "security check", "is my app secure", "check for leaked keys", "XSS", "ตรวจความปลอดภัย", "มี key หลุดไหม". A code-level checklist, not a penetration test.
---

# security-audit

Catch the frontend security mistakes that leak secrets or open XSS, with evidence. Never claim the app is "secure".

**Language:** reply in the language the user wrote in, Thai or English. Keep file names, code and CLI output as they are.

## 1. Run it

```bash
node "<skill-dir>/scripts/security-audit.mjs" "<project>"            # summary
node "<skill-dir>/scripts/security-audit.mjs" "<project>" --write    # also saves .svg-motion/security-audit.md + .json
```

It is read-only and makes no network calls. It runs `git ls-files` to know which files are committed. Secret values are **always masked** in output and reports. Checks are listed in [references/checks.md](references/checks.md).

## 2. Handle secrets carefully

- **Never print, copy, log or paste a secret value.** That includes the chat, commit messages and files. Refer to it by file:line and type.
- A real secret that was committed means **rotate first**, then remove it. Deleting the line doesn't help, because git history and clones still have it.
- A local `.env` that isn't committed is fine; that's where secrets belong. The script doesn't report those.

## 3. Verify before reporting

- **`sec.api.no-auth` and `sec.action.no-auth`:** open the file. Auth might live in a wrapper, a layout, middleware or a helper the regex missed. Report only what you confirm, and say how many you dropped.
- **`sec.xss.dangerous-html`:** where does the HTML come from? Your own static strings are fine. CMS or user content needs sanitising.
- **Header findings:** the host or CDN may set the headers. If a deployed URL is known and the user agrees, check the live headers. Otherwise say they are "not configured in the repo", not "missing in production".

## 4. Report

- Start with **what this is**: a code-level checklist, not a pentest.
- Then the score and **"Do these first"**: committed or leaked secrets, unauthenticated writes, then XSS.
- For each finding, give the location, the risk in plain words (what an attacker could do), and the fix.
- End with what wasn't covered:
  - dependency vulnerabilities, via `npm audit`. Offer to run it, since it needs the network, so ask first.
  - database rules, such as Supabase RLS
  - backend and infrastructure

## 5. Fix (only when asked)

| Finding | Fix |
|---|---|
| Leaked secret | Tell the user to rotate it at the provider first. Then move it to a server-only env var, `git rm --cached` committed env files, and add `.env*` to `.gitignore`. Purging history is the user's call, because it rewrites history. |
| `sec.env.public-secret` | Rename it without the public prefix and use it only in server code. |
| XSS | Render as text, or sanitise with DOMPurify. Show uploaded SVG with `<img src>`. |
| No auth on a route or action | Add the project's own session check at the top and return 401/403. Validate input with the project's schema library, if it has one. |
| Open redirect | Allow only relative paths (`startsWith("/") && !startsWith("//")`). |
| Headers | Add them in `next.config` `headers()` or the host config. Start CSP in `Content-Security-Policy-Report-Only` and tighten it, because a strict CSP can break third-party scripts. |

Fix one item at a time, show each diff, and re-run the audit. Never weaken an existing security control to make a finding go away.
