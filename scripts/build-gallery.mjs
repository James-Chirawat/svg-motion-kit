#!/usr/bin/env node
// Build docs/gallery/: every svg-motion template rendered with several example themes (standalone mode).
// Usage: npm run gallery   (then enable GitHub Pages from /docs to publish it)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractTheme } from '../plugins/svg-motion-kit/skills/theme-extract/scripts/extract-tokens.mjs';
import { renderTemplate, listTemplates, TEMPLATE_DIR } from '../plugins/svg-motion-kit/skills/svg-motion/scripts/render-template.mjs';
import { validateSvg } from '../plugins/svg-motion-kit/skills/svg-motion/scripts/validate-svg.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(repo, 'docs', 'gallery');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const themes = [
  ['default', 'Template defaults', null],
  ['next-tailwind', 'Next + Tailwind v4 (shadcn, violet)', 'next-tailwind'],
  ['vite-tailwind3', 'Vite + Tailwind v3 (shadcn, blue)', 'vite-tailwind3'],
  ['plain-html', 'Plain HTML (sky + orange)', 'plain-html'],
  ['rough-edges', 'Clinic (teal)', 'rough-edges'],
];
const templates = listTemplates();
let rows = '', count = 0;
for (const [key, label, ex] of themes) {
  const theme = ex ? extractTheme(path.join(repo, 'examples', ex)) : null;
  rows += `<section><h2>${label}</h2><div class="grid">`;
  for (const t of templates) {
    const { svg } = renderTemplate(fs.readFileSync(path.join(TEMPLATE_DIR, `${t.name}.svg`), 'utf8'), theme, { name: t.name, mode: 'standalone', id: `${key.replace(/[^a-z0-9]/g, '')}${t.name.replace(/[^a-z]/g, '')}`.slice(0, 10) });
    const { errors } = validateSvg(svg, { mode: 'standalone' });
    if (errors.length) throw new Error(`${key}/${t.name}: ${JSON.stringify(errors)}`);
    const file = `${key}-${t.name}.svg`;
    fs.writeFileSync(path.join(out, file), svg);
    rows += `<figure><img src="${file}" alt="${t.name} template, ${label}" loading="lazy"><figcaption>${t.name}</figcaption></figure>`;
    count++;
  }
  rows += '</div></section>';
}
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>svg-motion-kit gallery</title><meta name="description" content="Every svg-motion template rendered with different project themes.">
<link rel="icon" href="../assets/icon.svg">
<style>:root{--bg:#F4EFE6;--ink:#1B1A17;--muted:#6F685C;--line:#DDD4C3;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#15130F;--ink:#EDE7DC;--muted:#A39B8E;--line:#2E2A23}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}main{max-width:1200px;margin:0 auto;padding:32px 16px 64px}
h1{font-size:28px;margin:0 0 4px}p{color:var(--muted);margin:0 0 24px}h2{font-size:15px;margin:32px 0 12px;border-bottom:1px solid var(--line);padding-bottom:6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}figure{margin:0}img{width:100%;height:auto;display:block}
figcaption{font:12px ui-monospace,monospace;color:var(--muted);margin-top:4px}a{color:inherit}</style></head><body><main>
<h1>svg-motion-kit gallery</h1>
<p>${templates.length} templates × ${themes.length} themes, rendered by <code>render-template.mjs</code> from each example project's real theme. Same templates, different projects. <a href="../">Home</a> · <a href="https://github.com/James-Chirawat/svg-motion-kit">GitHub</a></p>
${rows}
</main></body></html>
`);
console.log(`gallery: ${count} SVGs, all valid → docs/gallery/`);
