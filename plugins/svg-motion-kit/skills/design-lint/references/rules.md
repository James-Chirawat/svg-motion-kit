# design-lint rules

| Rule | Severity | Weight | Detects | Why it reads as "AI-made" |
|---|---|---|---|---|
| `purple-gradient` | high | 18 | Tailwind `from-indigo/violet/purple/fuchsia-*` to purple or pink; CSS gradients with two or more indigo–magenta stops (hue 235–330°) | It is the default look of generated landing pages, and it carries no brand meaning. |
| `theme-ai-purple` | medium | 10 | Primary colour with a hue of 230–295° (Tailwind indigo-500 `#6366f1` through violet and purple) | The default primary in many starters and generators. Fine when deliberate. |
| `gradient-text` | medium | 9 | `bg-clip-text text-transparent`, `background-clip: text` | Decoration standing in for hierarchy. It hurts legibility and contrast checks. |
| `glow-shadow` | medium | 8 | Coloured shadows (`shadow-purple-500/50`, `shadow-[0_0_…]`), CSS `box-shadow` with 20 px or more of blur in a saturated colour | Neon glow on everything flattens emphasis. |
| `glassmorphism` | medium | 8 | `backdrop-blur` on a surface ≤30% opaque, CSS `backdrop-filter: blur` outside headers and navigation | Low contrast and costly to render. A frosted sticky header (`bg-white/80`) is **not** flagged. |
| `blur-orbs` | medium | 8 | `rounded-full` with `blur-2xl/3xl`, CSS `filter: blur(≥40px)` | Abstract orbs that say nothing about the product. |
| `sparkles` | low | 5 | `Sparkles`/`SparklesIcon`, ✨ | The universal "AI" icon, so it no longer means anything. |
| `emoji-icons` | low | 5 | 3 or more emoji in UI text in one file | Inconsistent rendering across platforms, and a shortcut instead of an icon system. |
| `ai-copy` | low | 4 | 2 or more of: supercharge, unlock the power, seamless, revolutionize, elevate your, next-gen, cutting-edge, AI-powered, effortless, game-changer, 10x, in seconds, unleash, all-in-one platform | Says nothing specific about what the product does for whom. |
| `uniform-cards` | low | 5 | 3 or more `rounded-2xl/3xl` + `shadow-lg/xl/2xl` cards (2 or more with a 3-column grid) | Every section has the same weight, so nothing leads. |
| `pill-badge` | low | 3 | `rounded-full` pill saying New, Introducing, Beta or ✨ | An announcement with nothing to announce. |
| `generic-font` | low | 4 | Only one family, and it is Inter, Geist, Roboto, Arial, system, Open Sans, Lato, Poppins or Montserrat | No typographic voice. |

**Score:** each rule found adds its weight once, and each repeat adds 1 more (up to 5 per rule). The total is capped at 100. Bands are 0–19 distinct, 20–44 some generic patterns, and 45 and up looks AI-generated.

## Thai-capable font pairings (Google Fonts)

| Mood | Display | Text |
|---|---|---|
| Calm, institutional | IBM Plex Sans Thai (600) | IBM Plex Sans Thai (400) |
| Friendly, modern | Anuphan | Noto Sans Thai |
| Editorial, heritage | Noto Serif Thai | Sarabun |
| Technical, sharp | Chakra Petch | Bai Jamjuree |
| Warm, rounded | Mitr | Prompt (300/400) |
| Classic, formal | Taviraj | Sarabun |

Load only the weights you use. Thai fonts are large, so subset them, or use `next/font` with `subsets: ["thai", "latin"]`.

## Building a grounded palette

1. Start from the domain. Pick a material or place (laterite, celadon, indigo cloth, hospital teal, ledger green) or a real asset (logo, product photo).
2. Choose **one** saturated primary. Neutrals carry most of the UI.
3. Build background and ink as tinted neutrals, warmed or cooled toward the primary, rather than pure `#fff` and `#000`.
4. Pick an accent that sits 90–180° from the primary on the hue wheel, and use it sparingly for highlights and motion.
5. Check WCAG AA: ink on background at 4.5:1 or better, and text on primary at 4.5:1 or better (3:1 for large text).
6. Map every colour to an existing variable, so the change is a value change, not a refactor.
