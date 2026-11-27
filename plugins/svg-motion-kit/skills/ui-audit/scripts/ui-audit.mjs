#!/usr/bin/env node
// ui-audit.mjs — UX and accessibility review from the code
//
// Usage: node ui-audit.mjs [projectDir] [--json] [--write]
//   --write  saves .svg-motion/ui-audit.md and .json
//
// UX: loading/empty/error coverage for every component that fetches data, forms, tap targets,
// hover-only actions, vague error copy. Accessibility: WCAG AA contrast from the real theme,
// missing alt text, unlabeled inputs and icon buttons, click handlers on non-interactive
// elements, removed focus outlines, missing lang, motion without reduced-motion handling.
// Read-only, zero dependencies, no network.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { walkFiles, readText, finding, scoreArea, runCli, UI_EXT, STYLE_EXT, NON_APP } from '../../../shared/audit-core.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { extractTheme, parseColor } = await import(pathToFileURL(path.join(HERE, '..', '..', 'theme-extract', 'scripts', 'extract-tokens.mjs')).href);

// ---------------------------------------------------------------- contrast

function luminance(hex) {
  const c = parseColor(hex);
  if (!c) return null;
  const [r, g, b] = c.rgb.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return { L: 0.2126 * r + 0.7152 * g + 0.0722 * b, alpha: c.alpha };
}

export function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b);
  if (!la || !lb || la.alpha < 1 || lb.alpha < 1) return null;
  const [hi, lo] = la.L > lb.L ? [la.L, lb.L] : [lb.L, la.L];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

const PAIRS = [
  ['foreground', 'background', 4.5, 'high', 'Body text on the page background'],
  ['mutedForeground', 'background', 4.5, 'medium', 'Secondary text (hints, captions, timestamps)'],
  ['primaryForeground', 'primary', 4.5, 'high', 'Text on primary buttons'],
  ['foreground', 'card', 4.5, 'high', 'Text on cards'],
  ['mutedForeground', 'card', 4.5, 'medium', 'Secondary text on cards'],
  ['primary', 'background', 3, 'medium', 'Primary colour used for links, icons and focus rings'],
];

export function contrastFindings(theme) {
  const out = [];
  if (!theme) return out;
  for (const [fg, bg, min, severity, label] of PAIRS) {
    const f = theme.roles[fg], b = theme.roles[bg];
    if (!f || !b) continue;
    for (const scheme of ['light', 'dark']) {
      const fc = scheme === 'light' ? f.light : f.dark || f.light;
      const bc = scheme === 'light' ? b.light : b.dark || b.light;
      if (scheme === 'dark' && !f.dark && !b.dark) continue;
      const ratio = contrastRatio(fc, bc);
      if (ratio != null && ratio < min) {
        out.push(finding({
          id: 'a11y.contrast', area: 'a11y', severity, effort: 'S',
          title: 'Text colour fails WCAG AA contrast',
          file: f.source || b.source, line: null,
          evidence: `${label} (${scheme}): ${f.var ?? fg} ${fc} on ${b.var ?? bg} ${bc} = ${ratio}:1, needs ${min}:1`,
          why: 'Low-contrast text is hard to read in sunlight, on cheap screens and for people with low vision (WCAG 1.4.3).',
          fix: `Darken/lighten ${f.var ?? fg} until the ratio is at least ${min}:1 (change the token, not each component).`,
          autofix: true, playbook: 'adjust-token-contrast',
        }));
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- code checks

const FETCH = /\b(useQuery|useSuspenseQuery|useSWR|useFetch|useAsyncData|createResource|axios\.|ky\.|\$fetch)\b|\bfetch\s*\(|await\s+(db|prisma|supabase|sql|drizzle)\b/;
const HAS_LOADING = /\b(isLoading|isPending|isFetching|loading|pending|<Suspense|Skeleton|Spinner|status\s*===?\s*['"](loading|pending)['"])/;
const HAS_ERROR = /\b(isError|error|catch\s*\(|\.catch\(|ErrorBoundary|onError|status\s*===?\s*['"]error['"])|!\s*\w+\.ok\b|\.ok\s*\)|\.status\s*>=?\s*400/;
const HAS_EMPTY = /\.length\s*===?\s*0|!\s*[\w.?]+\.length\b|\.length\s*<\s*1|\?\.length|isEmpty|\b(no (results?|items?|data|records?|\w+ yet)|nothing (here|found|yet))\b|ไม่พบ|ไม่มีข้อมูล|ยังไม่มี/i;
// Only copy users see: JSX/HTML text nodes, or strings passed to alert/toast/setError-style calls.
const VAGUE_ERROR = />\s*(error|an error occurred|something went wrong|oops[!.]?|failed\.|เกิดข้อผิดพลาด|ผิดพลาด)\s*[.!]?\s*</i;
const VAGUE_ERROR_CALL = /\b(alert|toast(\.error)?|setError|setMessage|setErrorMessage|notify)\(\s*["'`](error|an error occurred|something went wrong|oops[!.]?|failed|เกิดข้อผิดพลาด|ผิดพลาด)\s*[.!]?["'`]/i;
const NEXT_STEP = /try again|retry|reload|refresh|contact|support|ลองใหม่|ติดต่อ|โหลดใหม่|reset\(/i;

function nearestRouteFile(root, file, names) {
  // Next.js app router: loading.tsx / error.tsx in this folder or any parent up to app/
  let dir = path.posix.dirname(file);
  while (dir && dir !== '.' && /(^|\/)app(\/|$)/.test(dir)) {
    for (const n of names) for (const ext of ['tsx', 'jsx', 'js', 'ts']) if (fs.existsSync(path.join(root, dir, `${n}.${ext}`))) return `${dir}/${n}.${ext}`;
    if (/(^|\/)app$/.test(dir)) break;
    dir = path.posix.dirname(dir);
  }
  return null;
}

/** Opening tags for a JSX/HTML tag name. JSX-aware: `>` inside {…} (e.g. `() => x`) or quotes does not end the tag. */
export function tagBlocks(text, tag) {
  const out = [];
  const re = new RegExp(`<${tag}(?=[\\s/>])`, 'g');
  let m;
  while ((m = re.exec(text))) {
    let i = re.lastIndex, depth = 0, quote = null;
    for (; i < text.length; i++) {
      const ch = text[i];
      if (quote) { if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') quote = ch;
      else if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth <= 0) break;
    }
    const raw = text.slice(re.lastIndex, i);
    out.push({ attrs: raw.replace(/\/\s*$/, ''), index: m.index, end: i + 1, self: /\/\s*$/.test(raw) });
    re.lastIndex = i + 1;
  }
  return out;
}

/** <button …>inner</button> pairs using the JSX-aware tag reader. */
function buttonBlocks(text) {
  return tagBlocks(text, 'button').filter((t) => !t.self).map((t) => {
    const close = text.indexOf('</button>', t.end);
    return { ...t, inner: close > 0 && close - t.end < 600 ? text.slice(t.end, close) : '' };
  });
}

const lineOf = (text, i) => text.slice(0, i).split('\n').length;

export function uiAudit(rootDir) {
  const root = path.resolve(rootDir);
  const files = walkFiles(root, { include: (rel, ext) => !NON_APP.test(rel) && ( UI_EXT.has(ext) || STYLE_EXT.has(ext) || ext === '.ts' || ext === '.js' ) });
  const findings = [];
  let theme = null;
  try { theme = extractTheme(root); } catch { /* fine */ }
  findings.push(...contrastFindings(theme));

  let animates = false, handlesReducedMotion = false, animFile = null;

  for (const file of files) {
    const text = readText(root, file);
    if (text == null) continue;
    const ext = path.extname(file);
    if (/@keyframes|animation\s*:|\banimate-(spin|bounce|pulse|ping)\b|from ["'](framer-motion|motion\/react|motion)["']|gsap/.test(text)) { animates = true; animFile ||= file; }
    if (/prefers-reduced-motion|useReducedMotion|motion-safe:|motion-reduce:|MotionConfig[^>]*reducedMotion/.test(text)) handlesReducedMotion = true;
    if (!UI_EXT.has(ext)) continue;
    const lines = text.split('\n');

    // ---- UX states for data-fetching UI
    if (FETCH.test(text) && /return\s*\(|<template|<\w+[\s>]/.test(text)) {
      const fetchLine = lines.findIndex((l) => FETCH.test(l)) + 1;
      const isRoute = /(^|\/)app\/(.*\/)?page\.(t|j)sx?$/.test(file);
      const loadingOk = HAS_LOADING.test(text) || (isRoute && nearestRouteFile(root, file, ['loading']));
      const errorOk = HAS_ERROR.test(text) || (isRoute && nearestRouteFile(root, file, ['error', 'global-error']));
      const rendersList = /\.map\s*\(/.test(text) || /v-for=|\{#each\b/.test(text);
      if (!errorOk) findings.push(finding({ id: 'ux.states.error', area: 'ux', severity: 'high', effort: 'S', title: 'Data is fetched but failures show nothing', file, line: fetchLine, evidence: lines[fetchLine - 1], why: 'When the request fails users see a blank or frozen screen with no way forward.', fix: 'Handle the error branch with a short message and a retry (svg-motion `error` template), or add an error.tsx boundary.', autofix: true, playbook: 'add-error-state' }));
      if (!loadingOk) findings.push(finding({ id: 'ux.states.loading', area: 'ux', severity: 'medium', effort: 'S', title: 'Data is fetched with no loading state', file, line: fetchLine, evidence: lines[fetchLine - 1], why: 'Without feedback, users assume nothing happened and click again or leave.', fix: 'Show a skeleton shaped like the content (svg-motion `loader`), or add loading.tsx for the route.', autofix: true, playbook: 'add-loading-state' }));
      if (rendersList && !HAS_EMPTY.test(text)) findings.push(finding({ id: 'ux.states.empty', area: 'ux', severity: 'low', effort: 'S', title: 'List has no empty state', file, line: lines.findIndex((l) => /\.map\s*\(|v-for=|\{#each/.test(l)) + 1, evidence: lines[lines.findIndex((l) => /\.map\s*\(|v-for=|\{#each/.test(l))], why: 'An empty list renders as a blank area; first-time users do not know what to do next.', fix: 'Render a friendly empty state with the next action (svg-motion `empty-state`).', autofix: true, playbook: 'add-empty-state' }));
    }

    // ---- images
    for (const t of [...tagBlocks(text, 'img'), ...tagBlocks(text, 'Image')]) {
      if (!/\balt\s*=/.test(t.attrs) && !/aria-hidden|role=["']presentation/.test(t.attrs)) findings.push(finding({ id: 'a11y.img-alt', area: 'a11y', severity: 'medium', effort: 'S', title: 'Image without alt text', file, line: lineOf(text, t.index), evidence: text.slice(t.index, Math.min(t.end, t.index + 120)), why: 'Screen readers announce the file name or nothing (WCAG 1.1.1).', fix: 'Add alt describing the image, or alt="" if it is decorative.' }));
    }

    // ---- form controls without labels
    const labelFor = new Set([...text.matchAll(/\b(htmlFor|for)\s*=\s*(?:["']([^"']+)["']|\{([^}]+)\})/g)].map((m) => (m[2] ?? `{${m[3].trim()}}`)));
    const primitive = /(^|\/)components\/ui\//.test(file); // shadcn-style primitives get their label from the caller
    for (const tag of primitive ? [] : ['input', 'select', 'textarea']) {
      for (const t of tagBlocks(text, tag)) {
        if (/type\s*=\s*["'](hidden|submit|button|reset|image)["']/.test(t.attrs)) continue;
        if (/aria-label(ledby)?\s*=|\{\s*\.\.\.\w+/.test(t.attrs)) continue; // labelled, or props spread from a caller
        const idm = t.attrs.match(/\bid\s*=\s*(?:["']([^"']+)["']|\{([^}]+)\})/);
        const id = idm ? (idm[1] ?? `{${idm[2].trim()}}`) : null;
        if (id && labelFor.has(id)) continue;
        const before = text.slice(Math.max(0, t.index - 300), t.index);
        if (/<label\b(?![\s\S]*<\/label>)/.test(before)) continue; // wrapped in <label>
        findings.push(finding({ id: 'a11y.input-label', area: 'a11y', severity: 'medium', effort: 'S', title: 'Form field without a label', file, line: lineOf(text, t.index), evidence: text.slice(t.index, Math.min(t.end, t.index + 120)), why: 'Placeholders disappear while typing and are not reliable labels; screen readers announce an unnamed field (WCAG 1.3.1, 4.1.2).', fix: 'Add a visible <label htmlFor=…>, or aria-label when a visible label truly is not possible.' }));
      }
    }

    // ---- icon-only buttons
    for (const b of buttonBlocks(text)) {
      const inner = b.inner.replace(/<[^>]*\/>|<svg[\s\S]*?<\/svg>|<[^>]+>/g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim();
      const hasIcon = /<svg|<[A-Z]\w*\b[^>]*\/>/.test(b.inner);
      const evidence = text.slice(b.index, Math.min(b.end + b.inner.length + 9, b.index + 140));
      if (hasIcon && !inner && !/aria-label(ledby)?\s*=|title\s*=/.test(b.attrs) && !/sr-only|visually-hidden/.test(b.inner)) {
        findings.push(finding({ id: 'a11y.icon-button', area: 'a11y', severity: 'medium', effort: 'S', title: 'Icon-only button without an accessible name', file, line: lineOf(text, b.index), evidence, why: 'Screen readers announce just "button", so the action is unknown (WCAG 4.1.2).', fix: 'Add aria-label="…" (or visually hidden text) naming the action.' }));
      }
      // tiny tap targets
      if (/\b(h|size)-(4|5|6|7)\b/.test(b.attrs) || (/\bp-(0|0\.5|1)\b/.test(b.attrs) && !inner)) {
        findings.push(finding({ id: 'ux.tap-target', area: 'ux', severity: 'low', effort: 'S', title: 'Tap target smaller than 32px', file, line: lineOf(text, b.index), evidence, why: 'Small targets cause mis-taps on phones; 44×44px is the comfortable minimum (WCAG 2.5.8 requires at least 24px).', fix: 'Give the button at least h-10 w-10 (40px) or pad the hit area.' }));
      }
    }

    lines.forEach((l, i) => {
      const n = i + 1;
      // click on non-interactive elements
      if (/<(div|span|li|td|p|img)\b[^>]*\bonClick\s*=/.test(l) && !/role\s*=\s*["'](button|link|tab|menuitem|option|checkbox)["']/.test(l)) {
        findings.push(finding({ id: 'a11y.click-div', area: 'a11y', severity: 'medium', effort: 'S', title: 'Click handler on a non-interactive element', file, line: n, evidence: l, why: 'Keyboard and screen-reader users cannot reach or activate it (WCAG 2.1.1).', fix: 'Use a <button> (or <a href> for navigation) instead of a clickable div.' }));
      }
      // removed focus outline
      const wrapperFocus = /focus-within:|has-\[:focus|group-focus/.test(lines.slice(Math.max(0, i - 8), i + 1).join(' '));
      if (/\b(focus:)?outline-none\b/.test(l) && !/(focus-visible|focus):(ring|border|shadow|outline-(?!none))/.test(l) && !/tabIndex=\{?-1/.test(l) && !wrapperFocus && !/(^|\/)components\/ui\//.test(file)) {
        findings.push(finding({ id: 'a11y.focus-outline', area: 'a11y', severity: 'medium', effort: 'S', title: 'Focus outline removed with no replacement', file, line: n, evidence: l, why: 'Keyboard users lose track of where they are (WCAG 2.4.7).', fix: 'Keep outline-none only with a visible focus-visible:ring-2 (or similar) on the same element.' }));
      }
      // hover-only actions
      if (/\bopacity-0\b/.test(l) && /group-hover:opacity-100|hover:opacity-100/.test(l) && !/focus-within|group-focus|focus-visible|focus:opacity/.test(l)) {
        findings.push(finding({ id: 'ux.hover-only', area: 'ux', severity: 'medium', effort: 'S', title: 'Action only appears on hover', file, line: n, evidence: l, why: 'Touch screens and keyboards never hover, so these actions are effectively hidden.', fix: 'Also reveal on focus (group-focus-within:opacity-100), or keep it visible on touch devices.' }));
      }
      // positive tabindex
      if (/tabIndex\s*=\s*\{?\s*["']?[1-9]/.test(l) || /tabindex\s*=\s*["'][1-9]/.test(l)) {
        findings.push(finding({ id: 'a11y.tabindex', area: 'a11y', severity: 'low', effort: 'S', title: 'Positive tabIndex', file, line: n, evidence: l, why: 'It breaks the natural tab order of the page.', fix: 'Use 0 or -1 and fix the DOM order instead.' }));
      }
      // vague error copy
      if ((VAGUE_ERROR.test(l) || VAGUE_ERROR_CALL.test(l)) && !NEXT_STEP.test(lines.slice(Math.max(0, i - 3), i + 4).join(' '))) {
        findings.push(finding({ id: 'ux.copy.vague-error', area: 'ux', severity: 'low', effort: 'S', title: 'Error message without a next step', file, line: n, evidence: l, why: 'Users need to know what happened and what to do; "Error" alone ends the journey.', fix: 'Say what failed in plain words and offer one action: retry, go back, or contact.' }));
      }
    });

    // html lang (attributes may span lines)
    for (const t of tagBlocks(text, 'html')) {
      if (!/\blang\s*=/.test(t.attrs)) findings.push(finding({ id: 'a11y.html-lang', area: 'a11y', severity: 'medium', effort: 'S', title: '<html> has no lang attribute', file, line: lineOf(text, t.index), evidence: text.slice(t.index, Math.min(t.end, t.index + 100)), why: 'Screen readers pick the wrong voice; Thai pages read with an English voice are unintelligible (WCAG 3.1.1).', fix: 'Add lang="th" (or the page language).' }));
    }

    // submit with no visible feedback
    if (/onSubmit|action=\{|@submit|on:submit/.test(text) && /alert\(/.test(text) && !/toast|setStatus|setSuccess|isSuccess|aria-live|role=["']status/.test(text)) {
      const n = lines.findIndex((l) => /alert\(/.test(l)) + 1;
      findings.push(finding({ id: 'ux.form.feedback', area: 'ux', severity: 'low', effort: 'S', title: 'Form feedback uses alert()', file, line: n, evidence: lines[n - 1], why: 'alert() blocks the page, cannot be styled or translated well, and is ignored by many users.', fix: 'Show an inline status (role="status") or a toast; svg-motion `success` for important confirmations.', autofix: true, playbook: 'add-success-state' }));
    }
  }

  if (animates && !handlesReducedMotion) {
    findings.push(finding({ id: 'a11y.reduced-motion', area: 'a11y', severity: 'medium', effort: 'S', title: 'Animations ignore prefers-reduced-motion', file: animFile, evidence: 'animation found; no prefers-reduced-motion / motion-reduce / useReducedMotion anywhere', why: 'Motion can trigger nausea and migraines for people with vestibular disorders (WCAG 2.3.3).', fix: 'Add @media (prefers-reduced-motion: reduce) { * { animation: none } } or motion-reduce: variants; for framer-motion use <MotionConfig reducedMotion="user">.' }));
  }

  return {
    area: 'UX & accessibility',
    scanned: files.length,
    score: scoreArea(findings),
    findings,
    checked: ['loading / error / empty coverage for data-fetching UI (incl. Next loading.tsx/error.tsx)', 'form labels, icon-button names, image alt, click handlers on non-interactive elements', 'focus outlines, positive tabIndex, <html lang>', 'tap targets, hover-only actions, alert() feedback, vague error copy', 'WCAG AA contrast of theme text pairs in light and dark', 'reduced-motion handling'],
    notChecked: ['real rendering and computed colours', 'screen-reader output', 'keyboard traps and focus order at runtime', 'copy tone beyond error messages'],
    context: theme ? { framework: theme.project.framework, confidence: theme.confidence } : null,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli(process.argv, { name: 'ui-audit', title: 'UX & accessibility audit', run: uiAudit });
}
