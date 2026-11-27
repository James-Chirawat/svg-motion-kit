# polish-audit checks

| id | Severity | Detects |
|---|---|---|
| `polish.tokens.hardcoded-color` | low | Tailwind `bg-[#…]`-style classes or inline `color: "#…"` when the project has a real theme. Skips `components/ui` primitives. |
| `polish.tokens.arbitrary-spacing` | low | 8 or more `p-[13px]`-style spacing values |
| `polish.ui.raw-buttons` | low | 4 or more hand-styled `<button>`s while a Button component exists |
| `polish.code.any` | low (medium at 40 or more) | 10 or more `any` types |
| `polish.code.suppressions` | low | 3 or more `@ts-ignore` / `@ts-nocheck` / file-wide eslint-disable |
| `polish.code.console` | low | 10 or more `console.log` in UI code |
| `polish.code.no-lint` | low | No ESLint, Biome or oxlint config |
| `polish.i18n.hardcoded-text` | medium | JSX text (Thai or multi-word English) outside `t()` when an i18n library (next-intl, i18next, vue-i18n, lingui, paraglide…) is installed |
| `polish.i18n.default-locale` | low | `toLocaleDateString()`, `toLocaleString()` or `Intl.*Format()` without a locale. th-TH shows Buddhist years, and server and client output can differ. |
| `polish.headings.multiple-h1` / `.skip` | low | More than one `<h1>` in a file, or a skipped heading level |
| `polish.meta.missing` / `.description` / `.title-template` / `.og-image` / `.favicon` / `.page-titles` | medium/low | Next app router metadata, including layouts under `[locale]` or route groups. Also icons, Open Graph image, and pages with no title. |
| `polish.meta.viewport` / `.title` / `.description` / `.og-image` / `.favicon` | medium/low | Plain HTML pages (not under scripts, templates or emails) |
| `polish.pages.not-found` / `.error` | low | No `app/not-found.*` or `app/error.*` |
| `polish.seo.robots` / `.sitemap` | low | No robots or sitemap (app route or public file) |
