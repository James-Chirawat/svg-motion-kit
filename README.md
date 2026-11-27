<p align="center">
  <img src="docs/assets/banner.svg" alt="svg-motion-kit — themed, animated SVG for your frontend" width="840">
</p>

<p align="center">
  Claude skills that read your project's theme, review the UI/UX,<br>
  and draw animated SVG that drops straight into your frontend.
</p>

<p align="center">
  <b>English</b> · <a href="README.th.md">ภาษาไทย</a>
</p>

> [!NOTE]
> **Work in progress.** The skills are not ready to install yet. Watch or star the repo to follow v0.1.

## Why

Most design skills give advice. This one writes the asset:

1. **Reads your theme from code**: Tailwind v3/v4, CSS variables, shadcn tokens, fonts, dark mode.
2. **Draws SVG that uses those tokens**: `var(--primary)` and `currentColor`, never hardcoded hex. Dark mode comes for free.
3. **Animates it the way your project already does**: plain CSS `@keyframes` by default. It uses framer-motion or GSAP only when they're already in `package.json`, and never installs anything without asking.
4. **Places it as a component** for your framework, and shows a diff before writing.

## Examples

| Loader | Empty state | Hero |
|:---:|:---:|:---:|
| <img src="docs/assets/loader.svg" alt="Spinner and skeleton loader" width="260"> | <img src="docs/assets/empty-state.svg" alt="Empty state with a floating open box" width="260"> | <img src="docs/assets/hero-blob.svg" alt="Gradient blobs around a floating UI card" width="260"> |
| spinner + shimmer | float + peek | blob morph |

**Same patterns, any theme.** These three use three different palettes to show that the output follows *your* project, not a default "AI purple":

| Success | Offline | Upload |
|:---:|:---:|:---:|
| <img src="docs/assets/success.svg" alt="Changes saved: a tick draws inside a circle" width="260"> | <img src="docs/assets/offline.svg" alt="You're offline: a plug keeps reaching for a socket" width="260"> | <img src="docs/assets/upload.svg" alt="A file uploading with a progress bar" width="260"> |
| forest · tick draw + pulse | terracotta · reach + retry | ink + amber · progress + done |

Each example is a single self-contained SVG of 3–6 KB, with a built-in dark palette and `prefers-reduced-motion` support.

## Skills

| Skill | Status | What it does |
|---|---|---|
| `theme-extract` | ✅ v0.1 (unreleased) | Reads the project's design tokens into `.svg-motion/theme.json` |
| `svg-motion` | 🚧 v0.1 | Finds where motion helps UX, then generates theme-aware animated SVG (loaders, empty/error/success states, banners) as components |
| `design-lint` | 🚧 v0.1 | Flags the generic "AI-made" look (purple gradients, glass, blobs, emoji icons) and proposes grounded design directions |
| `ui-audit` | 🗓 v0.2 | UX states, forms, mobile, microcopy, WCAG contrast and accessibility basics |
| `perf-audit` | 🗓 v0.3 | Images (AVIF/WebP, sizing), fonts (incl. Thai subsets), data fetching, caching, bundle |
| `security-audit` | 🗓 v0.4 | Leaked secrets, XSS sinks (incl. unsafe SVG), client-side auth, security headers |
| `polish-audit` | 🗓 v0.5 | Design-system use, code health, i18n, meta/OG, 404/500 pages, SEO basics |
| `audit` | 🗓 v1.0 | Runs everything, one prioritised report, safe fixes with diffs |

## Install (once v0.1 ships)

In Claude Code:

```text
/plugin marketplace add James-Chirawat/svg-motion-kit
/plugin install svg-motion-kit@svg-motion-kit
```

Then ask in your own words, for example *"add an animated empty state to the orders page"* or *"ทำ loader ให้เข้าธีมหน่อย"*.

## Principles

Every generated SVG must:

- use theme tokens or `currentColor` for colour, with no hardcoded hex outside fallbacks
- respect `prefers-reduced-motion` and never flash more than 3 times a second (WCAG 2.3.1)
- animate only `transform` and `opacity`
- carry the right accessibility attributes: `aria-hidden="true"` when decorative, `role="img"` plus `<title>` when meaningful
- stay small (target under 15 KB) and need no runtime dependency

Bundled scripts are plain Node (`.mjs`). They have no dependencies, make no network calls and are short enough to read before you run them.

## Roadmap

- [x] **v0.0** Repo, marketplace manifest, README examples, icon
- [ ] **v0.1** Theme-true motion: `theme-extract` ✅, `svg-motion` (scout + draw + place), `design-lint`
- [ ] **v0.2** UX and accessibility: `ui-audit`, shared report format, Vue and Svelte recipes
- [ ] **v0.3** Performance: `perf-audit`, optional Lighthouse pass, motion libraries when present
- [ ] **v0.4** Security: `security-audit`
- [ ] **v0.5** Professional polish: `polish-audit`
- [ ] **v1.0** One report, safe fixes: `audit` orchestrator, fix mode, gallery, plugin directory

Details, checks and "done when" criteria for every version are in **[docs/ROADMAP.md](docs/ROADMAP.md)**.

## Preview locally

```bash
python3 -m http.server 8765 --directory docs
```

Then open <http://127.0.0.1:8765/preview.html>.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

Run the tests (Node 18 or later, nothing to install):

```bash
npm test
```

## License

[MIT](LICENSE)
