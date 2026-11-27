---
name: ui-audit
description: Review a frontend's UX and accessibility from its code. Checks for missing loading, empty and error states, unlabeled form fields and icon buttons, images without alt, clickable divs, removed focus outlines, tiny tap targets, hover-only actions, alert() feedback, vague error copy, missing html lang, animations without reduced-motion, and WCAG AA contrast of the real theme colours, all with file:line evidence. Use for "review the UX", "accessibility check", "a11y audit", "is this usable on mobile", "ตรวจ UX", "ตรวจ accessibility", "เว็บใช้งานยากไหม". Read-only unless the user asks for fixes.
---

# ui-audit

Find the user moments that are broken or missing, and the accessibility basics that fail, in order of importance and with evidence.

**Language:** reply in the language the user wrote in, Thai or English. Keep file names, code and CLI output as they are.

## 1. Run it

```bash
node "<skill-dir>/scripts/ui-audit.mjs" "<project>"            # summary
node "<skill-dir>/scripts/ui-audit.mjs" "<project>" --write    # also saves .svg-motion/ui-audit.md + .json
```

It is read-only, uses Node 18+, and makes no network calls. Contrast uses the theme from `theme-extract`, which runs in memory. Checks and their limits are listed in [references/checks.md](references/checks.md).

## 2. Verify before you report

The script is a static scanner. Before reporting any **high** or **medium** finding, open the file and confirm it is real. Drop it if:

- a parent component already handles the state, for example a page wraps the list in `<Suspense>` with a skeleton, or a route has `error.tsx`
- an `outline-none` sits next to a custom focus style the regex didn't see on the same line
- a form field gets its label through a design-system component

Say how many you dropped and why. Never report something you haven't confirmed.

## 3. Report

- Give the score (0–100), then **"Do these first"**: at most 5 confirmed items, ordered by severity, then by effort.
- Show one example `file:line` per check, then the count, the fix, and why it matters in plain words.
- Name what static checks cannot cover: real rendering, screen-reader output, keyboard focus order at runtime. If a dev server is available, offer to check those in a browser.

## 4. Fix (only when asked)

Many findings name a `playbook`:

| playbook | How to fix |
|---|---|
| `add-error-state`, `add-loading-state`, `add-empty-state`, `add-success-state` | Use the **svg-motion** skill with the matching template (`error`, `loader`, `empty-state`, `success`) at that exact file:line. Keep the real text in the page. |
| `adjust-token-contrast` | Change the colour **token** in the theme file (not each component) until it reaches the required ratio in light and dark. Show the new ratio. |
| others | Small direct edits: add `alt`, `aria-label`, `<label htmlFor>`, swap `div onClick` for `<button>`, add `focus-visible:ring-2`, add `lang`. |

Fix one finding at a time and show each diff. Re-run the audit afterwards and report the new score.
