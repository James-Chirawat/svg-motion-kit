---
name: polish-audit
description: Check the details that separate a professional site from a prototype. Covers hardcoded colours and arbitrary spacing next to a real theme, hand-styled buttons beside a Button component, any/ts-ignore/console.log/lint setup, hardcoded Thai or English text in i18n projects, dates formatted with the default locale, missing metadata (title template, description, Open Graph image), favicon, per-page titles, viewport, custom 404 and error pages, robots and sitemap, and heading order. Use for "polish", "make it production-ready", "what looks unfinished", "SEO basics", "meta tags", "ตรวจความเรียบร้อย", "พร้อมขึ้น production ไหม". Read-only unless the user asks for fixes.
---

# polish-audit

Find the unfinished edges: the things users and reviewers notice even when everything "works".

**Language:** reply in the language the user wrote in, Thai or English. Keep file names, code and CLI output as they are.

## 1. Run it

```bash
node "<skill-dir>/scripts/polish-audit.mjs" "<project>"            # summary
node "<skill-dir>/scripts/polish-audit.mjs" "<project>" --write    # also saves .svg-motion/polish-audit.md + .json
```

It is read-only, uses Node 18+, and makes no network calls. Checks are listed in [references/checks.md](references/checks.md).

## 2. Verify and prioritise

- **Hardcoded colours:** a few one-offs, such as a brand logo colour or a chart series, can be intentional. Report patterns, not every hex value.
- **i18n text:** only meaningful when the project really uses its i18n library. Check that other strings go through `t()`.
- **Missing pages and meta:** internal tools don't need robots, sitemap or OG images. Ask, or infer from the project, whether it's public before pushing SEO items.
- Put user-visible items first: meta, OG, favicon, 404, error page, dates. Then design-system drift, then code health.

## 3. Report

Give the score and "Do these first". For each item, give file:line, why it matters, and the fix. Group repeats.

## 4. Fix (only when asked)

| Finding | Fix |
|---|---|
| `polish.meta.*` | Add `export const metadata` with a title template, description and `openGraph` to the root layout. Add `app/icon.svg`, `app/apple-icon.png` and `app/opengraph-image.png` (1200×630). |
| `polish.pages.not-found` / `.error` | Create them with the **svg-motion** skill: the `empty-state` template for 404, `error` for the error page, with real text and a way back. |
| `polish.seo.*` | Add `app/robots.ts`, disallowing everything outside production, and `app/sitemap.ts` from the public routes. |
| `polish.i18n.default-locale` | Pass the locale explicitly, e.g. `toLocaleDateString("th-TH", { dateStyle: "medium" })`, or the app's current locale. |
| `polish.i18n.hardcoded-text` | Move the strings into the message files and use `t()`. Keep keys meaningful. |
| `polish.tokens.*` | Replace hex values with the matching theme token. If none matches, ask before adding a token. |
| `polish.code.*` | Run the project's lint setup (`npm run lint`, or the project's own `next lint` for Next). Replace `any` with real types, starting with API data. |

Fix one item at a time and show each diff. Re-run the audit afterwards.
