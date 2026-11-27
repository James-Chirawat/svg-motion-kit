<p align="center">
  <img src="docs/assets/banner.svg" alt="svg-motion-kit — theme-true motion and frontend reviews for Claude Code" width="840">
</p>

<p align="center">
  Claude Code skills that read your project's theme, find where the UX needs help,<br>
  draw animated SVG that fits, and review the frontend for UX, performance, security and polish.
</p>

<p align="center">
  <b>English</b> · <a href="README.th.md">ภาษาไทย</a>
</p>

> [!NOTE]
> **v0.1.0** ships `theme-extract`, `svg-motion` and `design-lint`. The UX, performance, security and polish audits are on the [roadmap](docs/ROADMAP.md).

## What the workflow covers

The name says SVG, but the kit follows the whole loop of making a frontend feel finished. Each step is its own skill: use one, or run them all.

| Step | Skill | What happens | Status |
|---|---|---|---|
| **1. Theme** | `theme-extract` | Reads your real design tokens (Tailwind v3/v4, CSS variables, shadcn/ui, dark mode, radius, fonts, installed libraries) into `.svg-motion/theme.json`. | ✅ |
| **2. Scout** | `svg-motion` | Scans the code for moments where users wait, get stuck or get no feedback (empty, loading, error, success, offline, upload), and ranks where motion helps most. | ✅ v0.1 |
| **3. Look** | `design-lint` | Flags the generic AI-made look (purple gradients, glass, blobs, emoji icons) and proposes design directions grounded in your audience. | ✅ v0.1 |
| **4. Draw** | `svg-motion` | Generates theme-true animated SVG and places it as a component for your framework, showing the diff first. | ✅ v0.1 |
| **5. Review** | `ui-audit` · `perf-audit` · `security-audit` · `polish-audit` | **UX and accessibility** (states, forms, mobile, contrast). **Performance** (WebP/AVIF images, Thai font subsets, data fetching, caching, bundle). **Security** (leaked secrets, XSS incl. unsafe SVG, headers). **Polish** (design-system use, i18n, meta/OG, 404/500, SEO). | v0.2–v0.5 |
| **6. Report and fix** | `audit` | One prioritised report with file:line evidence. Fixes are applied one at a time, each shown as a diff. | v1.0 |

Ground rules for every step:

- **Read-only by default.** Nothing changes without a diff you approve.
- **Evidence, not vibes.** Every finding points to a file and line. Deterministic checks are scripts; Claude only does the judgement calls.
- **Honest limits.** Static analysis can't measure real load times or prove security. Reports say so and point to Lighthouse or a proper review.
- **Your project's taste.** Colours, radius, fonts and motion libraries come from your code. Nothing new gets installed without asking.
- **Zero-dependency scripts**, Node 18+, no network unless you agree. English and Thai.

The full plan with every check is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Examples

Every example uses its own palette, because the output should follow *your* project, not a default "AI purple". The banner, hero and icon use the kit's own theme: paper, ink and vermilion.

| Loader | Empty state | Hero |
|:---:|:---:|:---:|
| <img src="docs/assets/loader.svg" alt="Spinner and skeleton loader" width="260"> | <img src="docs/assets/empty-state.svg" alt="Empty state with a floating open box" width="260"> | <img src="docs/assets/hero.svg" alt="A web page assembles itself and a cursor clicks its button" width="260"> |
| navy + mint · spinner + shimmer | teal + coral · float + peek | paper + ink · build + click |

| Success | Offline | Upload |
|:---:|:---:|:---:|
| <img src="docs/assets/success.svg" alt="Changes saved: a tick draws inside a circle" width="260"> | <img src="docs/assets/offline.svg" alt="You're offline: a plug keeps reaching for a socket" width="260"> | <img src="docs/assets/upload.svg" alt="A file uploading with a progress bar" width="260"> |
| forest · tick draw + pulse | terracotta · reach + retry | ink + amber · progress + done |

Each example is a single self-contained SVG of 3–6 KB, with a built-in dark palette and `prefers-reduced-motion` support.

## Skills

| Skill | Status | What it does |
|---|---|---|
| `theme-extract` | ✅ v0.1 | Reads the project's design tokens into `.svg-motion/theme.json` |
| `svg-motion` | ✅ v0.1 | Finds where motion helps UX, then generates theme-aware animated SVG (loaders, empty/error/success states, banners) as components |
| `design-lint` | ✅ v0.1 | Flags the generic "AI-made" look (purple gradients, glass, blobs, emoji icons) and proposes grounded design directions |
| `ui-audit` | ✅ v0.2 | UX states, forms, mobile, microcopy, WCAG contrast and accessibility basics |
| `perf-audit` | ✅ v0.3 | Images (AVIF/WebP, sizing), fonts (incl. Thai subsets), data fetching, caching, bundle |
| `security-audit` | 🗓 v0.4 | Leaked secrets, XSS sinks (incl. unsafe SVG), client-side auth, security headers |
| `polish-audit` | 🗓 v0.5 | Design-system use, code health, i18n, meta/OG, 404/500 pages, SEO basics |
| `audit` | 🗓 v1.0 | Runs everything, one prioritised report, safe fixes with diffs |

## Install

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
- [x] **v0.1** Theme-true motion: `theme-extract` ✅, `svg-motion` (scout + draw + place), `design-lint`
- [x] **v0.2** UX and accessibility: `ui-audit`, shared report format, Vue and Svelte recipes
- [x] **v0.3** Performance: `perf-audit`, optional Lighthouse pass, motion libraries when present
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
