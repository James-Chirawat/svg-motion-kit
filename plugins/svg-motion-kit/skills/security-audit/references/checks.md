# security-audit checks

| id | Severity | Detects | Guards against false positives |
|---|---|---|---|
| `sec.secret.<type>` | high (medium for Google keys and generic JWTs) | AWS access keys, Stripe live/test keys, GitHub, Slack, OpenAI and Anthropic tokens, Google API keys, PEM private keys, JWTs (a Supabase `service_role` JWT is high) | Values are masked. `anon` JWTs and `.env.example` files are skipped. Local `.env` files that aren't committed are skipped. |
| `sec.secret.hardcoded` | medium | `apiKey`/`secret`/`token`/`password` = 12+ character literals in code | Skips placeholders, env reads, identifier-shaped values such as `vh_admin_token`, and storage key names (`TOKEN_KEY`). |
| `sec.env.committed` | high | `.env*` tracked by git (`git ls-files`) | `.env.example`/`.sample`/`.template` are skipped. |
| `sec.env.not-ignored` | medium | `.env` files present with no `.env` rule in `.gitignore` | |
| `sec.env.public-secret` | high | `NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `NUXT_PUBLIC_`, `REACT_APP_`, `EXPO_PUBLIC_` or `GATSBY_` variables named SECRET, PRIVATE, SERVICE_ROLE, PASSWORD, ADMIN, TOKEN or WEBHOOK | PUBLISHABLE, ANON, PUBLIC_KEY, SITE_KEY, CLIENT_ID, *_URL and LIFF_ID are allowed. |
| `sec.xss.dangerous-html` | high (user-ish data) / medium | `dangerouslySetInnerHTML`, `v-html`, `{@html}` | Skipped when DOMPurify or a sanitiser is on the same lines. JSON-LD has its own check. |
| `sec.xss.json-ld` | low | JSON-LD via `JSON.stringify` without escaping `<` | |
| `sec.xss.svg-upload` | high | File input or `.text()` / `readAsText` combined with raw HTML rendering of SVG | |
| `sec.xss.dom-sink` | medium | `innerHTML`/`outerHTML` assignment, `insertAdjacentHTML`, `document.write` | Clearing assignments (`= ""`) are skipped. |
| `sec.xss.eval` | high | `eval(`, `new Function(` | |
| `sec.auth.token-storage` | medium | `localStorage`/`sessionStorage.setItem` of a token, JWT, session, access or refresh value | |
| `sec.auth.client-only-guard` | medium | `"use client"` admin, dashboard, account, settings or portal pages redirecting to login, with no `middleware.ts` | |
| `sec.api.no-auth` | high (writes) / medium | Next `route.ts` exporting POST/PUT/PATCH/DELETE with no auth evidence | Recognised auth evidence: common auth libraries, project helpers named `require*`/`ensure*`/`assert*`/`check*` + Auth/User/Session/Admin/Role/Scope…, `getCurrent*`, `forbidden()`, 401/403, and a middleware guarding `/api`. |
| `sec.api.webhook-unverified` | high | Webhook routes with no signature or HMAC verification | |
| `sec.api.public-no-ratelimit` | low | Public, auth or waitlist/contact write routes with no rate limit or CAPTCHA | These routes are not reported as `no-auth`. |
| `sec.action.no-auth` | high | `"use server"` files that write (Prisma, Drizzle, Supabase, Mongo, SQL, fs, Stripe) with no auth evidence | |
| `sec.redirect.open` | medium | `router.push`, `redirect` or `location` fed by `?next`/`redirect`/`returnTo`/`callbackUrl`… with no validation | Skipped when there is a `startsWith("/")`, URL origin check or allow-list nearby. |
| `sec.headers.*` | medium/low | CSP, frame protection, Referrer-Policy, Permissions-Policy and nosniff not found in next.config, middleware, vercel.json, netlify or server hooks | Hosts may set them, so check the live headers. |
| `sec.build.sourcemaps` | medium/low | `productionBrowserSourceMaps: true`, Vite `build.sourcemap: true` | |
| `sec.deps.no-lockfile` | low | package.json with no lockfile | |
| `sec.log.secret` | low | `console.log` of password, token, secret or authorization values | |

**Not covered:** dependency CVEs (`npm audit`, with consent), live headers, whether authorisation rules are correct, database rules (Supabase RLS, Firebase rules), and infrastructure. This is a checklist, not a penetration test.
