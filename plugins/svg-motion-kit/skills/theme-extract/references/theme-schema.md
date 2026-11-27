# `.svg-motion/theme.json` schema (version 1)

The extractor writes this file and other skills read it. When you write it by hand (low confidence, CSS-in-JS themes), keep the same shape and set `"confidence": "user"`.

## Top level

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | `1` | Bumped only on breaking changes. |
| `generatedAt` | ISO date | When the file was written. |
| `generator` | string | `svg-motion-kit/theme-extract`, or `user` when written by hand. |
| `confidence` | `high` \| `medium` \| `low` \| `user` | `high` means background, foreground and primary all came from real variables, none guessed. |
| `project` | object | See below. |
| `darkMode` | `{ strategy, selector }` | `strategy` is `class`, `data-attribute`, `media` or `none`. `selector` is, for example, `.dark`, `[data-theme="dark"]` or `@media (prefers-color-scheme: dark)`. |
| `roles` | object | Semantic colours. See below. Each value may be `null`. |
| `palette` | array | Extra colourful tokens for decoration (shadcn `--chart-*` first), each `{ var, css, light, dark }`. |
| `radius` | `{ base, tokens }` | `base` is the main radius in px (`--radius`, `--radius-lg` or `--radius-md`). `tokens` maps each radius variable to `{ value, px }`. |
| `fonts` | `{ tokens, families }` | `tokens.sans` and the like are `{ css, family, source }`. `families` lists font names found in next/font imports, Google Fonts links and @fontsource. |
| `sources` | array | Files the values came from: `{ file, kind, count? }`. |
| `warnings` | string[] | Things to check or ask about. |

## `project`

| Field | Example | Notes |
|---|---|---|
| `root` | `"."`, `"web"` | Folder with the app's package.json, relative to where the script ran. |
| `framework` | `next`, `react-router`, `nuxt`, `sveltekit`, `astro`, `vue`, `svelte`, `react`, `html`, `unknown` | Read from dependencies. |
| `frameworkVersion` | `15` | Major version or `null`. |
| `ui` | `react`, `vue`, `svelte`, `angular`, `astro`, `solid`, `html` | Which component syntax to write. |
| `typescript` | `true` | Write `.tsx` or `.ts` when true. |
| `tailwind` | `{ version, config, css }` or `null` | `config` is the v3 config file. `css` is the v4 entry stylesheet. |
| `shadcn` | `{ style, baseColor }` or `null` | From `components.json`. |
| `motionLibs` | `["motion"]` | Animation libraries already installed. |
| `iconLibs` | `["lucide-react"]` | Icon libraries already installed. |
| `componentDir` | `"src/components"` | Where components live: shadcn alias first, then common folders. |

## `roles`

Keys: `background`, `foreground`, `primary`, `primaryForeground`, `accent`, `muted`, `mutedForeground`, `border`, `card`, `destructive`.

| Field | Example | Meaning |
|---|---|---|
| `var` | `"--primary"` | Source variable, or `null` for a tailwind.config literal. |
| `css` | `"var(--primary, #7f22fe)"`, `"hsl(var(--primary))"`, `"#0ea5e9"` | **What to write in CSS or SVG.** Includes a fallback when safe. |
| `light` | `"#7f22fe"` | Resolved colour in the light theme (`#rrggbb` or `#rrggbbaa`). |
| `dark` | `"#8e51ff"` or `null` | Resolved dark-theme colour, or `null` when it is the same or unknown. |
| `utility` | `"primary"` or `null` | Tailwind colour name, so `text-primary`, `fill-primary` and `stroke-primary` exist. |
| `vivid` | `0.86` | sRGB chroma from 0 to 1. Greys and pale tints sit below 0.25. |
| `source` | `"app/globals.css"` | File it came from. |
| `guessed` | `true` (only when present) | Picked from a brand-like name such as `--brand-blue`, or from the first colourful variable. **Confirm with the user.** |
| `note` | string (only when present) | For example, an `@theme inline` value that does not exist at runtime. |

### How roles are chosen

1. Conventional names first, for example `--primary`, `--color-primary`, `--brand`, `--bs-primary`, `--background`, `--surface`, `--foreground`, `--ink`, `--border` or `--line`.
2. `accent` must be colourful (`vivid` ≥ 0.25). shadcn's grey `--accent` is skipped in favour of `--chart-2`.
3. If nothing matches, `primary` and `accent` may come from brand-like names (`--nl-primary`, `--brand-accent`), and `primary` may come from the first colourful variable. These are marked `guessed`.
4. Status colours (`destructive`, `success`, `warning`, `info`...) never become `accent`.

## Minimal hand-written example

```json
{
  "schemaVersion": 1,
  "generator": "user",
  "confidence": "user",
  "project": { "root": ".", "framework": "html", "ui": "html", "typescript": false, "tailwind": null, "shadcn": null, "motionLibs": [], "iconLibs": [], "componentDir": null },
  "darkMode": { "strategy": "none", "selector": null },
  "roles": {
    "background": { "var": null, "css": "#ffffff", "light": "#ffffff", "dark": null },
    "foreground": { "var": null, "css": "#1f2937", "light": "#1f2937", "dark": null },
    "primary":    { "var": null, "css": "#e11d48", "light": "#e11d48", "dark": null },
    "accent": null, "primaryForeground": null, "muted": null, "mutedForeground": null, "border": null, "card": null, "destructive": null
  },
  "palette": [],
  "radius": { "base": 8, "tokens": {} },
  "fonts": { "tokens": {}, "families": ["Arial"] },
  "sources": [{ "file": "index.html", "kind": "user" }],
  "warnings": []
}
```
