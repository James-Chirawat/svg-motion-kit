#!/usr/bin/env node
// lint-design.mjs — flag the patterns that make a site look AI-generated
//
// Usage: node lint-design.mjs [projectDir] [--json]
//
// Finds purple/violet gradients, gradient text, coloured glow, glassmorphism, blurred blob
// orbs, sparkle icons, emoji used as icons, stock "AI" marketing copy, identical card grids,
// announcement pills, and theme-level defaults (the indigo/violet brand colour, a single
// generic font). Gives each finding file:line evidence and a 0–100 genericness score.
// Read-only, zero dependencies (reuses theme-extract's colour parser), no network.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { extractTheme, parseColor } = await import(pathToFileURL(path.join(HERE, '..', '..', 'theme-extract', 'scripts', 'extract-tokens.mjs')).href);

const IGNORE_DIRS = new Set(['node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.output', '.astro', 'dist', 'build', 'out', 'coverage', '.turbo', '.vercel', 'vendor', '.svg-motion', '.cache', 'storybook-static', 'env', 'venv', '__pycache__']);
const EXT = new Set(['.tsx', '.jsx', '.vue', '.svelte', '.astro', '.html', '.css', '.scss', '.pcss']);
const SKIP_FILE = /(\.test\.|\.spec\.|\.stories\.|\.min\.css$|(^|\/)(tests?|__tests__)\/)/;
const PURPLE_TW = '(?:indigo|violet|purple|fuchsia)';
const PINKISH_TW = '(?:indigo|violet|purple|fuchsia|pink|rose)';
const EMOJI = /\p{Extended_Pictographic}/gu;
const AI_COPY = /\b(supercharge|unlock the (full )?power|seamless(ly)?|revolutioni[sz]e|elevate your|next[- ]gen(eration)?|cutting[- ]edge|ai[- ]powered|powered by ai|effortless(ly)?|game[- ]chang(er|ing)|10x|in seconds|unleash|transform your workflow|all[- ]in[- ]one platform)\b/gi;

export const RULES = {
  'purple-gradient': { severity: 'high', weight: 18, title: 'Indigo/violet/purple gradient', fix: 'Use one solid brand colour; if a gradient earns its place, keep it within one hue family from the project palette.' },
  'gradient-text': { severity: 'medium', weight: 9, title: 'Gradient-filled text', fix: 'Set headlines in solid ink; use weight, size and spacing for emphasis.' },
  'glow-shadow': { severity: 'medium', weight: 8, title: 'Coloured glow shadow', fix: 'Use neutral, short shadows (or borders) that match the light direction of the UI.' },
  glassmorphism: { severity: 'medium', weight: 8, title: 'Glassmorphism (blurred translucent panels)', fix: 'Use opaque surfaces from the theme; reserve blur for overlays that truly sit above content.' },
  'blur-orbs': { severity: 'medium', weight: 8, title: 'Blurred decorative orbs/blobs', fix: 'Replace with an illustration or photo that says something about the product, or nothing at all.' },
  sparkles: { severity: 'low', weight: 5, title: 'Sparkle icons ✨', fix: 'Use an icon that names the action (wand for "generate", bolt for "fast"), or no icon.' },
  'emoji-icons': { severity: 'low', weight: 5, title: 'Emoji used as icons', fix: 'Use one consistent icon set from the project (or none) instead of emoji in headings, buttons and feature lists.' },
  'ai-copy': { severity: 'low', weight: 4, title: 'Stock "AI startup" marketing copy', fix: 'Say what the product does for whom, with a concrete example or number.' },
  'uniform-cards': { severity: 'low', weight: 5, title: 'Identical rounded-shadow card grid', fix: 'Vary emphasis: one primary feature, supporting details as a list or table, real screenshots.' },
  'pill-badge': { severity: 'low', weight: 3, title: '"New / Introducing" pill above the hero', fix: 'Drop it unless there is a real announcement; link it to the changelog if there is.' },
  'theme-ai-purple': { severity: 'medium', weight: 10, title: 'Brand colour is the default AI indigo/violet', fix: 'If it was not a deliberate brand choice, pick a primary grounded in the audience and domain (see the three directions).' },
  'generic-font': { severity: 'low', weight: 4, title: 'One generic sans for everything', fix: 'Pair a characterful display face with a readable text face; for Thai UIs choose a family with good Thai glyphs.' },
};

const GENERIC_FONTS = /^(inter|geist|roboto|arial|helvetica|system-ui|sans-serif|ui-sans-serif|open sans|lato|poppins|montserrat|-apple-system)$/i;

function walk(root) {
  const files = [];
  const visit = (dir, depth) => {
    if (depth > 10 || files.length > 8000) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (!IGNORE_DIRS.has(e.name) && !e.name.startsWith('.')) visit(full, depth + 1); }
      else if (e.isFile() && EXT.has(path.extname(e.name))) {
        const rel = path.relative(root, full).split(path.sep).join('/');
        if (!SKIP_FILE.test(rel)) files.push(rel);
      }
    }
  };
  visit(root, 0);
  return files;
}

function hueOf(hex) {
  const c = parseColor(hex);
  if (!c) return null;
  const [r, g, b] = c.rgb, max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  if (d < 0.25) return null; // too grey to count
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const purpleish = (hue) => hue != null && hue >= 235 && hue <= 330;

function cssColoursIn(text) {
  return text.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch)\([^)]*\)/g) || [];
}

export function lintDesign(rootDir) {
  const root = path.resolve(rootDir);
  const files = walk(root);
  const findings = [];
  const add = (rule, file, line, evidence) => findings.push({ rule, ...RULES[rule], file, line, evidence: evidence.trim().slice(0, 140) });

  for (const file of files) {
    let text;
    try { if (fs.statSync(path.join(root, file)).size > 400 * 1024) continue; text = fs.readFileSync(path.join(root, file), 'utf8'); } catch { continue; }
    const lines = text.split('\n');
    const isCss = /\.(css|scss|pcss)$/.test(file);
    let emojiCount = 0, emojiLine = 0;
    const copyHits = new Set(); let copyLine = 0;
    let cardCount = 0, cardLine = 0;

    lines.forEach((l, i) => {
      const n = i + 1;
      // purple gradients
      if (new RegExp(`\\bfrom-${PURPLE_TW}-\\d`).test(l) && new RegExp(`\\b(via|to)-${PINKISH_TW}-\\d`).test(l)) add('purple-gradient', file, n, l);
      else if (/(linear|radial|conic)-gradient\(/.test(l)) {
        const hues = cssColoursIn(l).map(hueOf).filter((h) => h != null);
        if (hues.filter(purpleish).length >= 2 || (hues.length >= 2 && hues.every(purpleish))) add('purple-gradient', file, n, l);
      }
      // gradient text
      if ((/\bbg-clip-text\b/.test(l) && /\btext-transparent\b/.test(l)) || /(-webkit-)?background-clip\s*:\s*text/.test(l)) add('gradient-text', file, n, l);
      // glow
      if (new RegExp(`\\bshadow-${PINKISH_TW}-\\d|\\bshadow-(cyan|sky|blue)-\\d+\\/|\\bshadow-\\[0_0_|\\bdrop-shadow-\\[0_0_`).test(l)) add('glow-shadow', file, n, l);
      else if (/box-shadow\s*:/.test(l)) {
        const blur = (l.match(/box-shadow\s*:\s*[-\d.]+px\s+[-\d.]+px\s+(\d+)px/) || [])[1];
        if (Number(blur) >= 20 && cssColoursIn(l).some((c) => hueOf(c) != null)) add('glow-shadow', file, n, l);
      }
      // glass
      // Glass = blur behind a mostly see-through surface. Frosted sticky headers (bg-white/80) are fine.
      if ((/\bbackdrop-blur(-\w+)?\b/.test(l) && /\bbg-(white|black|slate-\d+|gray-\d+|zinc-\d+)\/([0-9]|[12][0-9]|30)\b/.test(l)) || (isCss && /backdrop-filter\s*:\s*blur/.test(l) && !/sticky|header|nav/i.test(lines.slice(Math.max(0, i - 4), i).join(' ')))) add('glassmorphism', file, n, l);
      // orbs
      if ((/\bblur-(2xl|3xl|\[\d{2,}px\])/.test(l) && /\brounded-full\b/.test(l)) || (isCss && /filter\s*:\s*blur\((\d{2,})px\)/.test(l) && Number(l.match(/blur\((\d+)px/)[1]) >= 40)) add('blur-orbs', file, n, l);
      // sparkles
      if (/\bSparkles(Icon)?\b/.test(l) || l.includes('✨')) add('sparkles', file, n, l);
      // pill badge
      if (!isCss && /\brounded-full\b/.test(l) && /(>|\s)(New|Introducing|Beta|Now available|✨)\b/.test(l)) add('pill-badge', file, n, l);
      if (!isCss) {
        const textNodes = (l.match(/>[^<>{}]+</g) || []).join(' ') + ' ' + (l.match(/["'`][^"'`]{2,120}["'`]/g) || []).join(' ');
        const em = (textNodes.match(EMOJI) || []).filter((e) => e !== '✨').length;
        if (em) { emojiCount += em; emojiLine ||= n; }
        for (const m of textNodes.matchAll(AI_COPY)) { copyHits.add(m[0].toLowerCase()); copyLine ||= n; }
        if (/\brounded-(2xl|3xl)\b/.test(l) && /\bshadow-(lg|xl|2xl)\b/.test(l)) { cardCount++; cardLine ||= n; }
      }
    });
    if (emojiCount >= 3) add('emoji-icons', file, emojiLine, `${emojiCount} emoji in UI text`);
    if (copyHits.size >= 2) add('ai-copy', file, copyLine, [...copyHits].join(', '));
    if (cardCount >= 3 || (cardCount >= 1 && /\b(grid-cols-3|md:grid-cols-3|lg:grid-cols-3)\b/.test(text) && cardCount >= 2)) add('uniform-cards', file, cardLine, `${cardCount} rounded + shadow cards`);
  }

  // Theme-level defaults
  let theme = null;
  try { theme = extractTheme(root); } catch { /* no theme is fine */ }
  const primary = theme?.roles?.primary;
  if (primary && !primary.guessed) {
    const hue = hueOf(primary.light);
    // 230–295° covers Tailwind indigo-500 (#6366f1, ~239°) through violet/purple.
    if (hue != null && hue >= 230 && hue <= 295) add('theme-ai-purple', primary.source, null, `${primary.var ?? 'primary'} ${primary.light}`);
  }
  if (theme) {
    const fams = [...new Set([...theme.fonts.families, ...Object.values(theme.fonts.tokens).map((f) => (f.family || '').split(',')[0].replace(/["']/g, '').trim())].filter((f) => f && !f.startsWith('var(')))];
    if (fams.length && fams.length <= 1 && fams.every((f) => GENERIC_FONTS.test(f))) add('generic-font', theme.sources.find((s) => s.kind === 'css-variables')?.file ?? null, null, fams.join(', ') || 'system default');
  }

  // Score: each rule counts once at full weight, repeats add a little.
  const byRule = new Map();
  for (const f of findings) byRule.set(f.rule, (byRule.get(f.rule) || 0) + 1);
  let score = 0;
  for (const [rule, count] of byRule) score += RULES[rule].weight + Math.min(count - 1, 5);
  score = Math.min(100, score);
  const band = score >= 45 ? 'looks AI-generated' : score >= 20 ? 'some generic patterns' : 'distinct';
  const order = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || RULES[b.rule].weight - RULES[a.rule].weight || a.rule.localeCompare(b.rule) || String(a.file).localeCompare(String(b.file)) || (a.line ?? 0) - (b.line ?? 0));

  return {
    root,
    scanned: files.length,
    score,
    band,
    rules: Object.fromEntries(byRule),
    findings,
    context: theme ? { framework: theme.project.framework, primary: primary?.light ?? null, fonts: theme.fonts.families, confidence: theme.confidence } : null,
  };
}

function main(argv) {
  const args = argv.slice(2);
  const dir = args.find((a) => !a.startsWith('--')) || '.';
  if (!fs.existsSync(dir)) { console.error(`Not a directory: ${dir}`); process.exit(2); }
  const r = lintDesign(dir);
  if (args.includes('--json')) { console.log(JSON.stringify(r, null, 2)); return; }
  console.log(`design-lint — genericness ${r.score}/100 (${r.band}), ${r.scanned} files scanned\n`);
  if (!r.findings.length) { console.log('No generic AI-look patterns found.'); return; }
  const seen = new Set();
  for (const f of r.findings) {
    const where = f.file ? `${f.file}${f.line ? `:${f.line}` : ''}` : '(theme)';
    if (!seen.has(f.rule)) { console.log(`[${f.severity}] ${f.title}\n      fix: ${f.fix}`); seen.add(f.rule); }
    console.log(`      ${where}  ${f.evidence}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main(process.argv);
