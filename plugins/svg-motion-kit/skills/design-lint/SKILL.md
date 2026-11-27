---
name: design-lint
description: Check whether a website or app looks generically AI-generated (indigo/violet/purple gradients, gradient text, glow, glassmorphism, blurred blob orbs, sparkle and emoji icons, stock "supercharge/seamless" copy, identical card grids, default fonts) and propose three grounded design directions. Use when asked "does this look AI-made", "make it look less generic / more unique / more professional", "review the visual design", "ทำไมเว็บดูเหมือน AI ทำ", "ดีไซน์ดูธรรมดา", "อยากให้เว็บไม่เหมือนใคร". Read-only; does not redesign or edit code unless the user then asks.
---

# design-lint

Find the visual clichés that make a site look AI-generated, with file:line evidence. Then propose three design directions grounded in who the product is for. The lint is a script, and the directions take judgement.

The script is in `scripts/` inside this skill's base directory. It is plain Node 18+, read-only, with no network.

**Language:** reply in the language the user wrote in, Thai or English. Keep file names, code and CLI output as they are.

## 1. Run the lint

```bash
node "<skill-dir>/scripts/lint-design.mjs" "<project>"          # summary
node "<skill-dir>/scripts/lint-design.mjs" "<project>" --json   # full findings
```

It returns a **genericness score from 0 to 100**:

| Score | Meaning |
|---|---|
| 0–19 | distinct |
| 20–44 | some generic patterns |
| 45 and up | looks AI-generated |

Each finding comes with a fix. Rules and why each one matters are in [references/rules.md](references/rules.md).

Report the score and the top findings grouped by rule, each with one example `file:line`. Don't paste every hit.

- **Be fair.** A finding is a signal, not a verdict. A violet brand chosen on purpose is fine: say so, and drop `theme-ai-purple` from the advice.
- **Check context.** A frosted sticky header or a real modal overlay is not "glassmorphism"; ignore those hits.

## 2. Understand the product before proposing anything

Read the README, `package.json` description, page titles and hero copy to learn:
- **audience:** who uses it, which language, and what context (mobile in a market, office desktop, older users…)
- **domain:** healthcare, local tourism, logistics, school, government…
- **tone:** trustworthy, playful, calm, urgent…

If these are unclear after reading, ask **one** question about them.

## 3. Propose three directions

Each direction has a name and one sentence on why it fits *this* audience. Give it:

- **Palette:** 5 colours (background, ink, primary, accent, muted) as hex, each mapped to the project's existing variables (from `.svg-motion/theme.json` or `theme-extract`), so adopting it means changing values rather than refactoring. Check WCAG AA contrast for ink on background and for text on primary.
- **Type:** a display face and a text face available on Google Fonts. For Thai UIs both must have good Thai glyphs (see the font list in `references/rules.md`).
- **Shape and texture:** radius, borders versus shadows, and one motif that comes from the domain, such as a laterite texture for heritage, a ruled ledger for finance, or a route line for logistics.
- **Motion:** what moves and why, with templates from `svg-motion` that would fit.
- **What to remove:** the specific findings this direction deletes.

Make the three directions really different from each other, for example one conservative, one editorial and one bold. None of them may fall back on violet gradients, glass or sparkles.

## 4. Stop and ask

End with the three directions and ask which one to apply, if any. When the user picks one:

- change theme values first (CSS variables, Tailwind `@theme` or config), then the flagged components
- show each diff before writing
- re-run the lint, and report the before and after score

Never rewrite copy or layout the user didn't ask about.
