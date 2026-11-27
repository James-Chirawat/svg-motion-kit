# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- New brand look, with no more indigo/violet "AI purple": paper, ink and vermilion with a drafting-table style (dot grid, bezier handles, pen tip). Redrawn `banner.svg` and plugin icon.
- `loader.svg` is now navy + mint, and `empty-state.svg` is teal + coral with geometric marks instead of sparkles.
- `hero-blob.svg` was replaced by `hero.svg`: a page that assembles itself, then a cursor clicks its button.
- README explains what the workflow covers (theme, scout, look, draw, review, report and fix). Plugin name stays `svg-motion-kit`.

### Added

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
