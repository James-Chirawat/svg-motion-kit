# svg-motion templates

Templates live in `../templates/*.svg`. `scripts/render-template.mjs` fills them from `.svg-motion/theme.json`, so the colours come from the project and are never guessed.

```bash
node scripts/render-template.mjs --list
node scripts/render-template.mjs success --project . --text title="Order placed" --out components/illustrations/order-placed.svg
node scripts/validate-svg.mjs components/illustrations/order-placed.svg
```

## Catalogue

| Template | Use it for | Motion | Size |
|---|---|---|---|
| `loader` | Replacing a bare "Loading…" | spinner, skeleton shimmer | 360×140 |
| `empty-state` | Empty lists, no search results | box floats, document peeks | 360×264 |
| `error` | Failed load or save, with a retry | connection snaps, alert shakes once | 360×264 |
| `success` | After save, submit, payment | tick draws, rays burst once, ring pulse | 360×264 |
| `offline` | Lost connection | plug reaches, never connects, retry dots | 360×264 |
| `upload` | File upload in progress | progress fills, tick lands | 360×140 |
| `line-draw` | Stats, dashboards, banners | line draws, points pop, bead travels | 360×200 |
| `hero` | Landing hero for page-building or editing products | page assembles, cursor clicks | 400×300 |

## Modes

| Mode | Colours become | Use for |
|---|---|---|
| `inline` (default) | the project's variables, e.g. `var(--primary, #7f22fe)` or `hsl(var(--primary))` | components and pages, where it follows the theme and dark mode automatically |
| `standalone` | literal light colours plus an `@media (prefers-color-scheme: dark)` block | `<img src>`, README files, email, anywhere page CSS can't reach |

`--bare` removes the template's background card (`data-smk-card`), for when the SVG sits inside an existing card.

## Writing a template

```svg
<!-- smk: one sentence on when to use it. Roles: … Texts: … -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 264" width="360" height="264"
     class="__S__" role="img" aria-labelledby="smk-title-__U__">
  <title id="smk-title-__U__">{{text:title|Default title}}</title>
  <style>
    .__S__ {
      --c-bg: {{background|#F4F1EA~#121814}};
      --c-primary: {{primary|#1F6F4A~#4FB286}};
      --c-accent: {{accent|primary|#B8922A~#D9B84A}};
      --c-soft: color-mix(in srgb, var(--c-primary) 16%, var(--c-bg));
    }
    {{dark}}
    .__S__ text { font-family: {{font}}; }
    .__S__ .card { fill: var(--c-bg); }
    .__S__ .tick { animation: __K__-draw .7s both; }
    @keyframes __K__-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @media (prefers-reduced-motion: reduce) { .__S__ * { animation: none !important; } }
  </style>
  <rect class="card" data-smk-card x="1" y="1" width="358" height="262" rx="{{radius|20}}"/>
  …
</svg>
```

| Placeholder | Becomes |
|---|---|
| `{{role|role2|#light~#dark}}` | The first role the theme has (`background`, `foreground`, `primary`, `primaryForeground`, `accent`, `muted`, `mutedForeground`, `border`, `card`, `destructive`), else the light~dark fallback. Use it only as the value of a `--c-*` custom property. |
| `{{text:key|default}}` | Escaped text, overridable with `--text key=value`. |
| `{{font}}` | `inherit` in inline mode, or the project font plus a system stack in standalone mode. |
| `{{radius|20}}` | The theme radius × 1.5 (clamped 6–28), else the default. |
| `{{dark}}` | Dark overrides for colours that are literal (fallbacks, or standalone mode). Uses the project's dark-mode strategy: `.dark`, a `data-theme` attribute, or the media query. |
| `__S__` | Unique scope class, e.g. `smk-success-a1b2c3`. **Every selector starts with `.__S__`**, because `<style>` inside an inline SVG applies to the whole page. |
| `__K__` | Keyframe prefix, `smk-<template>`. |
| `__U__` | Unique suffix for every `id`, so two copies on one page don't clash. |

Rules every template must follow (`validate-svg.mjs` enforces them):

- Colours only through `--c-*` properties, `var()` or `color-mix()` of them, or `currentColor`.
- Animate `transform`, `opacity`, `stroke-dashoffset` and `stroke-dasharray` only. Intros play once. Loops stay calm and never flash more than 3 times a second.
- Include `prefers-reduced-motion: reduce`, and make the resting state look finished with no animation at all.
- Use `role="img"` with a `<title>`, or `aria-hidden="true"` when the SVG is purely decorative.
- No scripts, event handlers, external references or `<foreignObject>`. Keep it under 15 KB.
- No clichés: no sparkles, glass, blobs, or purple gradients unless the project's own theme is purple.
