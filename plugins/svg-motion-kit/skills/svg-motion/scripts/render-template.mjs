#!/usr/bin/env node
// render-template.mjs — fill an svg-motion template with a project's theme
//
// Usage:
//   node render-template.mjs <template-name|file.svg> [--theme .svg-motion/theme.json | --project <dir>]
//        [--mode inline|standalone] [--id <suffix>] [--text key=value]... [--bare] [--out file.svg]
//   node render-template.mjs --list
//
//   inline      (default) colours reference the page's CSS variables, e.g. var(--primary, #7f22fe),
//               so the SVG follows the theme and dark mode. Use this inside components.
//   standalone  colours are literal, with a prefers-color-scheme dark block. Use for <img>/README.
//   --bare      drop the template's background card (elements marked data-smk-card)
//
// Template syntax (see ../references/templates.md):
//   {{primary|accent|#E2462B~#FF6A4D}}  first theme role that exists, else light~dark fallback
//   {{text:title|Changes saved}}        text, overridable with --text title="..."
//   {{font}} {{radius|12}} {{dark}}      font stack, theme radius in px, generated dark overrides
//   __S__ scope class, __K__ keyframe prefix, __U__ unique id suffix
//
// Zero dependencies, no network. Writes only --out (or prints to stdout).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const TEMPLATE_DIR = path.join(HERE, '..', 'templates');
const SYSTEM_FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const escapeXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function listTemplates() {
  return fs.readdirSync(TEMPLATE_DIR).filter((f) => f.endsWith('.svg')).map((f) => {
    const text = fs.readFileSync(path.join(TEMPLATE_DIR, f), 'utf8');
    const meta = text.match(/<!--\s*smk:([\s\S]*?)-->/);
    return { name: f.replace(/\.svg$/, ''), about: meta ? meta[1].trim().replace(/\s+/g, ' ') : '' };
  });
}

function resolveTemplate(nameOrFile) {
  if (fs.existsSync(nameOrFile) && nameOrFile.endsWith('.svg')) return { name: path.basename(nameOrFile, '.svg'), text: fs.readFileSync(nameOrFile, 'utf8') };
  const file = path.join(TEMPLATE_DIR, `${nameOrFile}.svg`);
  if (!fs.existsSync(file)) throw new Error(`Unknown template "${nameOrFile}". Available: ${listTemplates().map((t) => t.name).join(', ')}`);
  return { name: nameOrFile, text: fs.readFileSync(file, 'utf8') };
}

/** Pick the first role in `chain` that the theme has; returns { css, light, dark, role } or the literal fallback. */
function pickColour(chain, fallback, theme, mode) {
  for (const role of chain) {
    const r = theme?.roles?.[role];
    if (!r) continue;
    const css = mode === 'standalone' ? r.light : r.css;
    return { role, css, light: r.light, dark: r.dark, literal: !/var\(/.test(css) };
  }
  const [light, dark] = (fallback || '#888888').split('~');
  return { role: null, css: light, light, dark: dark || null, literal: true, fallback: true };
}

function darkWrapper(theme, mode, body, scope) {
  if (!body.length) return '';
  const decls = body.join(' ');
  const strategy = mode === 'standalone' ? 'media' : theme?.darkMode?.strategy ?? 'media';
  if (strategy === 'class' || strategy === 'data-attribute') {
    const sel = theme?.darkMode?.selector || (strategy === 'class' ? '.dark' : '[data-theme="dark"]');
    return `${sel} .${scope} { ${decls} }`;
  }
  if (strategy === 'none' && mode === 'inline' && theme) return '';
  return `@media (prefers-color-scheme: dark) { .${scope} { ${decls} } }`;
}

/**
 * Render a template. Returns { svg, name, scope, used, missing } where `used` maps each custom
 * property to the theme role (or fallback) that filled it.
 */
export function renderTemplate(templateText, theme, { name = 'svg', mode = 'inline', id, texts = {}, bare = false } = {}) {
  const uid = (id || crypto.randomBytes(3).toString('hex')).replace(/[^a-z0-9]/gi, '').toLowerCase();
  const scope = `smk-${name}-${uid}`;
  const used = {};
  const missing = new Set();
  const darkDecls = [];

  let svg = templateText.replace(/<!--\s*smk:[\s\S]*?-->\s*/, '');

  // Colour declarations: --c-x: {{role|role2|#light~#dark}};
  svg = svg.replace(/(--[\w-]+)\s*:\s*\{\{([a-zA-Z|]+)(?:\|(#[0-9a-fA-F]{3,8}(?:~#[0-9a-fA-F]{3,8})?))?\}\}/g, (_, prop, chainText, fallback) => {
    const chain = chainText.split('|').filter(Boolean);
    const c = pickColour(chain, fallback, theme, mode);
    used[prop] = c.role ?? `fallback ${c.light}`;
    if (c.fallback && theme) missing.add(chain[0]);
    // Dark values only need writing when the colour is literal (var() references switch by themselves).
    if (c.literal && c.dark) darkDecls.push(`${prop}: ${c.dark};`);
    return `${prop}: ${c.css}`;
  });

  const font = mode === 'inline' ? 'inherit'
    : [...(theme?.fonts?.families || []).slice(0, 1).map((f) => `"${f}"`), SYSTEM_FONT].join(', ');
  const radius = theme?.radius?.base;

  svg = svg
    .replace(/\{\{text:([\w-]+)\|([^}]*)\}\}/g, (_, key, def) => escapeXml(texts[key] ?? def))
    .replace(/\{\{font\}\}/g, font)
    .replace(/\{\{radius\|(\d+(?:\.\d+)?)\}\}/g, (_, def) => String(radius != null ? Math.min(Math.max(radius * 1.5, 6), 28) : def))
    .replace(/\{\{dark\}\}/g, darkWrapper(theme, mode, darkDecls, scope))
    .replace(/__S__/g, scope)
    .replace(/__K__/g, `smk-${name}`)
    .replace(/__U__/g, uid);

  if (bare) svg = svg.replace(/\s*<[^>]*\bdata-smk-card\b[^>]*\/>/g, '');
  svg = svg.replace(/\s*data-smk-card(="[^"]*")?/g, '');

  const leftover = svg.match(/\{\{[^}]*\}\}/);
  if (leftover) throw new Error(`Unfilled placeholder ${leftover[0]} in template ${name}`);
  return { svg, name, scope, used, missing: [...missing] };
}

async function loadTheme(args) {
  const tIdx = args.indexOf('--theme');
  if (tIdx >= 0) return JSON.parse(fs.readFileSync(args[tIdx + 1], 'utf8'));
  const pIdx = args.indexOf('--project');
  if (pIdx >= 0) {
    const { extractTheme } = await import(pathToFileURL(path.join(HERE, '..', '..', 'theme-extract', 'scripts', 'extract-tokens.mjs')).href);
    return extractTheme(args[pIdx + 1]);
  }
  const auto = path.join(process.cwd(), '.svg-motion', 'theme.json');
  return fs.existsSync(auto) ? JSON.parse(fs.readFileSync(auto, 'utf8')) : null;
}

async function main(argv) {
  const args = argv.slice(2);
  if (args.includes('--list')) {
    for (const t of listTemplates()) console.log(`${t.name.padEnd(12)} ${t.about}`);
    return;
  }
  const valueFlags = ['--theme', '--project', '--mode', '--id', '--text', '--out'];
  const positional = args.filter((a, i) => !a.startsWith('--') && !valueFlags.includes(args[i - 1]));
  if (!positional.length) {
    console.error('Usage: node render-template.mjs <template> [--theme file | --project dir] [--mode inline|standalone] [--text key=value] [--bare] [--out file]');
    process.exit(2);
  }
  const get = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
  const texts = {};
  args.forEach((a, i) => { if (a === '--text') { const [k, ...v] = args[i + 1].split('='); texts[k] = v.join('='); } });
  const theme = await loadTheme(args);
  const { name, text } = resolveTemplate(positional[0]);
  const res = renderTemplate(text, theme, { name, mode: get('--mode') || 'inline', id: get('--id'), texts, bare: args.includes('--bare') });
  const out = get('--out');
  if (out) {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, res.svg);
  } else process.stdout.write(res.svg);
  const notes = [`rendered ${name} (${get('--mode') || 'inline'}) → ${out || 'stdout'}`, `scope .${res.scope}`];
  if (!theme) notes.push('no theme found: used the template fallbacks (run theme-extract first)');
  for (const [prop, src] of Object.entries(res.used)) notes.push(`  ${prop.padEnd(12)} ${src}`);
  if (res.missing.length) notes.push(`theme has no ${res.missing.join(', ')}; used fallbacks`);
  console.error(notes.join('\n'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main(process.argv).catch((e) => { console.error(e.message); process.exit(1); });
