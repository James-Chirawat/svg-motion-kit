# Roadmap

<p><b>English</b> · <a href="ROADMAP.th.md">ภาษาไทย</a></p>

## Shipped

| Version | Highlights |
|---|---|
| **1.0** | `audit`: one prioritised report across every area, numbered findings, fix mode (one diff at a time, re-checked), and a [gallery](https://james-chirawat.github.io/svg-motion-kit/gallery/) of every template |
| 0.5 | `polish-audit`: metadata, Open Graph, favicon, 404 and error pages, robots and sitemap, i18n, design-system drift |
| 0.4 | `security-audit`: masked secret scan, `.env` hygiene, public env leaks, XSS, unauthenticated routes and server actions, headers |
| 0.3 | `perf-audit`: images, Thai fonts, request waterfalls, N+1 calls, caching, bundles, scripts. Plus a render-and-review preview for `svg-motion` |
| 0.2 | `ui-audit`: UX states, accessibility, WCAG contrast from the theme. Plus Vue and Svelte export |
| 0.1 | `theme-extract`, `svg-motion` (scout, 8 templates, validator, React export), `design-lint` |

See the [changelog](../CHANGELOG.md) for details.

## Next

- **Evals with real projects:** scaffold the example projects into eval cases, so graders reward file-level evidence, not just good advice.
- **Measured performance:** merge Lighthouse results, run with consent, into the `perf-audit` report next to the static findings.
- **More frameworks:** an Astro recipe, plus Nuxt and SvelteKit route conventions for loading, error and not-found states.
- **More templates:** search with no results, payment pending, permissions denied, and onboarding steps.
- **Deeper i18n:** a check that each locale has every message key.

Ideas and requests are welcome in [GitHub issues](https://github.com/James-Chirawat/svg-motion-kit/issues).

## Principles

1. **Evidence, not vibes.** Every finding names a file and line. Deterministic checks are scripts, and Claude handles only the judgement calls.
2. **Read-only by default.** Fixes are opt-in, one at a time, and always shown as a diff first.
3. **Honest limits.** Reports say what static checks cannot see.
4. **The project's own taste.** Colours, fonts and libraries come from the project, never a default "AI" look.
5. **Zero-dependency scripts.** Plain Node 18+, with no network unless the user agrees.
