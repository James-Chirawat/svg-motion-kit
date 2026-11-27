#!/usr/bin/env node
// extract-tokens.mjs — read a frontend project's theme into .svg-motion/theme.json
//
// Usage: node extract-tokens.mjs [projectDir] [--dry-run] [--json] [--out <file>]
//   --dry-run   do not write anything
//   --json      print the full JSON result instead of the summary
//   --out       write somewhere other than <projectDir>/.svg-motion/theme.json
//
// Zero dependencies, no network. It only reads files under projectDir and
// (unless --dry-run) writes a single file: <projectDir>/.svg-motion/theme.json.
// It never executes project code: tailwind.config.* is read as text.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const SCHEMA_VERSION = 1;

const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.output', '.astro', 'dist', 'build', 'out',
  'coverage', '.turbo', '.vercel', '.netlify', 'vendor', '.svg-motion', '.cache', 'storybook-static',
  'env', 'venv', 'site-packages', '__pycache__', 'target', 'Pods', 'DerivedData',
]);
const MAX_FILES = 5000;
const MAX_BYTES = 512 * 1024;
const MAX_DEPTH = 8;
const STYLE_EXT = new Set(['.css', '.scss', '.sass', '.less', '.pcss', '.postcss']);
const MARKUP_EXT = new Set(['.html', '.vue', '.svelte', '.astro']);
const ENTRY_RE = /(^|\/)((src\/)?app\/layout|pages\/_app|pages\/_document|src\/main|src\/index|app\/root|src\/routes\/\+layout)\.(t|j)sx?$/;

// ---------------------------------------------------------------- files

function walk(root) {
  const files = [];
  const visit = (dir, depth) => {
    if (depth > MAX_DEPTH || files.length >= MAX_FILES) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (files.length >= MAX_FILES) return;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!IGNORE_DIRS.has(e.name) && !e.name.startsWith('.')) visit(full, depth + 1);
      } else if (e.isFile()) {
        files.push(path.relative(root, full).split(path.sep).join('/'));
      }
    }
  };
  visit(root, 0);
  return files;
}

function read(root, rel) {
  try {
    const full = path.join(root, rel);
    if (fs.statSync(full).size > MAX_BYTES) return null;
    return fs.readFileSync(full, 'utf8');
  } catch { return null; }
}

function readJson(root, rel) {
  const t = read(root, rel);
  if (t == null) return null;
  try { return JSON.parse(t); } catch { return null; }
}

// ---------------------------------------------------------------- colour maths

const NAMED = { white: '#ffffff', black: '#000000', transparent: '#00000000' };

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const toHex2 = (x) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');
const rgbHex = (r, g, b, a = 1) => `#${toHex2(r)}${toHex2(g)}${toHex2(b)}${a < 1 ? toHex2(a) : ''}`;

function num(token, scale = 1) {
  if (token == null) return NaN;
  const t = String(token).trim();
  if (t === 'none') return 0;
  if (t.endsWith('%')) return (parseFloat(t) / 100) * scale;
  return parseFloat(t);
}

function hue(token) {
  const t = String(token).trim();
  const v = parseFloat(t);
  if (t.endsWith('turn')) return v * 360;
  if (t.endsWith('rad')) return (v * 180) / Math.PI;
  if (t.endsWith('grad')) return v * 0.9;
  return v;
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function oklchToRgb(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.sign(x) * Math.abs(x) ** (1 / 2.4) - 0.055));
}

function splitArgs(inner) {
  const [main, alpha] = inner.split('/');
  const parts = main.includes(',') ? main.split(',') : main.trim().split(/\s+/);
  return { parts: parts.map((p) => p.trim()).filter(Boolean), alpha: alpha == null ? 1 : num(alpha, 1) };
}

/** Parse a CSS colour (or a bare shadcn-style triplet) into { hex, rgb:[0..1], alpha }. Returns null if unknown. */
export function parseColor(input) {
  if (input == null) return null;
  const v = String(input).trim().toLowerCase();
  if (NAMED[v]) return parseColor(NAMED[v]);

  let m = v.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    const alpha = h.length === 8 ? n(6) : 1;
    return { hex: rgbHex(n(0), n(2), n(4), alpha), rgb: [n(0), n(2), n(4)], alpha };
  }

  m = v.match(/^(rgba?|hsla?|oklch)\((.*)\)$/);
  if (m) {
    const { parts, alpha } = splitArgs(m[2]);
    if (parts.length < 3) return null;
    let rgb;
    if (m[1].startsWith('rgb')) rgb = parts.slice(0, 3).map((p) => (p.endsWith('%') ? num(p, 1) : num(p) / 255));
    else if (m[1].startsWith('hsl')) rgb = hslToRgb(hue(parts[0]), num(parts[1], 1), num(parts[2], 1));
    else {
      const L = parts[0].endsWith('%') ? num(parts[0], 1) : num(parts[0]);
      const C = parts[1].endsWith('%') ? num(parts[1], 0.4) : num(parts[1]);
      rgb = oklchToRgb(L, C, hue(parts[2]));
    }
    if (rgb.some(Number.isNaN)) return null;
    rgb = rgb.map(clamp01);
    return { hex: rgbHex(...rgb, alpha), rgb, alpha };
  }

  // Bare triplets used by shadcn/ui (Tailwind v3): "222.2 84% 4.9%" (HSL) or "37 99 235" (RGB)
  m = v.match(/^(-?[\d.]+)(deg)?\s+([\d.]+%)\s+([\d.]+%)(\s*\/\s*[\d.]+%?)?$/);
  if (m) return parseColor(`hsl(${m[1]} ${m[3]} ${m[4]}${m[5] || ''})`);
  m = v.match(/^([\d.]+)\s+([\d.]+)\s+([\d.]+)$/);
  if (m) return parseColor(`rgb(${m[1]} ${m[2]} ${m[3]})`);
  return null;
}

/** Colourfulness 0..1 as sRGB chroma (max - min). Pale tints and greys score low, unlike HSL saturation. */
function vividness(rgb) {
  return Math.max(...rgb) - Math.min(...rgb);
}

function bareTripletKind(raw) {
  const v = String(raw).trim();
  if (/^-?[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%(\s*\/\s*[\d.]+%?)?$/.test(v)) return 'hsl';
  if (/^[\d.]+\s+[\d.]+\s+[\d.]+$/.test(v)) return 'rgb';
  return null;
}

// ---------------------------------------------------------------- CSS parsing

const GLOBAL_PART = /^(:root|html|:host|body|@theme(\s+(inline|static|reference))*|\.(light|dark)|\[data-[\w-]+(=["']?[\w-]+["']?)?\]|(:root|html|body)(\.[\w-]+|\[[^\]]+\])+|\.dark\s+:root|:where\([^)]*\)|:is\([^)]*\))$/;
const DARK_RE = /\.dark\b|data-(theme|mode|color-scheme|bs-theme)\s*=\s*["']?dark|prefers-color-scheme\s*:\s*dark/i;

/** Extract custom properties with the selector/at-rule context they live in. */
export function parseCssVars(cssText) {
  const css = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const stack = [];
  let buf = '';
  let quote = null;
  const flush = () => {
    const m = buf.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*(!important)?\s*$/);
    if (m && stack.length) out.push({ name: m[1], value: m[2].trim(), context: [...stack] });
    buf = '';
  };
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) { buf += ch; if (ch === quote && css[i - 1] !== '\\') quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
    if (ch === '{') { stack.push(buf.trim().replace(/\s+/g, ' ')); buf = ''; }
    else if (ch === '}') { flush(); stack.pop(); }
    else if (ch === ';') flush();
    else buf += ch;
  }
  return out;
}

function classifyContext(context) {
  const inner = context[context.length - 1] || '';
  const outer = context.slice(0, -1);
  if (outer.some((c) => c.startsWith('@') && !/^@(layer|media|supports|theme)/.test(c))) return null;
  const isGlobal = inner.split(',').map((p) => p.trim()).every((p) => GLOBAL_PART.test(p));
  if (!isGlobal) return null;
  const joined = context.join(' > ');
  return {
    scheme: DARK_RE.test(joined) ? 'dark' : 'light',
    theme: inner.startsWith('@theme'),
    inline: /^@theme\b.*\binline\b/.test(inner),
    darkVia: /prefers-color-scheme\s*:\s*dark/i.test(joined) ? 'media'
      : /\.dark\b/.test(joined) ? 'class'
      : DARK_RE.test(joined) ? 'data-attribute' : null,
    selector: !DARK_RE.test(joined) ? null
      : /prefers-color-scheme\s*:\s*dark/i.test(joined) ? '@media (prefers-color-scheme: dark)'
      : inner,
  };
}

// ---------------------------------------------------------------- roles

const ROLE_CANDIDATES = {
  background: ['--background', '--color-background', '--bg', '--color-bg', '--surface', '--color-surface', '--base-100', '--color-base-100', '--body-bg', '--bs-body-bg'],
  foreground: ['--foreground', '--color-foreground', '--fg', '--text', '--color-text', '--text-color', '--ink', '--color-ink', '--base-content', '--color-base-content', '--body-color', '--bs-body-color'],
  primary: ['--primary', '--color-primary', '--brand', '--color-brand', '--primary-color', '--color-primary-500', '--color-brand-500', '--bs-primary'],
  primaryForeground: ['--primary-foreground', '--color-primary-foreground', '--primary-content', '--color-primary-content'],
  accent: ['--accent', '--color-accent', '--chart-2', '--color-chart-2', '--secondary', '--color-secondary', '--chart-1', '--color-chart-1', '--accent-color', '--bs-info'],
  muted: ['--muted', '--color-muted', '--secondary', '--color-secondary', '--surface-2', '--base-200', '--color-base-200'],
  mutedForeground: ['--muted-foreground', '--color-muted-foreground', '--text-muted', '--color-text-muted', '--muted-color', '--bs-secondary-color'],
  border: ['--border', '--color-border', '--border-color', '--line', '--color-line', '--input', '--color-input', '--bs-border-color'],
  card: ['--card', '--color-card', '--surface', '--color-surface', '--panel'],
  destructive: ['--destructive', '--color-destructive', '--danger', '--color-danger', '--error', '--color-error', '--bs-danger'],
};
// Roles that are only useful for decoration when they are actually colourful.
const NEEDS_VIVID = new Set(['accent']);
// When no conventional name matches, look for brand-ish names (e.g. --nl-primary, --brand-blue).
const FUZZY = {
  primary: /(^|-)(primary|brand|main)(-|$)/,
  accent: /(^|-)(accent|highlight|secondary)(-|$)/,
};
const NOT_A_BASE_COLOUR = /(^|-)(fg|foreground|content|text|soft|light|lighter|subtle|press|pressed|hover|active|muted|bg|tint|ring|focus|50|100|200|300)(-|$)/;
// Status colours carry meaning (error, success...) and make poor decorative accents.
const STATUS_COLOUR = /(^|-)(destructive|danger|error|success|warning|warn|info|ok|wait|pending|exception|critical|positive|negative)(-|$)/;

// ---------------------------------------------------------------- main

export function extractTheme(rootDir) {
  const root = path.resolve(rootDir);
  const files = walk(root);
  const warnings = [];
  const sources = [];

  // --- package.json and project shape
  // In a monorepo or nested app the package.json may sit below the root: use the shallowest
  // one that contains the main stylesheet, else the shallowest one overall.
  const pkgFiles = files.filter((f) => /(^|\/)package\.json$/.test(f)).sort((a, b) => a.split('/').length - b.split('/').length);
  let pkgDir = '';
  if (!files.includes('package.json') && pkgFiles.length) {
    const mainCss = files.find((f) => /globals?\.css$|index\.css$|app\.css$|main\.css$/.test(f));
    const pick = pkgFiles.find((f) => mainCss && mainCss.startsWith(path.posix.dirname(f) + '/')) || pkgFiles[0];
    pkgDir = path.posix.dirname(pick);
  }
  const inPkg = (rel) => (pkgDir ? `${pkgDir}/${rel}` : rel);
  const pkg = readJson(root, inPkg('package.json')) || {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  const has = (n) => Object.prototype.hasOwnProperty.call(deps, n);
  const major = (n) => { const m = String(deps[n] || '').match(/(\d+)/); return m ? Number(m[1]) : null; };

  const FRAMEWORKS = [
    ['next', 'next'], ['nuxt', 'nuxt'], ['sveltekit', '@sveltejs/kit'], ['astro', 'astro'], ['remix', '@remix-run/react'],
    ['react-router', 'react-router'], ['angular', '@angular/core'], ['svelte', 'svelte'], ['vue', 'vue'], ['solid', 'solid-js'],
    ['preact', 'preact'], ['react', 'react'],
  ];
  const fw = FRAMEWORKS.find(([, dep]) => has(dep));
  const framework = fw ? fw[0] : files.some((f) => f.endsWith('.html')) ? 'html' : 'unknown';
  const frameworkVersion = fw ? major(fw[1]) : null;
  const ui = fw && ['next', 'remix', 'react-router', 'react', 'preact'].includes(fw[0]) ? 'react'
    : fw && ['nuxt', 'vue'].includes(fw[0]) ? 'vue'
    : fw && ['sveltekit', 'svelte'].includes(fw[0]) ? 'svelte'
    : fw ? fw[0] : framework;

  const motionLibs = ['motion', 'framer-motion', 'gsap', '@react-spring/web', 'animejs', 'lottie-react', 'lottie-web', '@lottiefiles/dotlottie-react', '@vueuse/motion', 'svelte-motion'].filter(has);
  const iconLibs = ['lucide-react', 'lucide-vue-next', 'lucide-svelte', '@heroicons/react', 'react-icons', '@tabler/icons-react', '@phosphor-icons/react', '@radix-ui/react-icons', '@iconify/react'].filter(has);
  const typescript = has('typescript') || files.includes(inPkg('tsconfig.json'));

  // --- shadcn/ui
  const shadcn = readJson(root, inPkg('components.json'));
  if (shadcn) sources.push({ file: inPkg('components.json'), kind: 'shadcn' });

  // --- tailwind
  const cssFiles = files.filter((f) => STYLE_EXT.has(path.extname(f)));
  const cssTexts = new Map(cssFiles.map((f) => [f, read(root, f)]).filter(([, t]) => t != null));
  const twConfigFile = files.find((f) => /^(.*\/)?tailwind\.config\.(js|cjs|mjs|ts|cts|mts)$/.test(f) && !f.includes('/node_modules/'));
  const twConfig = twConfigFile ? read(root, twConfigFile) : null;
  const v4Css = [...cssTexts].find(([, t]) => /@import\s+["']tailwindcss["']|@theme\b/.test(t));
  let tailwind = null;
  if (has('tailwindcss') || has('@tailwindcss/postcss') || has('@tailwindcss/vite') || twConfig || v4Css) {
    const declared = major('tailwindcss');
    const version = declared ?? (has('@tailwindcss/postcss') || has('@tailwindcss/vite') || v4Css ? 4 : 3);
    tailwind = { version, config: twConfigFile || null, css: v4Css ? v4Css[0] : (shadcn?.tailwind?.css ?? null) };
    if (twConfigFile) sources.push({ file: twConfigFile, kind: 'tailwind-config' });
  }

  // --- CSS custom properties
  // light/dark hold variables that exist at runtime; inline holds Tailwind v4 `@theme inline`
  // entries, which are compiled into utilities and never emitted as CSS variables.
  const vars = { light: new Map(), dark: new Map(), inline: new Map() };
  const darkHints = new Set();
  const perFile = [];
  for (const [file, text] of cssTexts) {
    const decls = parseCssVars(text);
    const kept = [];
    for (const d of decls) {
      const c = classifyContext(d.context);
      if (!c) continue;
      kept.push({ ...d, ...c, file });
      if (c.darkVia) darkHints.add(JSON.stringify({ strategy: c.darkVia, selector: c.selector }));
    }
    if (/@custom-variant\s+dark\b[^;]*\.dark/.test(text)) darkHints.add(JSON.stringify({ strategy: 'class', selector: '.dark' }));
    if (/@custom-variant\s+dark\b[^;]*data-theme/.test(text)) darkHints.add(JSON.stringify({ strategy: 'data-attribute', selector: '[data-theme="dark"]' }));
    if (kept.length) perFile.push({ file, kept });
  }
  // The file with the most theme variables wins on conflicts.
  perFile.sort((a, b) => b.kept.length - a.kept.length);
  for (const { file, kept } of perFile) {
    sources.push({ file, kind: 'css-variables', count: kept.length });
    for (const d of kept) {
      const map = d.inline ? vars.inline : vars[d.scheme];
      if (!map.has(d.name)) map.set(d.name, { value: d.value, file, inline: d.inline, theme: d.theme });
    }
  }

  // --- tailwind v3 config (static read, never executed)
  const twColorNames = new Set();
  if (twConfig) {
    const dm = twConfig.match(/darkMode\s*:\s*\[?\s*["'](\w+)["']/);
    if (dm) darkHints.add(JSON.stringify({ strategy: dm[1] === 'media' ? 'media' : 'class', selector: dm[1] === 'media' ? null : '.dark' }));
    const colorsBlock = twConfig.match(/colors\s*:\s*\{([\s\S]*)/);
    if (colorsBlock) for (const m of colorsBlock[1].matchAll(/["']?([a-zA-Z][\w-]*)["']?\s*:\s*[{"'`]/g)) twColorNames.add(m[1]);
    // literal colours like brand: '#0ea5e9' become pseudo-variables so roles can still resolve
    for (const m of twConfig.matchAll(/["']?([a-zA-Z][\w-]*)["']?\s*:\s*["'](#[0-9a-fA-F]{3,8}|(?:rgb|hsl|oklch)a?\([^"']+\))["']/g)) {
      const name = `tw:${m[1]}`;
      if (!vars.light.has(name)) vars.light.set(name, { value: m[2], file: twConfigFile, literal: true });
    }
  }
  for (const [name, v] of [...vars.light, ...vars.inline]) {
    const m = name.match(/^--color-([\w-]+)$/);
    if (m && v.theme) twColorNames.add(m[1]);
  }

  // --- resolving
  const lookup = (name, scheme) => (scheme === 'dark' && vars.dark.get(name)) || vars.light.get(name) || vars.inline.get(name) || null;
  const resolve = (value, scheme, depth = 0) => {
    if (depth > 8) return value;
    return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))*[^()]*))?\)/g, (_, n, fb) => {
      const hit = lookup(n, scheme);
      if (hit) return resolve(hit.value, scheme, depth + 1);
      return fb != null ? resolve(fb.trim(), scheme, depth + 1) : `var(${n})`;
    });
  };
  const colourOf = (name, scheme) => {
    const hit = lookup(name, scheme);
    if (!hit) return null;
    return parseColor(resolve(hit.value, scheme));
  };

  /** How SVG/CSS should reference a variable at runtime. */
  const cssRef = (name, depth = 0) => {
    if (depth > 8) return null;
    const runtime = vars.light.get(name) || vars.dark.get(name);
    if (runtime) {
      if (runtime.literal) return null; // tailwind.config literal: no runtime variable exists
      const kind = bareTripletKind(runtime.value);
      return kind ? `${kind}(var(${name}))` : `var(${name})`;
    }
    const inline = vars.inline.get(name);
    if (!inline) return null;
    // Follow a plain alias. A self-reference (--font-sans: var(--font-sans)) or an unknown target
    // (e.g. --font-geist-sans, set by next/font) is assumed to exist at runtime.
    const alias = inline.value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (!alias) return null;
    const target = alias[1];
    if (target === name) return `var(${name})`;
    const known = vars.light.has(target) || vars.dark.has(target) || vars.inline.has(target);
    return known ? cssRef(target, depth + 1) : `var(${target})`;
  };

  const utilityFor = (name) => {
    if (!tailwind) return null;
    const base = name.replace(/^tw:/, '').replace(/^--(color-)?/, '');
    return twColorNames.has(base) ? base : null;
  };

  const allNames = [...new Set([...vars.light.keys(), ...vars.inline.keys()])].filter((n) => n.startsWith('--'));
  const makeRole = (name, light, guessed) => {
    const dark = vars.dark.size ? colourOf(name, 'dark') : null;
    const ref = cssRef(name);
    const role = {
      var: name.startsWith('tw:') ? null : name,
      css: ref ? (ref.startsWith('var(') ? ref.replace(/\)$/, `, ${light.hex})`) : ref) : light.hex,
      light: light.hex,
      dark: dark && dark.hex !== light.hex ? dark.hex : null,
      utility: utilityFor(name),
      vivid: Math.round(vividness(light.rgb) * 100) / 100,
      source: lookup(name, 'light').file,
    };
    if (guessed) role.guessed = true;
    if (!ref) role.note = name.startsWith('tw:') ? 'tailwind.config literal; no runtime CSS variable' : '@theme inline value; not available as a runtime CSS variable';
    return role;
  };
  const vividVar = (name, min = 0.3) => {
    const c = colourOf(name, 'light');
    return c && c.alpha === 1 && vividness(c.rgb) >= min ? c : null;
  };

  const roles = {};
  for (const [role, candidates] of Object.entries(ROLE_CANDIDATES)) {
    const pool = [...candidates];
    if (role === 'primary' || role === 'accent') pool.push(`tw:${role}`, 'tw:brand');
    let chosen = null;
    for (const name of pool) {
      const light = colourOf(name, 'light');
      if (!light) continue;
      if (NEEDS_VIVID.has(role) && vividness(light.rgb) < 0.25) continue;
      if (role === 'accent' && roles.primary && name === roles.primary.var) continue;
      chosen = makeRole(name, light, false);
      break;
    }
    // Fallback 1: brand-ish names such as --nl-primary or --brand-blue.
    if (!chosen && FUZZY[role]) {
      const name = allNames.find((n) => FUZZY[role].test(n.slice(2)) && !NOT_A_BASE_COLOUR.test(n.slice(2)) && vividVar(n) && n !== roles.primary?.var);
      if (name) chosen = makeRole(name, vividVar(name), true);
    }
    // Fallback 2 (primary only): the first colourful global variable in the main stylesheet.
    // Accent is not guessed this way: arbitrary variables (e.g. --pay-mastercard) made poor accents.
    if (!chosen && role === 'primary') {
      const name = allNames.find((n) => !NOT_A_BASE_COLOUR.test(n.slice(2)) && !STATUS_COLOUR.test(n.slice(2)) && !/chart-\d/.test(n) && vividVar(n, 0.4));
      if (name) chosen = makeRole(name, vividVar(name, 0.4), true);
    }
    roles[role] = chosen;
  }

  // Extra decorative palette: shadcn chart colours, else any vivid global colour variable.
  const palette = [];
  const seen = new Set(Object.values(roles).filter(Boolean).map((r) => r.light));
  // Prefer the runtime variable (--chart-1) over its Tailwind alias (--color-chart-1).
  const paletteNames = [...vars.light.keys()].filter((n) => /^--(color-)?chart-\d+$/.test(n))
    .sort((a, b) => a.startsWith('--color-') - b.startsWith('--color-') || a.localeCompare(b, 'en', { numeric: true }));
  const fallbackNames = [...vars.light.keys()].filter((n) => n.startsWith('--') && !paletteNames.includes(n)
    && !NOT_A_BASE_COLOUR.test(n.slice(2)) && !STATUS_COLOUR.test(n.slice(2)));
  for (const name of [...paletteNames, ...fallbackNames]) {
    if (palette.length >= 6) break;
    const c = colourOf(name, 'light');
    if (!c || c.alpha < 1 || vividness(c.rgb) < 0.3 || seen.has(c.hex)) continue;
    const ref = cssRef(name);
    if (!ref) continue;
    seen.add(c.hex);
    const d = colourOf(name, 'dark');
    palette.push({ var: name, css: ref, light: c.hex, dark: d && d.hex !== c.hex ? d.hex : null });
  }

  // --- radius
  const radius = {};
  for (const [name, v] of vars.light) {
    if (!/^--radius(-[\w-]+)?$/.test(name)) continue;
    const resolved = resolve(v.value, 'light');
    const px = /^[\d.]+rem$/.test(resolved) ? parseFloat(resolved) * 16 : /^[\d.]+px$/.test(resolved) ? parseFloat(resolved) : null;
    radius[name] = { value: resolved, px };
  }
  const baseRadius = radius['--radius']?.px ?? radius['--radius-lg']?.px ?? radius['--radius-md']?.px ?? null;

  // --- fonts
  const fonts = {};
  for (const [name, v] of [...vars.light, ...vars.inline]) {
    const m = name.match(/^--font-(sans|serif|mono|heading|display|body)$/) || name.match(/^--(font-family|font-body|font-heading)$/);
    if (!m || fonts[m[1].replace('font-', '')]) continue;
    const ref = cssRef(name);
    fonts[m[1].replace('font-', '')] = { css: ref, family: resolve(v.value, 'light'), source: v.file };
  }
  const families = new Set();
  for (const f of files.filter((f) => ENTRY_RE.test(f))) {
    const t = read(root, f) || '';
    const imp = t.match(/import\s*\{([^}]+)\}\s*from\s*["']next\/font\/google["']/);
    if (imp) imp[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].replace(/_/g, ' ')).filter(Boolean).forEach((n) => families.add(n));
    for (const m of t.matchAll(/from\s*["']geist\/font\/(sans|mono)["']/g)) families.add(m[1] === 'sans' ? 'Geist' : 'Geist Mono');
    for (const m of t.matchAll(/from\s*["']@fontsource(?:-variable)?\/([\w-]+)/g)) families.add(m[1].replace(/-/g, ' '));
  }
  for (const f of files.filter((f) => MARKUP_EXT.has(path.extname(f)))) {
    const t = read(root, f) || '';
    for (const m of t.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'\s>]+)/g)) {
      for (const fam of m[1].matchAll(/family=([^:&]+)/g)) families.add(decodeURIComponent(fam[1]).replace(/\+/g, ' '));
    }
  }
  for (const [, t] of cssTexts) {
    for (const m of t.matchAll(/@import\s+url\(["']?https:\/\/fonts\.googleapis\.com\/css2?\?([^"')]+)/g)) {
      for (const fam of m[1].matchAll(/family=([^:&]+)/g)) families.add(decodeURIComponent(fam[1]).replace(/\+/g, ' '));
    }
  }

  // --- dark mode
  const hints = [...darkHints].map((s) => JSON.parse(s));
  const darkMode = hints.find((h) => h.strategy === 'class') || hints.find((h) => h.strategy === 'data-attribute') || hints.find((h) => h.strategy === 'media') || { strategy: 'none', selector: null };

  // --- component directory
  let componentDir = null;
  const alias = shadcn?.aliases?.components;
  if (alias) {
    const rel = alias.replace(/^[@~]\//, '');
    componentDir = inPkg(fs.existsSync(path.join(root, inPkg(`src/${rel}`))) ? `src/${rel}` : rel);
  } else {
    componentDir = ['src/components', 'components', 'app/components', 'src/lib/components', 'src/app/components']
      .map(inPkg).find((d) => fs.existsSync(path.join(root, d))) || null;
  }

  // --- confidence and warnings
  const core = ['background', 'foreground', 'primary'].filter((r) => roles[r]);
  const fromVars = core.filter((r) => roles[r].var && !roles[r].guessed).length;
  const confidence = fromVars === 3 ? 'high' : core.length >= 2 ? 'medium' : 'low';

  if (!roles.primary) warnings.push('No primary/brand colour found. Ask the user for one before drawing.');
  if (!roles.background || !roles.foreground) warnings.push('Background or foreground colour not found; SVG may clash with the page. Prefer currentColor for line work.');
  if (!roles.accent) warnings.push('No colourful accent found (shadcn --accent is usually a neutral hover colour). Use primary plus palette, or ask for an accent.');
  if (darkMode.strategy === 'none') warnings.push('No dark mode detected. If the site has one, ask how it is switched.');
  if (tailwind?.version === 3 && twConfigFile && !vars.light.size) warnings.push(`Tailwind v3 colours come only from ${twConfigFile}; read it to confirm nested colour names.`);
  for (const [role, r] of Object.entries(roles)) if (r?.note) warnings.push(`${role}: ${r.note}; css falls back to the literal colour.`);
  for (const [role, r] of Object.entries(roles)) if (r?.guessed) warnings.push(`${role} was guessed from ${r.var} (${r.light}). Confirm with the user before relying on it.`);
  if (pkgDir) warnings.push(`No package.json at the root; used ${pkgDir}/package.json.`);
  if (perFile.length > 1) warnings.push(`Theme variables found in ${perFile.length} files; ${perFile[0].file} was treated as the main one.`);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    generator: 'svg-motion-kit/theme-extract',
    confidence,
    project: { root: pkgDir || '.', framework, frameworkVersion, ui, typescript, tailwind, shadcn: shadcn ? { style: shadcn.style ?? null, baseColor: shadcn.tailwind?.baseColor ?? null } : null, motionLibs, iconLibs, componentDir },
    darkMode,
    roles,
    palette,
    radius: { base: baseRadius, tokens: radius },
    fonts: { tokens: fonts, families: [...families] },
    sources,
    warnings,
  };
}

// ---------------------------------------------------------------- CLI

function summary(t, outPath) {
  const p = t.project;
  const head = [
    p.framework + (p.frameworkVersion ? ` ${p.frameworkVersion}` : ''),
    p.tailwind ? `Tailwind ${p.tailwind.version}` : null,
    p.shadcn ? 'shadcn/ui' : null,
    p.typescript ? 'TypeScript' : null,
    p.motionLibs.length ? `motion: ${p.motionLibs.join(', ')}` : 'motion: CSS only',
    `dark: ${t.darkMode.strategy}${t.darkMode.selector ? ` (${t.darkMode.selector})` : ''}`,
  ].filter(Boolean).join(' · ');
  const lines = [`svg-motion theme — ${head}`, `confidence: ${t.confidence}`, '', 'roles:'];
  for (const [role, r] of Object.entries(t.roles)) {
    lines.push(r
      ? `  ${role.padEnd(18)}${String(r.css).padEnd(34)} ${r.light}${r.dark ? ` / ${r.dark}` : ''}${r.utility ? `  [${r.utility}]` : ''}${r.guessed ? '  (guessed)' : ''}`
      : `  ${role.padEnd(18)}—`);
  }
  if (t.palette.length) lines.push('', `palette: ${t.palette.map((c) => `${c.var} ${c.light}`).join(', ')}`);
  if (t.radius.base != null) lines.push(`radius: ${t.radius.base}px`);
  const fams = [...new Set([...Object.values(t.fonts.tokens).map((f) => f.family), ...t.fonts.families])];
  if (fams.length) lines.push(`fonts: ${fams.join(' | ')}`);
  if (p.componentDir) lines.push(`components: ${p.componentDir}`);
  if (t.warnings.length) lines.push('', 'warnings:', ...t.warnings.map((w) => `  - ${w}`));
  lines.push('', outPath ? `wrote ${outPath}` : '(dry run — nothing written)');
  return lines.join('\n');
}

function main(argv) {
  const args = argv.slice(2);
  const flag = (f) => args.includes(f);
  const outIdx = args.indexOf('--out');
  const out = outIdx >= 0 ? args[outIdx + 1] : null;
  const positional = args.filter((a, i) => !a.startsWith('--') && !(outIdx >= 0 && i === outIdx + 1));
  const root = path.resolve(positional[0] || '.');
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`Not a directory: ${root}`);
    process.exit(2);
  }
  const theme = extractTheme(root);
  let outPath = null;
  if (!flag('--dry-run')) {
    outPath = out ? path.resolve(out) : path.join(root, '.svg-motion', 'theme.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(theme, null, 2)}\n`);
  }
  console.log(flag('--json') ? JSON.stringify(theme, null, 2) : summary(theme, outPath && path.relative(process.cwd(), outPath)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main(process.argv);
