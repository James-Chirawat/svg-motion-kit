#!/usr/bin/env node
// preview.mjs — build a review page for a rendered SVG using the project's real theme variables
//
// Usage: node preview.mjs <file.svg> [--project <dir>] [--out .svg-motion/preview.html]
//
// The page shows the SVG three times: light theme, dark theme (using the project's own dark
// strategy) and reduced motion (animations off), on the project's background colour. Open it in
// a browser to look at the result before placing it. Writes only --out. Zero deps, no network.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Copy :root / .dark / [data-theme] / prefers-color-scheme variable blocks out of a stylesheet. */
export function themeVariableCss(cssText) {
  const css = cssText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]+;|@custom-variant[^;]+;|@tailwind[^;]+;|@apply[^;]+;/g, '');
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[1].trim();
    if (/^(:root|html|\.dark|\.light|\[data-theme[^\]]*\]|:root\.dark|html\.dark|:root\[[^\]]+\])(\s*,\s*[^{]+)?$/.test(sel) && /--[\w-]+\s*:/.test(m[2])) {
      out.push(`${sel} {${m[2].split(';').filter((d) => /^\s*--[\w-]+\s*:/.test(d)).join(';')}; }`);
    }
  }
  // prefers-color-scheme dark blocks
  for (const mm of css.matchAll(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{([\s\S]*?\})\s*\}/g)) {
    out.push(`.smk-preview-dark {${(mm[1].match(/\{([^{}]*)\}/) || [])[1] || ''}}`);
  }
  return out.join('\n');
}

export function buildPreview(svg, theme, cssText) {
  const darkStrategy = theme?.darkMode?.strategy ?? 'none';
  const darkSel = darkStrategy === 'class' ? (theme.darkMode.selector || '.dark').replace(/^\./, '') : null;
  const vars = cssText ? themeVariableCss(cssText) : '';
  const darkAttrs = darkStrategy === 'class' ? `class="${darkSel} smk-preview-dark"` : darkStrategy === 'data-attribute' ? 'data-theme="dark" class="smk-preview-dark"' : 'class="smk-preview-dark"';
  const bg = theme?.roles?.background?.css || '#fff';
  const fg = theme?.roles?.foreground?.css || '#111';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>svg-motion preview</title>
<style>
${vars}
body { margin: 0; font-family: system-ui, sans-serif; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.cell { padding: 24px; background: ${bg}; color: ${fg}; min-height: 260px; }
.cell svg { width: 100%; max-width: 360px; height: auto; display: block; margin: 0 auto; }
.label { font: 12px ui-monospace, monospace; opacity: .7; margin-bottom: 12px; }
.reduced * { animation: none !important; }
</style></head><body>
<div class="grid">
  <div class="cell"><div class="label">light</div>${svg}</div>
  <div ${darkAttrs}><div class="cell"><div class="label">dark (${darkStrategy})</div>${svg}</div></div>
  <div class="cell reduced"><div class="label">reduced motion (animations off)</div>${svg}</div>
</div>
</body></html>
`;
}

async function main(argv) {
  const args = argv.slice(2);
  const get = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
  const file = args.find((a, i) => !a.startsWith('--') && !['--project', '--out'].includes(args[i - 1]));
  if (!file) { console.error('Usage: node preview.mjs <file.svg> [--project dir] [--out file.html]'); process.exit(2); }
  const project = path.resolve(get('--project') || '.');
  const { extractTheme } = await import(pathToFileURL(path.join(HERE, '..', '..', 'theme-extract', 'scripts', 'extract-tokens.mjs')).href);
  let theme = null;
  try { theme = extractTheme(project); } catch { /* no theme */ }
  const mainCss = theme?.sources?.find((s) => s.kind === 'css-variables')?.file;
  const cssText = mainCss ? fs.readFileSync(path.join(project, mainCss), 'utf8') : '';
  const out = get('--out') || path.join(project, '.svg-motion', 'preview.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buildPreview(fs.readFileSync(file, 'utf8'), theme, cssText));
  console.error(`wrote ${out} — open it in a browser (light, dark, reduced motion)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main(process.argv).catch((e) => { console.error(e.message); process.exit(1); });
