# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
