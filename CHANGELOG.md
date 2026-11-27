# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.4.0] - 2026-11-27

Security.

### Added

- `security-audit` skill. `security-audit.mjs` is a code-level checklist with masked evidence. It checks:
  - **secrets:** AWS, Stripe, GitHub, Slack, OpenAI, Anthropic, Google, PEM keys and JWTs (a Supabase `service_role` JWT is high); committed `.env` files (via `git ls-files`); `.env` files that git doesn't ignore; secret-named `NEXT_PUBLIC_`/`VITE_`/`PUBLIC_` variables
  - **XSS sinks:** including uploaded SVG rendered as markup and JSON-LD without escaping `<`
  - **auth:** tokens in localStorage, client-only route guards, mutating Next routes and server actions without an auth check (recognising project auth helpers and middleware), unverified webhooks, public write endpoints without rate limiting
  - **other:** open redirects, security headers, public source maps, a missing lockfile

  `SKILL.md` covers secret handling: never echo values, and rotate before removing.
- `examples/leaky/` fixture. It contains no realistic secrets; the tests assemble fake ones at runtime.

## [0.3.0] - 2026-11-27

Performance.

### Added

- `perf-audit` skill. `perf-audit.mjs` checks:
  - **images:** AVIF/WebP candidates by size, oversized files, next/image, dimensions (CLS), LCP priority, lazy loading
  - **fonts:** next/font, font-display, Thai fonts in too many weights or missing the `thai` subset (33 Thai families recognised), family count
  - **data fetching:** waterfalls (skips dependent and guarded awaits), N+1 loops, async forEach, effect fetching without cache or abort, caching turned off everywhere
  - **bundle:** moment, lodash, barrel icons, 28 heavy chart/map/editor/PDF/3D libraries imported up front, `"use client"` layouts, jQuery
  - **other:** index keys, render-blocking third-party scripts, layout-property animations, SVG and Lottie weight

  It always lists what needs a real measurement, and runs Lighthouse only with consent.
- `svg-motion`: `preview.mjs` builds a review page using the project's real theme variables (light, the project's own dark switch, reduced motion). `SKILL.md` adds a render-and-review step and guidance for framer-motion and GSAP.
- `examples/slow-next/` fixture.

### Changed

- Shared scoring is gentler on repeats: high 12, medium 5, low 2, plus 1 per repeat (up to 3). Generated code (`generated/`, `.prisma/`) and minified bundles are skipped.

## [0.2.0] - 2026-11-27

UX and accessibility.

### Added

- `ui-audit` skill. `ui-audit.mjs` checks:
  - loading, empty and error coverage for every component that fetches data, including Next `loading.tsx` and `error.tsx`
  - form labels, icon-button names, image alt, clickable divs, removed focus outlines, positive tabIndex, `<html lang>`
  - tap targets, hover-only actions, `alert()` feedback, vague error copy (Thai and English)
  - reduced-motion handling, and WCAG AA contrast of the real theme tokens in light and dark

  Findings carry fix playbooks that hand off to `svg-motion`.
- Shared audit library (`plugins/svg-motion-kit/shared/audit-core.mjs`): the shared finding format, 0–100 area scores, grouped Markdown and JSON reports in `.svg-motion/`, and a monorepo-aware project walker that skips tests, fixtures and mockups.
- `svg-motion` exports Vue (`<script setup>`) and Svelte (`:global` CSS, `class` prop) components with `--target vue|svelte` or a `.vue`/`.svelte` output path.
- `examples/ux-gaps/` fixture.

## [0.1.0] - 2026-11-27

First release: `theme-extract`, `svg-motion` and `design-lint`.

### Changed

- New brand look, with no more indigo/violet "AI purple": paper, ink and vermilion with a drafting-table style (dot grid, bezier handles, pen tip). Redrawn `banner.svg` and plugin icon.
- `loader.svg` is now navy + mint, and `empty-state.svg` is teal + coral with geometric marks instead of sparkles.
- `hero-blob.svg` was replaced by `hero.svg`: a page that assembles itself, then a cursor clicks its button.
- README explains what the workflow covers (theme, scout, look, draw, review, report and fix). Plugin name stays `svg-motion-kit`.

### Added

- Real-use testing (`docs/TESTING.md`): live headless runs with `--plugin-dir` on copies of the examples, and an eval suite in `plugins/svg-motion-kit/evals/` with four cases (Thai, English, and one where nothing should fire). Fixes found this way: the scout now recognises its own generated components (re-runs are idempotent), and every skill replies in the user's language.
- `design-lint` skill: `lint-design.mjs` flags the generic AI look across 12 rules (purple gradients, gradient text, glow, glassmorphism, blob orbs, sparkles, emoji icons, stock AI copy, identical card grids, announcement pills, an indigo/violet brand colour, one generic font). It gives file:line evidence and a 0–100 genericness score. `SKILL.md` then proposes three directions grounded in the audience, with palettes mapped to existing variables and Thai-capable font pairings. New `examples/generic-ai/` fixture.
- `svg-motion` skill (`SKILL.md`): theme → scout → render → validate → place as a component with a diff → check.
  - `scout.mjs` finds empty, loading, error, not-found, success, upload, offline and hero moments, notes whether each is plain text or already illustrated, and ranks them. Supports Thai and English copy.
  - `to-component.mjs` turns a rendered SVG into a React component (TSX or JSX) with `title`, `decorative`, `idSuffix` and `className` props. It needs no hooks and works in Server Components. Checked against TypeScript strict and React 19 server rendering.
  - `render-template.mjs --no-text` keeps the words in the page and ships only the picture.
  - The examples now have planted spots: `app/error.tsx` and `app/settings/page.tsx` (upload plus an `alert` on save).
- `svg-motion` building blocks:
  - `validate-svg.mjs`, a quality and safety gate with an `inline` and a `standalone` mode. It checks for hardcoded colours, reduced-motion support, layout-triggering animation, accessibility, scripts and external references, duplicate ids, page-leaking selectors, and size.
  - Eight theme-driven templates: loader, empty-state, error, success, offline, upload, line-draw, hero.
  - `render-template.mjs` fills a template from `theme.json` with roles, dark mode, radius and fonts, and gives every instance a unique scope and ids. Syntax is documented in `references/templates.md`.
- CI: tests on Node 18 and 22, README SVG validation, and `claude plugin validate`.
- `docs/ROADMAP.md` and `docs/ROADMAP.th.md`: the full plan from v0.1 to v1.0.

- Three more README examples in three non-purple themes: `success.svg` (forest), `offline.svg` (terracotta), `upload.svg` (ink + amber).
- Plugin icon (`plugins/svg-motion-kit/.claude-plugin/icon.png`, 1024×1024, made from `docs/assets/icon.svg`). It was committed after the Phase 1 PR merged, so it lands here.

- `theme-extract` skill. `scripts/extract-tokens.mjs` reads Tailwind v3/v4, CSS custom properties, shadcn/ui, dark-mode strategy, radius, fonts and installed animation/icon libraries into `.svg-motion/theme.json`. It has no dependencies, makes no network calls and never runs project code.
  - Converts hex, rgb, hsl, oklch and shadcn's bare HSL triplets, and gives the right runtime reference (`var(--x, #fallback)` or `hsl(var(--x))`).
  - Skips grey shadcn `--accent` for a colourful accent, and never picks status colours as accent.
  - Guesses primary from brand-like names (`--brand-blue`) and flags it for the user to confirm.
  - Finds the app's `package.json` in a sub-folder (monorepos).
- Example projects in `examples/`: Next + Tailwind v4, Vite + Tailwind v3, plain HTML, and a project with no theme.
- Test suite (`npm test`, Node's built-in runner).
- Repository skeleton: Claude Code marketplace (`.claude-plugin/marketplace.json`) and plugin manifest (`plugins/svg-motion-kit`).
- Four animated example SVGs in `docs/assets/`: banner (line-draw), loader (spinner and shimmer), empty state (float and peek), hero (blob morph).
- `docs/preview.html` for viewing the examples locally.
- README in English and Thai.

[Unreleased]: https://github.com/James-Chirawat/svg-motion-kit/compare/v0.4.0...HEAD
[0.1.0]: https://github.com/James-Chirawat/svg-motion-kit/releases/tag/v0.1.0
[0.2.0]: https://github.com/James-Chirawat/svg-motion-kit/releases/tag/v0.2.0
[0.3.0]: https://github.com/James-Chirawat/svg-motion-kit/releases/tag/v0.3.0
[0.4.0]: https://github.com/James-Chirawat/svg-motion-kit/releases/tag/v0.4.0
