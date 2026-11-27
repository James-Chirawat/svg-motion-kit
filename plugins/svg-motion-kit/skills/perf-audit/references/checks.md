# perf-audit checks

| id | Severity | Detects | Notes |
|---|---|---|---|
| `perf.image.format` | high (>500 KB) / medium (>200 KB) / low (>100 KB) | PNG, JPEG, GIF, BMP or TIFF files in the repo | Icons and OG images are skipped. Animated GIFs should become video. |
| `perf.image.weight` | medium | WebP/AVIF over 400 KB | Usually oversized dimensions. |
| `perf.svg.weight` | low | SVG files over 50 KB | Run svgo. |
| `perf.svg.inline-large` | low | Inline `<svg>` over 10 KB in a component | |
| `perf.image.next-img` | medium | `<img>` in a Next project (not SVG or data URIs, and not where the lint is disabled) | |
| `perf.image.dimensions` | medium | `<img>` with no width and height or sizing class | Causes CLS. |
| `perf.image.lcp-priority` | low | First `<Image>` on a page or hero without priority | Verify that it is above the fold. |
| `perf.image.lazy` | low | Images in lists without `loading="lazy"` (non-Next) | |
| `perf.font.next-font` | medium | Google Fonts CSS link in a Next project | |
| `perf.font.display` | low | `@font-face` or a Google Fonts URL without display swap | |
| `perf.font.thai-weights` | medium | Thai family loaded with more than 3 weights (Google URL or next/font) | 33 Thai families are recognised. |
| `perf.font.thai-subset` | medium | Thai family via next/font without `subsets: ["thai"]` | |
| `perf.font.families` | low | More than 3 families | |
| `perf.fetch.waterfall` | medium | Two `await`s of requests back to back, where the second doesn't use the first | Skipped when a guard (`if (!x) return`) sits between them. |
| `perf.fetch.loop` | medium | `await` of a request inside `for…of` (N+1) | |
| `perf.fetch.foreach-async` | medium | `.forEach(async …)` | |
| `perf.fetch.effect` | low | `useEffect` fetching with no SWR, React Query or Apollo in the project | |
| `perf.fetch.no-abort` | low | `useEffect` fetching with no AbortController or ignore flag | |
| `perf.cache.all-dynamic` | medium | 3 or more of `no-store`, `force-dynamic`, `revalidate = 0` (Next) | |
| `perf.bundle.client-layout` | high | `"use client"` in an app router layout | |
| `perf.bundle.moment` / `.lodash` / `.barrel-icons` / `.jquery` | medium | Known heavy imports | |
| `perf.bundle.dynamic-import` | medium | Charts, maps, editors, PDF, spreadsheet, 3D or Lottie libraries imported statically in client code | 28 libraries are recognised. |
| `perf.render.index-key` | low | `key={index}` | Static literal lists and skeletons are skipped. |
| `perf.third-party.script` | medium | External `<script>` outside next/script, or blocking (no async/defer) | |
| `perf.motion.layout` | medium | `@keyframes` animating width, height, top, left, margin or padding | |
| `perf.motion.lottie` | low | Lottie runtime in dependencies | |

Skipped: generated code (`generated/`, `.prisma/`), minified bundles, tests, fixtures and mockups.

**Measure instead of guessing:** LCP, INP and CLS (Lighthouse, PageSpeed Insights, CrUX), bundle size (`@next/bundle-analyzer`, `vite-bundle-visualizer`), and server timing.
