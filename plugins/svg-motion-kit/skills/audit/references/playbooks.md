# Fix playbooks

Every playbook ends the same way: show the diff, apply it after approval, re-run the area, and stop if anything fails.

## UX and accessibility

| Playbook / id | Steps |
|---|---|
| `add-error-state` (ux.states.error, polish.pages.error) | 1. Find the failing branch: the fetch `.catch`, `!res.ok`, `isError`, or the route's `error.tsx`. 2. Render a short message saying what failed and a retry (`reset()` or refetch). 3. Use **svg-motion** with the `error` template, `--no-text`, `decorative`. The message stays as real text in the page's language. |
| `add-loading-state` | Use a skeleton shaped like the content (svg-motion `loader`) or `loading.tsx` for Next routes. For forms, disable the submit button and show its pending state (`useFormStatus`). |
| `add-empty-state` / `add-not-found` | Use svg-motion `empty-state` with one sentence and the next action (a link or button). For 404, link back home and to search. |
| `add-success-state` | Replace `alert()` with an inline `role="status"` message or the project's toast. Use svg-motion `success` for important confirmations. |
| `adjust-token-contrast` | Change the token value in the theme file until it reaches the required ratio (4.5:1 for text, 3:1 for large text and UI) in light **and** dark. Recompute with ui-audit and report the new ratio. Never change individual components. |
| a11y.img-alt / input-label / icon-button / click-div / focus-outline / html-lang | Direct, minimal edits: `alt` (or `alt=""` when decorative), a `<label htmlFor>`, `aria-label`, a `<button>` instead of a clickable `div`, `focus-visible:ring-2 ring-ring`, `lang="th"`. |

## Performance

| Playbook / id | Steps |
|---|---|
| `promise-all` | `const [a, b] = await Promise.all([getA(), getB()])`. Keep each call's error handling and types. |
| `next-image` | `<Image src width height alt />` (or `fill` + `sizes`). Add `priority` only to the LCP image. Allow remote hosts in `next.config` `images.remotePatterns`, and ask first. |
| perf.image.format | If the project has sharp or a script, use it. Otherwise give the exact commands (e.g. `npx @squoosh/cli --avif '{}' file.png`) and let the user run them. Never add dependencies silently. |
| perf.font.* | Use `next/font/google` with `subsets: ["thai", "latin"]`, only the weights in use, and `display: "swap"`. Remove the CDN `<link>`. |
| perf.bundle.dynamic-import | `const Chart = dynamic(() => import("./Chart"), { ssr: false, loading: () => <Loader /> })`. |
| perf.bundle.client-layout | Move interactive pieces into small `"use client"` components and keep the layout on the server. |
| perf.fetch.loop | Use a batched query (`where: { id: { in: ids } }`) or a bulk endpoint, or at least `Promise.all` with a concurrency limit. |

## Security

| Playbook / id | Steps |
|---|---|
| sec.secret.* / sec.env.committed | Tell the user to **rotate the key at the provider first**. Then move it to a server-only env var, run `git rm --cached` on committed env files, and add `.env*` (with `!.env.example`) to `.gitignore`. Purging history rewrites it, so only do that if the user asks. |
| sec.env.public-secret | Rename it without `NEXT_PUBLIC_`/`VITE_`, and move its use into server code (a route handler, server action or server component). |
| sec.api.no-auth / sec.action.no-auth | Add the auth check the project already uses elsewhere (find it with grep) at the top, return 401/403, and validate inputs with the project's schema library if it has one. |
| sec.api.webhook-unverified | Verify the provider's signature over the raw body with a timing-safe compare before doing anything. |
| sec.xss.* | Render as text. If HTML is required, sanitise with DOMPurify (and ask before adding it). Show uploaded SVG with `<img src>`. |
| sec.redirect.open | `const safe = next?.startsWith("/") && !next.startsWith("//") ? next : "/"`. |
| sec.auth.token-storage | Explain the change to HttpOnly cookies set by the server. It touches auth, so get an explicit go-ahead first. |
| sec.headers.* | Add them to `next.config` `headers()`. Ship CSP as `Content-Security-Policy-Report-Only` first, and enforce it only after checking the console. |

## Design and polish

| Playbook / id | Steps |
|---|---|
| `design-direction` | Run the design-lint skill's direction step: propose three directions and apply only the one the user chooses, starting with token values. |
| polish.meta.* | Add root `metadata` (title template, description, openGraph), plus `app/icon.svg`, `app/apple-icon.png` and `app/opengraph-image.png`. |
| polish.seo.* | `app/robots.ts` (disallow everything outside production) and `app/sitemap.ts`. |
| polish.i18n.* | Pass an explicit locale to date and number formatting, and move hardcoded strings into the message files. |
| polish.tokens.* | Swap hex values for theme tokens, and ask before adding new tokens. |
