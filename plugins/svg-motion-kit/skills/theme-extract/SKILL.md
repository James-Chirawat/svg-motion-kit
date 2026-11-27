---
name: theme-extract
description: Read a frontend project's real theme (Tailwind v3/v4 config and @theme, CSS custom properties, shadcn/ui tokens, dark mode, radius, fonts, framework and animation libraries) into .svg-motion/theme.json so generated UI and SVG match the project. Use before drawing or styling anything that must fit an existing design, or when asked "what are this project's colours / design tokens / theme", "ดึงธีม", "สีของโปรเจกต์", "design token". Not for creating a new design system from scratch.
---

# Theme extract

Turn the project's existing theme into one small file, `.svg-motion/theme.json`, that other skills (such as `svg-motion`) read instead of guessing colours.

## Steps

1. **Find the project root**, the folder with the app's `package.json` or main stylesheet. In a monorepo, use the app's folder, not the repo root.

2. **Run the extractor** (Node 18 or later, no install needed). It is in `scripts/` inside this skill's base directory:

   ```bash
   node "<skill-base-dir>/scripts/extract-tokens.mjs" "<project-root>"
   ```

   It only reads files and never runs project code. It writes just `<project-root>/.svg-motion/theme.json` and prints a summary. Add `--dry-run` to write nothing, or `--json` to print the full result.

3. **Act on the `confidence` line:**

   | confidence | What to do |
   |---|---|
   | `high` | Continue. Tell the user in one line what was found (framework, primary colour, dark-mode strategy). |
   | `medium`, or any role marked `(guessed)` | Show the guessed roles with their hex values and ask **one** question to confirm, or let the user name the right variable. Update `theme.json` with the answer and remove `"guessed"`. |
   | `low` | No usable theme. Ask the user for a primary colour, and optionally an accent and whether the site has dark mode. Write `theme.json` yourself in the same shape (see the schema), with `"confidence": "user"`. |

4. **Fill gaps only when needed** by reading the project's files yourself:
   - Tailwind v3 colours nested deeper than one level in `tailwind.config.*` (the script reads the config as text).
   - CSS-in-JS themes (MUI `createTheme`, Chakra `extendTheme`, styled-components `ThemeProvider`, Vuetify, Mantine). The script does not parse these. Read the theme file and set `roles` by hand, with `css` set to a literal hex value.
   - Warnings such as "Theme variables found in N files". Check that the main file it picked is the one the app actually imports.

5. **Leave the project's styles alone.** This skill never edits CSS or config. Mention once that `.svg-motion/theme.json` can be regenerated at any time, and let the user decide whether to commit it or add it to `.gitignore`.

## Using theme.json (for other skills)

- **Colour:** use `roles.<role>.css` exactly as given. It is already in the right form: `var(--primary, #7f22fe)` for normal variables, `hsl(var(--primary))` for shadcn's Tailwind v3 HSL triplets, or a literal hex when no runtime variable exists.
- **Tailwind projects:** when `roles.<role>.utility` is set, prefer the class `text-<utility>` on the wrapper with `currentColor` inside the SVG. The colour then follows the theme and dark mode with no extra CSS.
- **Dark mode:** a `var(...)` reference switches automatically. When a role's `css` is a literal hex and `dark` is set, add an override that follows `darkMode.strategy` and `darkMode.selector`: `.dark`, `[data-theme="dark"]` or `@media (prefers-color-scheme: dark)`.
- **Accent:** may be `null` on purpose, because shadcn's `--accent` is a grey hover colour. Use `palette[0]` if present. Otherwise derive the accent from primary with opacity, or ask the user.
- **Shape and type:** use `radius.base` (px) for corner radii. For `<text>`, inherit the page font (`font-family: inherit`) and fall back to `fonts.tokens.sans.css`.
- **Where to put files:** `project.componentDir` and `project.ui` (`react`, `vue`, `svelte`, `html`...). `project.motionLibs` lists animation libraries already installed. Use them only if present, and install nothing without asking.

Field-by-field details are in [references/theme-schema.md](references/theme-schema.md).

## Re-run when

- the user changes colours, fonts or dark mode
- `theme.json` is missing or older than the stylesheet it came from (`sources[].file`)
