#!/usr/bin/env node
// validate-svg.mjs — quality and safety gate for SVG produced by svg-motion
//
// Usage: node validate-svg.mjs <file.svg>... [--mode inline|standalone] [--max-kb 15] [--json]
//   inline      (default) SVG pasted into a page or component: colours must come from CSS
//               variables (hex only as a var() fallback), selectors and keyframes must be scoped.
//   standalone  SVG used as an <img> or file (e.g. a README): colours must be declared once as
//               custom properties, everything else references them.
//
// Zero dependencies, no network, read-only. Exit code 1 when any file has errors.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const FUNC_COLOUR = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\([^)]*\)/g;
const COLOUR_ATTRS = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color'];
const ALLOWED_ANIM = new Set(['transform', 'opacity', 'stroke-dashoffset', 'stroke-dasharray', 'offset-distance', 'transform-origin']);
const LAYOUT_ANIM = new Set(['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding', 'font-size', 'line-height']);

/** Remove var(...) calls (with their fallbacks) and custom-property declarations so remaining colours are "hardcoded". */
function stripAllowedColourSites(css, mode) {
  let out = css;
  // var(--x, #fff) — fallbacks are allowed in both modes
  for (let i = 0; i < 4; i++) out = out.replace(/var\(\s*--[\w-]+\s*(?:,[^()]*(?:\([^()]*\)[^()]*)*)?\)/g, 'VAR');
  // --token: #hex; declarations are allowed in standalone mode (the palette lives there)
  if (mode === 'standalone') out = out.replace(/--[\w-]+\s*:[^;}]*/g, '');
  return out;
}

function findLine(text, index) {
  return text.slice(0, index).split('\n').length;
}

/** Minimal well-formedness check: tags balance and attributes are quoted. */
function checkWellFormed(svg) {
  const problems = [];
  const body = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<\?[\s\S]*?\?>/g, '');
  const stack = [];
  const re = /<\/?([A-Za-z][\w:.-]*)((?:\s+[^\s=>/]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|<(?![!?])/g;
  let m;
  while ((m = re.exec(body))) {
    if (!m[1]) { problems.push(`unparseable tag near line ${findLine(body, m.index)}`); break; }
    const isClose = m[0].startsWith('</');
    const selfClose = m[3] === '/';
    if (isClose) {
      const top = stack.pop();
      if (top !== m[1]) { problems.push(`</${m[1]}> does not match <${top ?? 'nothing'}> (line ${findLine(body, m.index)})`); break; }
    } else if (!selfClose) stack.push(m[1]);
    if (m[1] === 'style' && !isClose) {
      const end = body.indexOf('</style>', re.lastIndex);
      if (end > 0) re.lastIndex = end;
    }
  }
  if (!problems.length && stack.length) problems.push(`unclosed <${stack[stack.length - 1]}>`);
  return problems;
}

function styleBlocks(svg) {
  return [...svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => ({ css: m[1].replace(/\/\*[\s\S]*?\*\//g, ''), index: m.index }));
}

function keyframeBlocks(css) {
  const out = [];
  const re = /@keyframes\s+([\w-]+)\s*\{/g;
  let m;
  while ((m = re.exec(css))) {
    let depth = 1, i = re.lastIndex;
    while (i < css.length && depth) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
    out.push({ name: m[1], body: css.slice(re.lastIndex, i - 1) });
    re.lastIndex = i;
  }
  return out;
}

/** Top-level rule selectors, skipping @keyframes and descending into @media/@supports. */
function ruleSelectors(css) {
  const sels = [];
  let i = 0, buf = '';
  const walk = (stopAtClose) => {
    while (i < css.length) {
      const ch = css[i++];
      if (ch === '{') {
        const prelude = buf.trim(); buf = '';
        if (/^@keyframes/.test(prelude) || /^@font-face/.test(prelude)) { let d = 1; while (i < css.length && d) { if (css[i] === '{') d++; else if (css[i] === '}') d--; i++; } }
        else if (/^@(media|supports|layer|container)/.test(prelude)) walk(true);
        else { sels.push(prelude); let d = 1; while (i < css.length && d) { if (css[i] === '{') d++; else if (css[i] === '}') d--; i++; } }
      } else if (ch === '}') { buf = ''; if (stopAtClose) return; }
      else if (ch === ';') buf = '';
      else buf += ch;
    }
  };
  walk(false);
  return sels.flatMap((s) => s.split(',').map((x) => x.trim())).filter(Boolean);
}

export function validateSvg(svg, { mode = 'inline', maxKb = 15 } = {}) {
  const errors = [];
  const warnings = [];
  const err = (rule, msg) => errors.push({ rule, msg });
  const warn = (rule, msg) => warnings.push({ rule, msg });

  // --- structure
  const root = svg.match(/<svg\b([^>]*)>/);
  if (!root) { err('structure', 'no <svg> root element'); return { errors, warnings, bytes: Buffer.byteLength(svg) }; }
  for (const p of checkWellFormed(svg)) err('structure', p);
  const rootAttrs = root[1];
  if (!/\bviewBox\s*=/.test(rootAttrs)) err('structure', 'root <svg> has no viewBox, so it cannot scale');

  // --- safety
  if (/<script\b/i.test(svg)) err('safety', '<script> is not allowed');
  if (/\son[a-z]+\s*=/i.test(svg)) err('safety', 'inline event handlers (onclick=, onload=...) are not allowed');
  if (/javascript:/i.test(svg)) err('safety', 'javascript: URLs are not allowed');
  if (/<foreignObject\b/i.test(svg)) err('safety', '<foreignObject> is not allowed');
  if (/(?:xlink:)?href\s*=\s*["'](?!#)[^"']+["']/i.test(svg)) err('safety', 'external href; only same-document references (#id) are allowed');
  if (/url\(\s*["']?(?!#)(?:https?:|\/\/|data:)/i.test(svg) || /@import\b/i.test(svg)) err('safety', 'external url() or @import');

  // --- accessibility
  const hidden = /\baria-hidden\s*=\s*["']true["']/.test(rootAttrs);
  const hasRole = /\brole\s*=\s*["']img["']/.test(rootAttrs);
  const hasName = /<title\b[^>]*>\s*\S[\s\S]*?<\/title>/.test(svg) || /\baria-label\s*=\s*["'][^"']+["']/.test(rootAttrs);
  if (!hidden && !(hasRole && hasName)) err('a11y', 'root needs aria-hidden="true" (decorative) or role="img" plus a <title>/aria-label (meaningful)');
  if (hidden && hasRole) warn('a11y', 'both aria-hidden="true" and role="img" on the root; pick one');

  // --- colour
  const blocks = styleBlocks(svg);
  const outsideStyle = svg.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const hard = new Set();
  for (const attr of COLOUR_ATTRS) {
    for (const m of outsideStyle.matchAll(new RegExp(`\\s${attr}\\s*=\\s*["']([^"']+)["']`, 'g'))) {
      const v = m[1];
      const rest = stripAllowedColourSites(v, 'inline');
      if (rest.match(HEX) || (rest.match(FUNC_COLOUR) || []).some((c) => !c.includes('VAR'))) hard.add(`${attr}="${v}"`);
    }
  }
  for (const m of outsideStyle.matchAll(/\sstyle\s*=\s*["']([^"']+)["']/g)) {
    const rest = stripAllowedColourSites(m[1], 'inline');
    if (rest.match(HEX) || (rest.match(FUNC_COLOUR) || []).some((c) => !c.includes('VAR'))) hard.add(`style="${m[1]}"`);
  }
  const literalsIn = (text) => [...(text.match(HEX) || []), ...(text.match(FUNC_COLOUR) || []).filter((c) => !c.includes('VAR'))];
  const literalDecls = new Set();
  for (const b of blocks) {
    if (mode === 'inline') {
      // A literal in a --custom-property is a fallback the theme couldn't fill: allowed, but say so.
      for (const m of stripAllowedColourSites(b.css, 'inline').matchAll(/(--[\w-]+)\s*:\s*([^;}]*)/g)) if (literalsIn(m[2]).length) literalDecls.add(m[1]);
    }
    for (const c of literalsIn(stripAllowedColourSites(b.css, 'standalone'))) hard.add(c);
  }
  if (literalDecls.size) warn('colour', `literal colour for ${[...literalDecls].join(', ')}: no theme token filled it, so it won't follow theme changes`);
  if (hard.size) {
    const list = [...hard].slice(0, 6).join(', ');
    err('colour', mode === 'inline'
      ? `hardcoded colour(s) ${list}. Use var(--token, #fallback) or currentColor so the SVG follows the theme`
      : `colour(s) ${list} used directly. Declare the palette once as --custom-properties and reference them`);
  }

  // --- motion
  const allCss = blocks.map((b) => b.css).join('\n');
  const animates = /\banimation(?:-name)?\s*:/.test(allCss) || /@keyframes/.test(allCss);
  const smil = /<(animate|animateTransform|animateMotion|set)\b/.test(svg);
  if ((animates || smil) && !/prefers-reduced-motion\s*:\s*reduce/.test(allCss)) err('motion', 'animated but no @media (prefers-reduced-motion: reduce) rule');
  if (smil) warn('motion', 'SMIL animation (<animate>) ignores prefers-reduced-motion; prefer CSS keyframes');
  for (const kf of keyframeBlocks(allCss)) {
    const props = new Set([...kf.body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]));
    for (const p of props) {
      if (LAYOUT_ANIM.has(p)) err('motion', `@keyframes ${kf.name} animates ${p}, which forces layout. Use transform`);
      else if (!ALLOWED_ANIM.has(p)) warn('motion', `@keyframes ${kf.name} animates ${p}; prefer transform/opacity for smooth playback`);
    }
    if (mode === 'inline' && !/^smk-/.test(kf.name)) warn('scope', `@keyframes ${kf.name} is global in a page; prefix it (smk-...) to avoid clashes`);
  }
  for (const m of allCss.matchAll(/animation[^;{}]*?\b(0?\.\d+|\d+(?:\.\d+)?)(m?s)\b[^;{}]*infinite/g)) {
    const secs = m[2] === 'ms' ? parseFloat(m[1]) / 1000 : parseFloat(m[1]);
    if (secs < 0.34 && /opacity|blink|flash/i.test(m[0])) warn('motion', `fast infinite animation (${m[1]}${m[2]}); keep flashes under 3 per second (WCAG 2.3.1)`);
  }

  // --- scoping (inline only: <style> inside inline SVG applies to the whole page)
  if (mode === 'inline' && blocks.length) {
    const rootClass = (rootAttrs.match(/\bclass\s*=\s*["']([^"']+)["']/) || [])[1]?.split(/\s+/).find((c) => c.startsWith('smk-')) || null;
    const unscoped = ruleSelectors(allCss).filter((s) => !(rootClass && new RegExp(`\\.${rootClass}(?![\\w-])`).test(s)) && !/^:root$/.test(s));
    if (!rootClass) warn('scope', 'root <svg> has no smk-* class; styles inside an inline SVG leak to the whole page');
    else if (unscoped.length) warn('scope', `selectors not scoped to .${rootClass}: ${unscoped.slice(0, 4).join(', ')}`);
    if (/:root\b/.test(allCss)) warn('scope', ':root rules in an inline SVG change the whole page');
  }

  // --- ids (duplicates break gradients/clips when the SVG appears twice on a page)
  const ids = [...svg.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) err('structure', `duplicate id(s): ${[...new Set(dup)].join(', ')}`);
  if (mode === 'inline' && ids.some((id) => !/[-_][a-z0-9]{4,}$/i.test(id))) warn('scope', 'ids without a unique suffix will clash if this SVG appears twice on a page');

  // --- size
  const bytes = Buffer.byteLength(svg);
  if (bytes > maxKb * 1024) err('size', `${(bytes / 1024).toFixed(1)} KB is over the ${maxKb} KB budget`);

  return { errors, warnings, bytes };
}

function main(argv) {
  const args = argv.slice(2);
  const get = (flag, def) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : def; };
  const mode = get('--mode', 'inline');
  const maxKb = Number(get('--max-kb', 15));
  const json = args.includes('--json');
  const files = args.filter((a, i) => !a.startsWith('--') && !['--mode', '--max-kb'].includes(args[i - 1]));
  if (!files.length || !['inline', 'standalone'].includes(mode)) {
    console.error('Usage: node validate-svg.mjs <file.svg>... [--mode inline|standalone] [--max-kb 15] [--json]');
    process.exit(2);
  }
  let failed = false;
  const results = [];
  for (const f of files) {
    const svg = fs.readFileSync(f, 'utf8');
    const r = validateSvg(svg, { mode, maxKb });
    results.push({ file: f, ...r });
    if (r.errors.length) failed = true;
  }
  if (json) console.log(JSON.stringify(results, null, 2));
  else {
    for (const r of results) {
      const status = r.errors.length ? '✘' : '✔';
      console.log(`${status} ${r.file} (${(r.bytes / 1024).toFixed(1)} KB, ${mode})`);
      for (const e of r.errors) console.log(`    error  [${e.rule}] ${e.msg}`);
      for (const w of r.warnings) console.log(`    warn   [${w.rule}] ${w.msg}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main(process.argv);
