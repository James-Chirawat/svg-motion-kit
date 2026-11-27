---
name: perf-audit
description: Find frontend performance problems visible in the code. Covers heavy PNG/JPEG that should be AVIF/WebP, <img> without next/image or dimensions (layout shift), unprioritised LCP image, Thai fonts in too many weights or without the thai subset, Google Fonts CSS instead of next/font, request waterfalls, N+1 requests in loops, useEffect fetching without cache or abort, caching turned off everywhere, moment/lodash/chart/map libraries loaded up front, "use client" layouts, index keys, render-blocking third-party scripts, layout-property animations, and Lottie weight. Use for "why is my site slow", "performance audit", "optimize loading", "Core Web Vitals", "เว็บช้า", "ตรวจ performance", "ลดขนาดรูป". Read-only unless the user asks for fixes.
---

# perf-audit

Find the performance problems you can see in code, and say clearly which ones need a real measurement.

**Language:** reply in the language the user wrote in, Thai or English. Keep file names, code and CLI output as they are.

## 1. Run it

```bash
node "<skill-dir>/scripts/perf-audit.mjs" "<project>"            # summary
node "<skill-dir>/scripts/perf-audit.mjs" "<project>" --write    # also saves .svg-motion/perf-audit.md + .json
```

It is read-only, uses Node 18+, and makes no network calls. All checks are listed in [references/checks.md](references/checks.md).

## 2. Verify

Before reporting, open the file for each high or medium finding:

- **Waterfall:** do the two calls really not depend on each other? A session or auth check that comes first is a deliberate order, not a waterfall.
- **N+1:** is the loop over a handful of fixed items (fine), or over user data that grows (fix it)?
- **Heavy library:** is it already code-split by the router? For example, a page used only by admins.
- **Image weight:** is the file actually referenced? Unused assets don't slow pages, they just bloat the repo, so say that instead.

## 3. Report

- Give the score, then **"Do these first"**: the confirmed items with the biggest user impact. Images on the first screen, the layout, fonts and waterfalls usually come before index keys.
- For each finding, give the evidence (file:line, size, count), why it matters in plain words, and the fix.
- **Always say what needs measuring:** real Core Web Vitals, bundle size, server timing.
- If the user agrees, and there is a running dev or preview URL, run Lighthouse and add the measured LCP, CLS, INP and total bytes:

  ```bash
  npx lighthouse <url> --only-categories=performance --output=json --quiet
  ```

  Always ask first, because it downloads Lighthouse and loads the site.

## 4. Fix (only when asked)

| playbook / id | Fix |
|---|---|
| `promise-all` (waterfall) | `const [a, b] = await Promise.all([getA(), getB()])`, and keep the error handling. |
| `next-image` | Swap `<img>` for `<Image>` with width, height and alt (or `fill` + `sizes`). Use `priority` only for the LCP image. |
| `perf.image.format` | Convert with the project's tooling if present (sharp, squoosh). Otherwise give the exact commands and let the user run them, and never add a dependency without asking. |
| `perf.font.*` | Switch to `next/font` with `subsets: ["thai", "latin"]` and only the weights that are used. Find them with a grep for font-weight classes. |
| `perf.bundle.dynamic-import` | `next/dynamic(() => import(...), { ssr: false })` or `React.lazy`, with a skeleton from svg-motion's `loader` template. |
| `perf.bundle.client-layout` | Split the interactive parts into small client components, and keep the layout on the server. |

Fix one item at a time and show each diff. Re-run the audit, and re-measure if Lighthouse was used.
