---
name: svg-motion
description: Find where a frontend needs an animated illustration (empty, loading, error, success, offline, upload, hero) and add theme-true animated SVG there as a component that follows the project's colours and dark mode. Use when asked to add an animated SVG, illustration, loader, skeleton, empty state, error or success state, or "make this page feel less empty / more alive", "ใส่ SVG เคลื่อนไหว", "ทำ loader", "ภาพ empty state", "หน้าโหลด", "ภาพประกอบ". Not for logos, icons sets, video, Lottie or GIF export.
---

# svg-motion

Add animated SVG that looks like it belongs to *this* project, in the places where it helps users most. Colours, radius and fonts come from the project's theme. Nothing is guessed, and nothing is written without showing a diff.

All scripts are in `scripts/` inside this skill's base directory. They are plain Node 18+, read-only unless you pass `--out`, and make no network calls.

**Language:** reply in the language the user wrote in, Thai or English. Keep file names, code and CLI output as they are.

## Workflow

### 1. Theme

If `<project>/.svg-motion/theme.json` is missing or older than the stylesheet it came from, run the `theme-extract` skill first. If its confidence is `low`, or a role it needs is marked `guessed`, settle that with the user before drawing.

### 2. Scout (skip if the user already named the spot)

```bash
node "<skill-dir>/scripts/scout.mjs" "<project>" --top 8
```

Show the user the top 3–5 spots in a short table (file:line, moment, template, why) and ask **one** question: which ones to do. Prefer spots marked "plain text today" over ones already illustrated. Errors and empty states beat hero art.

### 3. Render from a template

Pick the template the scout suggested (`--list` shows them all; details in [references/templates.md](references/templates.md)):

```bash
node "<skill-dir>/scripts/render-template.mjs" empty-state --project "<project>" --no-text --bare --out /tmp/orders-empty.svg
```

- **Inside a component or page:** use the default `inline` mode, plus `--no-text`. The words stay in the page as real text, so they remain translatable, selectable and readable by screen readers. Add `--bare` when the SVG sits in an existing card.
- **For `<img src>`, a README or email:** use `--mode standalone`, and keep the text with `--text title="…"`.
- Write texts in the UI's own language (Thai UI → Thai text) and keep them as short as the existing copy.

### 4. Adjust only if the spot needs it

Adjust the composition by hand only when the moment needs something the template lacks, such as a different metaphor or proportions. Keep the template's rules:

- colours only through the `--c-*` properties
- every selector scoped with the template's `.smk-…` class
- intros play once, and loops stay calm
- animate only `transform`, `opacity` and stroke dashes
- no sparkles, glass, blobs or purple gradients unless that is the project's real theme

### 5. Validate (must pass with zero errors)

```bash
node "<skill-dir>/scripts/validate-svg.mjs" /tmp/orders-empty.svg            # inline
node "<skill-dir>/scripts/validate-svg.mjs" docs/hero.svg --mode standalone   # img/README
```

Fix every error. Treat warnings as things to explain or fix. A `colour` warning means the theme had no token for that role, so mention it to the user.

### 6. Place it

**React / Next / Remix / Vite-React:** turn it into a component in `project.componentDir` (from `theme.json`), under an `illustrations/` folder:

```bash
node "<skill-dir>/scripts/to-component.mjs" /tmp/orders-empty.svg --name OrdersEmpty --out "<project>/components/illustrations/OrdersEmpty.tsx"
```

Use `--js` for JavaScript projects. Then edit the spot the scout found:

- keep the existing text, and put the illustration above it
- pass `decorative` when that text says the same thing as the picture (the usual case)
- size it with the project's styling (`className="mx-auto w-56 h-auto"` for Tailwind)
- the component uses no hooks and needs no `"use client"`

**Plain HTML:**
- inline mode: paste the SVG where it belongs
- standalone mode: save it under the site's assets and use `<img src="…" alt="…">`, or `alt=""` when decorative

**Vue and Svelte:** use the same script with `--out …/OrdersEmpty.vue` or `--out …/OrdersEmpty.svelte`. The target follows the extension, or you can pass `--target vue|svelte`.
- Vue gets `<script setup>` props (`title`, `decorative`, `idSuffix`) and a non-scoped `<style>`. The classes are already unique, and `class` merges onto the `<svg>`.
- Svelte gets `export let` props, a `class` prop, and `:global()` CSS, so Svelte's scoping leaves the animations intact.

**Astro:** paste the inline SVG into the `.astro` file. Its `<style>` already only matches this illustration.

Show the diff and ask before writing. Never install packages, never edit the theme, and add at most one animated illustration per view.

### 7. Check it

- If a dev server or browser is available, open the page in light and dark mode, and once with reduced motion.
- If not, tell the user exactly where to look.
- Report: what was added and where, which theme roles it used, and anything that fell back to a default colour.

## Good judgement

- **Motion should mean something.** Use a tick for saved, a plug for offline, progress for upload. Never animate for decoration alone.
- **Errors stay calm.** One small shake, never a loop.
- **Keep it quiet around reading content.** Use one illustration per screen at most, and never animate inside lists or tables.
- If the scout finds nothing, say so. Don't invent spots.
