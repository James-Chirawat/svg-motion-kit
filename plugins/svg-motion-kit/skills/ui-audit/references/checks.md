# ui-audit checks

| id | Severity | Detects | Standard | Known limits |
|---|---|---|---|---|
| `ux.states.error` | high | A file fetches data (fetch, axios, SWR, React Query, useFetch, DB calls) with no error branch (`error`, `isError`, `catch`, `!res.ok`, ErrorBoundary), and no `error.tsx` up the Next app tree | — | A parent may handle it, so verify. |
| `ux.states.loading` | medium | Same, with no loading branch (`isLoading`, `pending`, `<Suspense>`, Skeleton) and no `loading.tsx` | — | Includes form posts with no pending state. |
| `ux.states.empty` | low | Fetches and renders a list (`.map`, `v-for`, `{#each}`) with no empty branch | — | Lists that can never be empty are false positives. |
| `ux.tap-target` | low | Buttons sized `h/size-4…7` or icon buttons padded `p-0/1` | WCAG 2.5.8 (24px minimum), 44px recommended | Only Tailwind classes are read. |
| `ux.hover-only` | medium | `opacity-0` revealed only by `hover:` or `group-hover:` | — | |
| `ux.form.feedback` | low | Form submit that reports with `alert()` | — | |
| `ux.copy.vague-error` | low | Visible "Error", "Something went wrong", "เกิดข้อผิดพลาด" with no retry, contact or next step nearby | — | Only JSX/HTML text and strings passed to alert, toast or setError. |
| `a11y.contrast` | high/medium | Theme text pairs below AA: text 4.5:1, primary on background 3:1, light and dark | WCAG 1.4.3 / 1.4.11 | Uses theme tokens; one-off hex colours in components are not checked. |
| `a11y.img-alt` | medium | `<img>`/`<Image>` with no `alt` | WCAG 1.1.1 | |
| `a11y.input-label` | medium | input, select or textarea with no `<label htmlFor>`, wrapping label, `aria-label(ledby)` or spread props | WCAG 1.3.1, 4.1.2 | Skips `components/ui/` primitives. |
| `a11y.icon-button` | medium | `<button>` containing only an icon or `<svg>`, with no aria-label, title or sr-only text | WCAG 4.1.2 | |
| `a11y.click-div` | medium | `onClick` on div, span, li, td, p or img without an interactive `role` | WCAG 2.1.1 | |
| `a11y.focus-outline` | medium | `outline-none` without `focus(-visible):ring/outline/border/shadow` on the same element, with no `focus-within` wrapper, and not `tabIndex={-1}` | WCAG 2.4.7 | Multi-line classNames can hide a ring, so verify. |
| `a11y.tabindex` | low | tabIndex above 0 | WCAG 2.4.3 | |
| `a11y.html-lang` | medium | `<html>` with no `lang` | WCAG 3.1.1 | |
| `a11y.reduced-motion` | medium | Animations (CSS keyframes, animate-*, framer-motion, GSAP) with no reduced-motion handling anywhere in the project | WCAG 2.3.3 | Project-level signal. |

Skipped paths: tests, stories, fixtures, `design-mockups/`, `mockups/`, `prototypes/`, `*.dc.html`, build output and dependencies.

**Score:** start at 100. Each distinct check costs high 12, medium 5 and low 2, and each repeat costs 1 more (up to 3).
