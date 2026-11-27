# Roadmap

<p><b>English</b> · <a href="ROADMAP.th.md">ภาษาไทย</a></p>

svg-motion-kit grows from one job (theme-true animated SVG) into a frontend review kit covering UI, UX, accessibility, performance, security and polish. Each version ships something useful on its own. Nothing in a later version is needed to use an earlier one.

| Version | Theme | New skills | Status |
|---|---|---|---|
| [v0.1](#v01--theme-true-motion) | Theme-true motion | `theme-extract` ✅, `svg-motion`, `design-lint` | in progress |
| [v0.2](#v02--ux-and-accessibility) | UX and accessibility | `ui-audit` | planned |
| [v0.3](#v03--performance) | Performance | `perf-audit` | planned |
| [v0.4](#v04--security) | Security | `security-audit` | planned |
| [v0.5](#v05--professional-polish) | Professional polish | `polish-audit` | planned |
| [v1.0](#v10--one-report-safe-fixes) | One report, safe fixes | `audit` (orchestrator) | planned |

---

## Principles (all versions)

1. **Evidence, not vibes.** Every finding names a file and line and quotes what it saw. Deterministic checks run as scripts. Claude handles only what needs judgement (wording, priorities, design direction).
2. **Read-only by default.** Audits never change code. Fixes are opt-in, one at a time, always shown as a diff first.
3. **Honest limits.** Reading code cannot measure real load times or prove something is secure. Reports say what was checked and what wasn't, and point to runtime tools (Lighthouse, PageSpeed Insights, a real pentest) where they're needed.
4. **The project's own taste.** Colours, radius, fonts and motion libraries come from `theme.json`. When the project itself is generic, offer directions with reasons instead of falling back to a default look.
5. **Zero-dependency scripts.** Plain Node 18+ (`.mjs`), no installs, no network unless the user agrees (for example `npm audit`), and short enough to read before running.
6. **Bilingual by design.** Triggers, reports and examples work in English and Thai.

### Shared finding format (introduced in v0.2, used by every audit)

```json
{
  "id": "perf.image.format",
  "area": "ui | ux | a11y | svg | performance | security | polish",
  "severity": "high | medium | low",
  "effort": "S | M | L",
  "title": "PNG hero image could be AVIF/WebP",
  "file": "app/page.tsx",
  "line": 42,
  "evidence": "<img src=\"/hero.png\"> (1.8 MB)",
  "why": "Largest image on the page; slows Largest Contentful Paint.",
  "fix": "Use next/image with the source converted to AVIF/WebP.",
  "autofix": false
}
```

Severity guide: **high** means users are blocked or exposed (missing error state on checkout, secret in client code, 2 MB LCP image). **medium** means a noticeable degradation. **low** is polish. Reports sort by severity, then by effort (quick wins first).

---

## v0.1 — Theme-true motion

**Goal:** animated SVG that looks like it belongs to *this* project, placed where it helps users most, and never the generic "AI purple" look.

### Skills

| Skill | What it does |
|---|---|
| `theme-extract` ✅ | Reads Tailwind v3/v4, CSS variables, shadcn/ui, dark mode, radius, fonts and installed libraries into `.svg-motion/theme.json`. |
| `svg-motion` | **Scout:** finds where motion helps (see below) and proposes the top 3–5 spots. **Draw:** generates the SVG from a template using theme roles. **Place:** writes a component for the project's framework and shows the diff. |
| `design-lint` | Flags patterns that make a site look AI-generated and proposes three grounded design directions. |

### `svg-motion` scout signals

| Signal in code | Suggested asset |
|---|---|
| `items.length === 0`, "No data", "ไม่พบข้อมูล" | empty state |
| `isLoading` rendering only "Loading…" | skeleton or loader |
| `catch` / `error &&` rendering bare text, `not-found.tsx`, `error.tsx` | error state |
| form submit that only redirects or `alert()`s | success feedback |
| `<input type="file">` | upload progress |
| no `navigator.onLine` / offline handling in a data-heavy app | offline state |
| multi-step sign-up or onboarding | step illustrations |

Spots are ranked by **how often users hit them × how much the moment matters** (errors and long waits before hero art).

### `design-lint` checks (script: `lint-design.mjs`)

- Colour: indigo-to-violet or purple-to-pink gradients, gradient text, coloured glow shadows.
- Surfaces: glassmorphism (`backdrop-blur` + translucent white), blob heroes, identical `rounded-2xl shadow-lg` cards in a 3-column grid.
- Ornament: emoji as icons, ✨ sparkle icons, "New" pill badges centred above every hero.
- Type: a single font family with no clear size hierarchy.
- Output: a genericness score with file:line evidence, plus three directions grounded in the product's audience and domain (for example, a Sukhothai heritage site leaning on laterite and fired-clay tones instead of violet).

### Templates and recipes

- Templates: line-draw banner, loader, skeleton, empty state, error, success, offline, upload, hero. Colours come only from `var(--token, fallback)` or `currentColor`.
- Recipes: React/Next (TSX component, `className` + `currentColor` for Tailwind) and plain HTML (inline SVG or `<img>`).
- `validate-svg.mjs`: no hardcoded colours outside fallbacks, `prefers-reduced-motion` present, only `transform`/`opacity` animated, correct `aria-*`/`<title>`, size under 15 KB, no `<script>`, no event handlers, no external references.

### Also in v0.1

- ✅ Re-theme the four original README examples and the icon away from indigo/violet (D2). The kit's own brand is now paper, ink and vermilion, and the blob hero was replaced.
- ✅ Plugin name decided (D1): keep `svg-motion-kit`. The README states what the workflow covers.
- Install the plugin from the marketplace the way users will, and test it on the four `examples/` projects and at least two real projects.
- Eval suite (`claude plugin eval`) for triggering in English and Thai.

### Done when

- On `examples/next-tailwind` and `examples/plain-html`: scout lists the planted empty, loading and error spots, the generated SVGs pass `validate-svg.mjs`, and they follow light and dark mode.
- `design-lint` flags a purposely generic example project (new `examples/generic-ai/`) and passes `examples/plain-html`.
- `claude plugin validate` and `npm test` pass, and v0.1.0 is tagged with release notes.

---

## v0.2 — UX and accessibility

**Goal:** a report that tells a developer which user moments are broken or missing, and which accessibility basics fail, in order of importance.

### `ui-audit` checks

| Area | Check | How |
|---|---|---|
| UX states | Every data-fetching component handles loading, empty, error and success | `scan-states.mjs`: find fetch, SWR, React Query, server-component awaits and look for each branch |
| UX forms | Inputs have labels, errors are shown next to the field, submit gives feedback | static scan |
| UX mobile | Tap targets at least 44 px (`h-8`, `p-1` on buttons), no hover-only actions | Tailwind class scan |
| UX copy | Vague microcopy ("Error", "Something went wrong", "เกิดข้อผิดพลาด" with no next step) | Claude review of collected strings |
| A11y contrast | WCAG AA contrast for every text/background pair in light and dark | `contrast.mjs` using `theme.json` hex values |
| A11y semantics | `<img>` without `alt`, icon-only buttons without labels, `onClick` on `div`, `outline: none` without a replacement focus style | static scan |
| A11y motion | Animations without `prefers-reduced-motion` handling | CSS and motion-library scan |

### Also in v0.2

- The shared finding format and `.svg-motion/audit.md` / `audit.json` report.
- `svg-motion` recipes for Vue (SFC) and Svelte.
- Example `examples/ux-gaps/` with missing states, unlabeled inputs and low contrast.

### Done when

`ui-audit` finds every planted issue in `examples/ux-gaps/` with correct file:line, raises no high-severity false positives on the other examples, and each finding that `svg-motion` can fix links to it.

---

## v0.3 — Performance

**Goal:** find the frontend performance problems you can see in code, and say clearly which ones need a runtime measurement.

### `perf-audit` checks

| Area | Check |
|---|---|
| Images | PNG/JPEG that should be AVIF/WebP, files over 200 KB, `<img>` instead of `next/image` (Next), missing `width`/`height` (layout shift), LCP image without `priority`, below-the-fold images without lazy loading |
| Fonts | Not using `next/font` or `font-display: swap`; **Thai fonts loaded with every weight and no subset** (often 300+ KB each); too many families |
| Data fetching | Sequential `await`s that could run in parallel (`Promise.all`), `useEffect` fetching with no cache (suggest Server Components, SWR or React Query), requests inside loops (N+1), lists with no pagination, over-fetching whole records, no `AbortController` on unmount |
| Caching (Next) | `fetch` with no `revalidate` or cache policy, `cache: "no-store"` everywhere, dynamic rendering forced by stray `cookies()` or `headers()` calls |
| Bundle | Heavy dependencies (moment, full lodash, chart and map libraries) imported up front, no `dynamic()` for heavy client-only components, `"use client"` at the layout level |
| Rendering | Lists with no stable `key`, very long lists without virtualization, context providers re-rendering whole trees |
| Third-party | `<script>` tags without `next/script` strategy, analytics loaded before content |
| SVG/motion | Large inline SVGs repeated across pages (use a sprite), unoptimised SVG (svgo), Lottie used where CSS would do, animating layout properties |

### Also in v0.3

- Optional runtime pass: if the user agrees and Lighthouse is available, run it on a local URL and merge the Core Web Vitals into the report.
- `svg-motion` uses framer-motion, motion or GSAP when the project already has them.
- `svg-motion` render-and-review: render the SVG in a browser, look at the frame, and revise once.
- Example `examples/slow-next/`.

### Done when

Every planted issue in `examples/slow-next/` is found. Image findings include current size and format. The report separates "found in code" from "needs measurement".

---

## v0.4 — Security

**Goal:** catch the frontend security mistakes that leak secrets or open XSS, without claiming to be a security audit.

### `security-audit` checks

| Area | Check |
|---|---|
| Secrets | API keys and tokens in source (known key patterns), secrets in `NEXT_PUBLIC_*` / `VITE_*` variables, committed `.env` files |
| XSS sinks | `dangerouslySetInnerHTML`, `v-html`, `innerHTML`, `eval`, `new Function` fed by user or remote data; **user-uploaded SVG rendered without sanitising** (SVG can carry scripts) |
| Auth on the client | Tokens in `localStorage`, auth decisions made only in client code |
| Server boundaries (Next) | Server actions and API routes that never check the session, open redirects from query parameters |
| Headers | Missing CSP, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy` and `Permissions-Policy` in `next.config`, `vercel.json` or middleware |
| Build | Production source maps exposed, debug flags left on |
| Dependencies | `npm audit` (runs only with the user's consent because it uses the network) |

### Done when

`examples/leaky/` findings are all reported. Secrets are reported with masked values. The report opens with a clear statement of what this audit does not cover.

---

## v0.5 — Professional polish

**Goal:** the details that separate a professional site from a prototype.

### `polish-audit` checks

- **Design system use:** hardcoded colours and spacing versus tokens from `theme.json`, near-duplicate components, inconsistent button and input styles.
- **Code health:** TypeScript `any` and `@ts-ignore` counts, missing lint config, dead components.
- **i18n:** hardcoded Thai or English strings in components (when the project uses i18n), mixed date and number formats.
- **Meta and sharing:** `<title>` and description per page, Open Graph and Twitter images, favicon and app icons, `lang` attribute.
- **Edge pages:** designed 404 and 500 pages, maintenance and offline pages.
- **SEO basics:** `robots.txt`, `sitemap.xml`, canonical URLs, heading order.

### Done when

The audit runs on all examples with no high-severity false positives, and each finding has a concrete fix.

---

## v1.0 — One report, safe fixes

**Goal:** one command gives a prioritised picture of the whole frontend, and fixes are safe to apply.

- **`audit` orchestrator:** runs the selected audits (default: all), merges the findings, removes duplicates, and writes one `audit.md` with a score per area and the top 10 actions.
- **Fix mode:** the user picks findings and Claude applies them one at a time, shows each diff, re-runs that check, and stops on failure. Fixes come from the audits' own playbooks (for example converting images, adding a missing empty state with `svg-motion`, adding headers).
- **Release quality:** full eval suite, GitHub Action running `npm test` and `claude plugin validate`, GitHub Pages gallery of every template in several themes, and a submission to the plugin directory.

### Done when

A first-time user can install the plugin, run one prompt in English or Thai, get a prioritised report on a real project in a few minutes, and apply a fix with a diff they understand.

---

## Decisions

| ID | Decision | Outcome |
|---|---|---|
| D1 | **Plugin name** | **Keep `svg-motion-kit`.** The README's "What the workflow covers" section explains that the kit goes beyond SVG (theme, scout, look, draw, review, report and fix). |
| D2 | **Re-theme the original examples and the icon** | **Done.** The brand is paper, ink and vermilion with a drafting-table look (dot grid, bezier handles). The loader and empty state each have their own palette. The blob hero was replaced by a page that assembles itself. No sparkles or glass. |
| D3 | **Report location** | **`.svg-motion/`**, which follows from D1. `theme.json` today, `audit.md` and `audit.json` from v0.2. |

## Out of scope

- Backend and database performance, infrastructure and load testing.
- Penetration testing or compliance (PCI, SOC 2, PDPA). The security audit is a code-level checklist.
- Generating whole pages or a new design system from scratch.
