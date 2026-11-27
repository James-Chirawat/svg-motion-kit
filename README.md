<p align="center">
  <img src="docs/assets/banner.svg" alt="svg-motion-kit — theme-true motion and frontend reviews for Claude Code" width="840">
</p>

<p align="center">
  <a href="https://github.com/James-Chirawat/svg-motion-kit/actions/workflows/ci.yml"><img src="https://github.com/James-Chirawat/svg-motion-kit/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/version-1.0.0-1B1A17" alt="Version 1.0.0"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-1B1A17" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/node-%E2%89%A518-1B1A17" alt="Node 18 or later">
</p>

<p align="center">
  <b>English</b> · <a href="README.th.md">ภาษาไทย</a> · <a href="https://james-chirawat.github.io/svg-motion-kit/">Website &amp; gallery</a>
</p>

**svg-motion-kit** is a Claude Code plugin for finishing frontends. It reads your project's real theme, finds where the UX needs help, adds animated SVG that matches your design, and reviews security, accessibility, performance, design and polish. Every finding comes with `file:line` evidence, and fixes are applied one diff at a time.

## Install

```text
/plugin install svg-motion-kit --marketplace James-Chirawat/svg-motion-kit
```

On Claude Code versions before 2.1.275, use two steps:

```text
/plugin marketplace add James-Chirawat/svg-motion-kit
/plugin install svg-motion-kit@svg-motion-kit
```

Requires Claude Code and Node.js 18 or later. Nothing else is installed.

## Quick start

Ask in your own words, in English or Thai:

| You ask | What happens |
|---|---|
| *"Audit my site before launch. What should I fix first?"* | `audit` runs every review, writes one prioritised report with numbered findings, and waits for you to choose |
| *"Fix F2 and F5"* | Fixes are applied one at a time, each shown as a diff and re-checked afterwards |
| *"Add an animated empty state to the orders page"* | `svg-motion` draws it in your theme's colours and places it as a component |
| *"Why does our landing page look AI-generated?"* | `design-lint` points out the clichés and proposes three design directions |
| *"ตรวจเว็บทั้งหมดก่อนขึ้น production"* | Same as the first row, answered in Thai |

## Skills

| Skill | What it does |
|---|---|
| **audit** | Runs every review below and merges them into one report: an overall score, a "do these first" list, and numbered findings you can fix by number |
| **svg-motion** | Finds empty, loading, error, success, offline and upload moments. Renders theme-true animated SVG from 8 templates, validates it, and exports React, Vue or Svelte components |
| **theme-extract** | Reads your real design tokens from Tailwind v3/v4, CSS variables, shadcn/ui, dark mode, radius and fonts |
| **design-lint** | Scores how generic the UI looks (purple gradients, glassmorphism, blob orbs, emoji icons…) and proposes grounded alternatives |
| **ui-audit** | Missing states, form labels, focus, tap targets, alt text, and WCAG contrast computed from your theme |
| **perf-audit** | Image formats, Thai font weights and subsets, request waterfalls, N+1 calls, caching, heavy bundles, third-party scripts |
| **security-audit** | Leaked keys (always masked), committed `.env` files, public env leaks, XSS sinks, unauthenticated routes and server actions, security headers |
| **polish-audit** | Metadata and Open Graph image, favicon, 404 and error pages, robots and sitemap, i18n, design-system drift |

## Examples

Every illustration follows the project's own palette and switches to dark mode with it.

| Loader | Empty state | Success |
|:---:|:---:|:---:|
| <img src="docs/assets/loader.svg" alt="Spinner and skeleton loader" width="260"> | <img src="docs/assets/empty-state.svg" alt="Empty state with an open box" width="260"> | <img src="docs/assets/success.svg" alt="Changes saved, with a tick drawing itself" width="260"> |
| **Offline** | **Upload** | **Hero** |
| <img src="docs/assets/offline.svg" alt="Offline, with a plug reaching for a socket" width="260"> | <img src="docs/assets/upload.svg" alt="A file uploading with a progress bar" width="260"> | <img src="docs/assets/hero.svg" alt="A web page assembling itself" width="260"> |

The **[gallery](https://james-chirawat.github.io/svg-motion-kit/gallery/)** shows all 8 templates rendered with 5 different project themes.

## How it works

1. **Theme:** design tokens are read from your code, never guessed.
2. **Review:** fast, deterministic scripts check the code. Claude then confirms each important finding in context before reporting it.
3. **Report:** findings are numbered and prioritised by severity, area and effort, and saved to `.svg-motion/audit.md`.
4. **Fix:** you choose what to fix. Each change is the smallest one that works, shown as a diff, then re-checked.

## Trust and safety

- **Read-only by default.** Code changes only after you ask, one diff at a time.
- **No network and no dependencies.** The bundled scripts are plain Node.js and read only your project. Optional tools (`npm audit`, Lighthouse) run only if you agree.
- **Secrets stay secret.** Detected keys are masked in every output. The fix guidance says to rotate a leaked key first.
- **Honest limits.** These are code-level checks. They don't replace Lighthouse, `npm audit`, a penetration test, or a look in the browser, and every report says what it didn't cover.

## Learn more

- [Changelog](CHANGELOG.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [How it is tested](docs/TESTING.md)

## License

[MIT](LICENSE)
