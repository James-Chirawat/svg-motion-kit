# Example projects

Small projects used to test the skills. They are fixtures, so dependencies are not installed.

| Folder | Stack | What it tests |
|---|---|---|
| `next-tailwind/` | Next 15, Tailwind v4, shadcn/ui (oklch), `motion` | `@theme inline`, `.dark` class, next/font, vivid accent from `--chart-*` |
| `vite-tailwind3/` | Vite, React 18, Tailwind v3, shadcn/ui (HSL triplets), `framer-motion` | `hsl(var(--x))` references, `tailwind.config.js` read as text |
| `plain-html/` | HTML + CSS | non-standard names (`--brand`, `--ink`, `--surface`), dark via `prefers-color-scheme` |
| `generic-ai/` | Next 15, Tailwind v4, deliberately generic | `design-lint`: purple gradients, gradient text, glow, glass, blob orbs, sparkles, emoji icons, stock AI copy, card grid |
| `no-theme/` | HTML with hardcoded colours | low confidence and warnings, so the skill must ask the user |

Run the extractor without writing anything:

```bash
node plugins/svg-motion-kit/skills/theme-extract/scripts/extract-tokens.mjs examples/next-tailwind --dry-run
```
