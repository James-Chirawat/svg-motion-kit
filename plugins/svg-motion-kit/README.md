![svg-motion-kit](assets/banner.svg)

# svg-motion-kit

**Finish your frontend.** svg-motion-kit reads your project's real theme, finds the moments where the UX needs help, adds animated SVG that matches your design, and reviews security, accessibility, performance, design and polish. Every finding has `file:line` evidence, and fixes are applied one reviewed diff at a time. It works in English and Thai.

## Install

```text
/plugin install svg-motion-kit --marketplace James-Chirawat/svg-motion-kit
```

On Claude Code versions before 2.1.275, use two steps: `/plugin marketplace add James-Chirawat/svg-motion-kit`, then `/plugin install svg-motion-kit@svg-motion-kit`. Requires Node.js 18 or later.

## What you can ask

- *"Audit my site before launch. What should I fix first?"* → one prioritised report with numbered findings (F1, F2…), then *"fix F2 and F5"*
- *"Add an animated empty state to the orders page"* → a theme-true illustration, placed as a React, Vue or Svelte component
- *"Why does our landing page look AI-generated?"* → generic patterns found, three grounded design directions
- *"ตรวจเว็บทั้งหมดก่อนขึ้น production"* → the same audit, answered in Thai

## Skills

| Skill | Purpose |
|---|---|
| `audit` | Runs every review, gives a weighted overall score, a "do these first" list, and fixes by number |
| `svg-motion` | Scouts empty, loading, error, success, offline and upload moments. Renders 8 animated templates in your theme, validates them, and exports components |
| `theme-extract` | Reads Tailwind v3/v4, CSS variables, shadcn/ui, dark mode, radius and fonts |
| `design-lint` | Scores how generic the UI looks and proposes alternatives |
| `ui-audit` | Missing states, labels, focus, tap targets, alt text, WCAG contrast from your theme |
| `perf-audit` | Image formats, Thai fonts, request waterfalls, N+1 calls, caching, bundles, scripts |
| `security-audit` | Masked secret scan, committed `.env` files, public env leaks, XSS, unauthenticated routes and actions, headers |
| `polish-audit` | Metadata, Open Graph image, favicon, 404 and error pages, robots and sitemap, i18n |

| | | |
|:---:|:---:|:---:|
| ![Loader](assets/loader.svg) | ![Empty state](assets/empty-state.svg) | ![Success](assets/success.svg) |

## What this plugin runs, reads and writes

- **Bundled scripts:** plain Node.js (18+) files under `skills/*/scripts/`. They have no dependencies, make **no network requests**, and never execute project code: config files are read as text.
- **Reads:** files inside the project you point it at. `security-audit` also runs `git ls-files` (read-only) to tell committed files from local ones.
- **Writes:** only `.svg-motion/` report files (`theme.json`, `audit.md`, `audit.json`, `preview.html`) inside your project. Code changes happen only when you ask, after you see the diff.
- **Optional, only with your consent:**
  - `npm audit` (contacts the npm registry)
  - `npx --yes lighthouse@12.0.0 <url>` (downloads Lighthouse and loads the URL)
  - image tools named in fix suggestions: `npx --yes @squoosh/cli@0.7.3`, `npx --yes svgo@3.3.2`
- **Secrets:** detected keys are always masked. Nothing is sent anywhere.
- **Limits:** these are code-level checks. They don't replace Lighthouse, `npm audit`, a penetration test or a browser check, and reports say what they didn't cover.

## Links

- Source, issues and changelog: https://github.com/James-Chirawat/svg-motion-kit
- Gallery: https://james-chirawat.github.io/svg-motion-kit/gallery/
- License: MIT
