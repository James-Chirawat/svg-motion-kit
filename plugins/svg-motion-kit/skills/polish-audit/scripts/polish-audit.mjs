#!/usr/bin/env node
// polish-audit.mjs — the details that separate a professional site from a prototype
//
// Usage: node polish-audit.mjs [projectDir] [--json] [--write]
//
// Design-system use (hardcoded colours and arbitrary spacing next to a real theme, raw buttons
// beside a Button component), code health (any, ts-ignore, lint config, stray console.log),
// i18n (hardcoded text when an i18n library is installed, locale-less date formatting), meta and
// sharing (title, description, Open Graph image, favicon, per-page titles, viewport), edge pages
// (not-found, error), SEO basics (robots, sitemap, heading order).
// Read-only, zero dependencies, no network.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { walkFiles, readText, finding, scoreArea, runCli, projectPackage, UI_EXT, STYLE_EXT, NON_APP } from '../../../shared/audit-core.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { extractTheme } = await import(pathToFileURL(path.join(HERE, '..', '..', 'theme-extract', 'scripts', 'extract-tokens.mjs')).href);

const I18N_LIBS = ['next-intl', 'react-i18next', 'i18next', 'next-i18next', 'vue-i18n', '@nuxtjs/i18n', '@lingui/react', '@lingui/core', 'svelte-i18n', '@inlang/paraglide-js', 'typesafe-i18n', 'rosetta'];
const THAI = /[฀-๿]/;
const exists = (root, rel) => fs.existsSync(path.join(root, rel));
const firstExisting = (root, base, rels) => rels.map((r) => path.posix.join(base, r)).find((r) => exists(root, r));

export function polishAudit(rootDir) {
  const root = path.resolve(rootDir);
  const { deps, dir: pkgDir } = projectPackage(root);
  const base = pkgDir || '';
  const isNext = !!deps.next;
  const i18n = I18N_LIBS.find((l) => deps[l]);
  const findings = [];
  const add = (o) => findings.push(finding({ area: 'polish', ...o }));
  let theme = null;
  try { theme = extractTheme(root); } catch { /* fine */ }
  const hasTheme = theme && theme.confidence !== 'low';

  const files = walkFiles(root, { include: (rel, ext) => !NON_APP.test(rel) && ( UI_EXT.has(ext) || STYLE_EXT.has(ext) || ['.ts', '.js', '.mjs'].includes(ext) ) });
  let anyCount = 0, anyFile = null, ignoreCount = 0, ignoreFile = null, logCount = 0, logFile = null, arbitrarySpacing = 0, spacingFile = null;
  const hasButtonComponent = files.some((f) => /(^|\/)components\/ui\/button\.(t|j)sx?$|(^|\/)Button\.(t|j)sx|(^|\/)button\.vue$/i.test(f));
  let rawButtons = 0, rawButtonFile = null;

  for (const file of files) {
    const text = readText(root, file);
    if (text == null) continue;
    const ext = path.extname(file);
    const ui = UI_EXT.has(ext);
    const lines = text.split('\n');
    const primitive = /(^|\/)components\/ui\//.test(file);

    // ---- code health (TS/JS)
    if (/\.(tsx?|vue)$/.test(file)) {
      const a = (text.match(/:\s*any\b|\bas\s+any\b|<any>|any\[\]/g) || []).length;
      if (a) { anyCount += a; anyFile ||= file; }
    }
    const ig = (text.match(/@ts-ignore|@ts-nocheck|eslint-disable(?!-next-line)\s*$/gm) || []).length;
    if (ig) { ignoreCount += ig; ignoreFile ||= file; }
    if (ui && !/(^|\/)(scripts?|bin)\//.test(file)) {
      const c = (text.match(/console\.log\(/g) || []).length;
      if (c) { logCount += c; logFile ||= file; }
    }
    if (!ui) continue;

    lines.forEach((l, i) => {
      const n = i + 1;
      // ---- design system: hardcoded colours / arbitrary spacing / raw buttons
      if (hasTheme && !primitive) {
        const hexClasses = l.match(/\b(bg|text|border|fill|stroke|from|via|to|ring|outline|decoration|shadow)-\[#[0-9a-fA-F]{3,8}\]/g) || [];
        const inline = l.match(/\b(color|background(?:Color)?|borderColor|fill|stroke)\s*:\s*['"]#[0-9a-fA-F]{3,8}['"]/g) || [];
        if (hexClasses.length || inline.length) add({ id: 'polish.tokens.hardcoded-color', severity: 'low', effort: 'S', title: 'Hardcoded colour instead of a theme token', file, line: n, evidence: [...hexClasses, ...inline].join(' '), why: 'One-off hex values drift from the palette and break in dark mode or when the brand changes.', fix: 'Use the matching theme token (e.g. bg-primary / var(--primary)); add a token if the colour is genuinely new.' });
      }
      const sp = (l.match(/\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-[xy])-\[\d+(\.\d+)?px\]/g) || []).length;
      if (sp) { arbitrarySpacing += sp; spacingFile ||= `${file}:${n}`; }
      if (hasButtonComponent && !primitive && /<button\b[^>]*className=["'{][^>]*\b(bg-|rounded)/.test(l)) { rawButtons++; rawButtonFile ||= `${file}:${n}`; }

      // ---- i18n
      if (i18n) {
        const nodes = l.match(/>([^<>{}]*[฀-๿a-zA-Z]{3,}[^<>{}]*)</g) || [];
        // \W treats Thai as non-word in JS, so test "only punctuation/digits" with Unicode classes
        const hard = nodes.map((s) => s.slice(1, -1).trim()).filter((s) => s && !/^[\s\d\p{P}\p{S}]+$/u.test(s) && !/^\{.*\}$/.test(s) && (THAI.test(s) || /\b[a-z]+\s+[a-z]+\b/i.test(s)));
        if (hard.length && !/\bt\(|useTranslations|<Trans\b|\$t\(|i18n\./.test(l)) add({ id: 'polish.i18n.hardcoded-text', severity: 'medium', effort: 'M', title: 'Hardcoded UI text in an i18n project', file, line: n, evidence: hard[0].slice(0, 80), why: `The project uses ${i18n}, but this text bypasses it: it will not be translated and cannot be edited by translators.`, fix: 'Move the string into the message files and render it with the project\'s t() / useTranslations().' });
      }
      if (/\.(toLocaleDateString|toLocaleTimeString|toLocaleString)\(\s*\)/.test(l) || /new Intl\.(DateTimeFormat|NumberFormat)\(\s*\)/.test(l)) add({ id: 'polish.i18n.default-locale', severity: 'low', effort: 'S', title: 'Date/number formatted with the default locale', file, line: n, evidence: l, why: 'Output depends on the server or browser locale: dates flip between Buddhist and Gregorian years (th-TH) or between formats, and server/client renders can mismatch (hydration errors).', fix: 'Pass an explicit locale and options, e.g. toLocaleDateString("th-TH", { dateStyle: "medium" }) or the app\'s current locale.' });
    });

    // ---- headings per page/component file
    const levels = [...text.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
    if (levels.filter((x) => x === 1).length > 1) add({ id: 'polish.headings.multiple-h1', severity: 'low', effort: 'S', title: 'More than one <h1> in a file', file, line: lines.findIndex((l, i) => /<h1\b/.test(l) && lines.slice(0, i).some((p) => /<h1\b/.test(p))) + 1, evidence: `${levels.filter((x) => x === 1).length} × <h1>`, why: 'Screen-reader users and search engines expect one main heading per page.', fix: 'Keep one <h1> for the page title; demote the others.' });
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i - 1] + 1) { add({ id: 'polish.headings.skip', severity: 'low', effort: 'S', title: 'Heading level skipped', file, evidence: `h${levels[i - 1]} → h${levels[i]}`, why: 'Skipped levels break the document outline that assistive tech uses to navigate.', fix: 'Use the next level down; style it with classes if it must look smaller.' }); break; }
    }

    // ---- plain HTML pages: head essentials
    if (ext === '.html' && /<html\b/i.test(text) && !/(^|\/)(scripts?|tools?|templates?|emails?|og)\//.test(file)) {
      if (!/<meta[^>]+name=["']viewport["']/i.test(text)) add({ id: 'polish.meta.viewport', severity: 'medium', effort: 'S', title: 'No viewport meta tag', file, evidence: '<head> without <meta name="viewport">', why: 'Phones render the page at desktop width, zoomed out.', fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' });
      if (!/<title>\s*\S/i.test(text)) add({ id: 'polish.meta.title', severity: 'medium', effort: 'S', title: 'Page has no <title>', file, evidence: '<head> without <title>', why: 'Tabs, bookmarks and search results show the URL instead.', fix: 'Add a descriptive <title>.' });
      if (!/<meta[^>]+name=["']description["']/i.test(text)) add({ id: 'polish.meta.description', severity: 'low', effort: 'S', title: 'No meta description', file, evidence: 'no <meta name="description">', why: 'Search engines and chat apps make up a snippet.', fix: 'Add a one-sentence <meta name="description">.' });
      if (!/property=["']og:image["']/i.test(text)) add({ id: 'polish.meta.og-image', severity: 'low', effort: 'S', title: 'No Open Graph image', file, evidence: 'no og:image', why: 'Links shared on LINE, Facebook or Slack show a blank card.', fix: 'Add og:title, og:description and a 1200×630 og:image.' });
      if (!/rel=["'](shortcut )?icon["']/i.test(text)) add({ id: 'polish.meta.favicon', severity: 'low', effort: 'S', title: 'No favicon link', file, evidence: 'no <link rel="icon">', why: 'Browser tabs and bookmarks show a generic icon.', fix: 'Add <link rel="icon" href="/favicon.svg"> (and an apple-touch-icon).' });
    }
  }

  // ---- project-level code health
  if (anyCount >= 10) add({ id: 'polish.code.any', severity: anyCount >= 40 ? 'medium' : 'low', effort: 'M', title: 'Many `any` types', file: anyFile, evidence: `${anyCount} uses of any`, why: 'Each any switches off type checking where bugs usually hide (API data, props).', fix: 'Type API responses (zod/infer or generated types) and props; enable noImplicitAny if it is off.' });
  if (ignoreCount >= 3) add({ id: 'polish.code.suppressions', severity: 'low', effort: 'M', title: 'Type/lint checks suppressed', file: ignoreFile, evidence: `${ignoreCount} @ts-ignore / @ts-nocheck / file-wide eslint-disable`, why: 'Suppressions hide real errors and outlive the reason they were added.', fix: 'Fix the underlying types; prefer @ts-expect-error with a comment when unavoidable.' });
  if (logCount >= 10) add({ id: 'polish.code.console', severity: 'low', effort: 'S', title: 'console.log left in UI code', file: logFile, evidence: `${logCount} console.log calls`, why: 'Noisy consoles hide real errors and can leak data.', fix: 'Remove them or use a logger that is silent in production.' });
  const lintConfig = walkFiles(root, { hidden: true, maxDepth: 3, include: (rel) => /(^|\/)(eslint\.config\.(m?js|cjs|ts)|\.eslintrc(\.(json|js|cjs|yml|yaml))?|biome\.jsonc?|\.oxlintrc\.json)$/.test(rel) });
  const pkgHasLint = !!(projectPackage(root).pkg?.eslintConfig);
  if (Object.keys(deps).length && !lintConfig.length && !pkgHasLint) add({ id: 'polish.code.no-lint', severity: 'low', effort: 'S', title: 'No linter configured', file: path.posix.join(base, 'package.json'), evidence: 'no eslint / biome / oxlint config', why: 'Common bugs (missing deps in hooks, unused code, a11y issues) slip through review.', fix: isNext ? 'Run `npx next lint` to set up eslint-config-next (includes jsx-a11y rules).' : 'Add ESLint (with jsx-a11y) or Biome.' });
  if (arbitrarySpacing >= 8) add({ id: 'polish.tokens.arbitrary-spacing', severity: 'low', effort: 'M', title: 'Many arbitrary pixel spacings', file: spacingFile?.split(':')[0], line: Number(spacingFile?.split(':')[1]) || null, evidence: `${arbitrarySpacing} × p-[13px]-style values`, why: 'Off-scale spacing makes layouts feel uneven and is hard to keep consistent.', fix: 'Snap to the spacing scale (p-3, gap-4…) or add named tokens for genuinely special values.' });
  if (rawButtons >= 4) add({ id: 'polish.ui.raw-buttons', severity: 'low', effort: 'M', title: 'Styled raw <button>s next to a Button component', file: rawButtonFile?.split(':')[0], line: Number(rawButtonFile?.split(':')[1]) || null, evidence: `${rawButtons} hand-styled <button>s`, why: 'Hand-styled buttons drift in size, radius, focus and disabled states.', fix: 'Use the shared Button component (add a variant if needed).' });

  // ---- Next.js app router: meta, icons, edge pages, SEO
  const appDir = firstExisting(root, base, ['app', 'src/app']);
  if (isNext && appDir) {
    // Root layout, or (with i18n routing / route groups) the layouts one level down: app/[locale]/layout, app/(site)/layout
    const nested = walkFiles(root, { maxDepth: 8, include: (rel) => new RegExp(`^${appDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[\\[(][^/]+[\\])]/layout\\.(t|j)sx?$`).test(rel) });
    const layoutRel = ['layout.tsx', 'layout.jsx', 'layout.js', 'layout.ts'].map((f) => `${appDir}/${f}`).find((f) => exists(root, f)) || nested[0];
    const layout = [layoutRel, ...nested].filter(Boolean).map((f) => readText(root, f) || '').join('\n');
    if (!/export\s+(const\s+metadata|async\s+function\s+generateMetadata|function\s+generateMetadata)/.test(layout)) add({ id: 'polish.meta.missing', severity: 'medium', effort: 'S', title: 'Root layout exports no metadata', file: layoutRel, evidence: 'no `export const metadata` / generateMetadata', why: 'Every page gets an empty or default title and no description.', fix: 'export const metadata = { title: { default: "App", template: "%s · App" }, description: "…" }.' });
    else {
      if (!/description\s*:/.test(layout)) add({ id: 'polish.meta.description', severity: 'low', effort: 'S', title: 'No default description', file: layoutRel, evidence: 'metadata without description', why: 'Search engines and chat apps make up a snippet.', fix: 'Add description to the root metadata.' });
      if (!/title\s*:\s*\{[^}]*template/.test(layout)) add({ id: 'polish.meta.title-template', severity: 'low', effort: 'S', title: 'No title template', file: layoutRel, evidence: 'metadata.title without template', why: 'Pages either repeat the site name by hand or lose it.', fix: 'title: { default: "Site", template: "%s · Site" }.' });
    }
    const ogFile = walkFiles(root, { maxDepth: 6, include: (rel) => rel.startsWith(appDir) && /opengraph-image\.(png|jpg|jpeg|tsx|jsx|js|ts)$/.test(rel) }).length;
    if (!ogFile && !/openGraph\s*:/.test(layout)) add({ id: 'polish.meta.og-image', severity: 'low', effort: 'S', title: 'No Open Graph image', file: layoutRel, evidence: 'no opengraph-image.* and no metadata.openGraph', why: 'Links shared on LINE, Facebook or Slack show a blank card.', fix: 'Add app/opengraph-image.png (1200×630) or an opengraph-image.tsx that renders one.' });
    const icon = firstExisting(root, base, ['app/favicon.ico', 'app/icon.png', 'app/icon.svg', 'app/icon.tsx', 'src/app/favicon.ico', 'src/app/icon.png', 'src/app/icon.svg', 'public/favicon.ico', 'public/favicon.svg']);
    if (!icon) add({ id: 'polish.meta.favicon', severity: 'low', effort: 'S', title: 'No favicon / app icon', file: appDir, evidence: 'no app/icon.* or favicon', why: 'Tabs and bookmarks show a generic icon; it looks unfinished.', fix: 'Add app/icon.svg (or icon.png) and app/apple-icon.png.' });
    if (!firstExisting(root, base, ['app/not-found.tsx', 'app/not-found.jsx', 'app/not-found.js', 'src/app/not-found.tsx', 'src/app/not-found.jsx', 'src/app/not-found.js'])) add({ id: 'polish.pages.not-found', severity: 'low', effort: 'S', title: 'No custom 404 page', file: appDir, evidence: 'no app/not-found.*', why: 'Broken links land on the framework default, with no way back into the site.', fix: 'Add app/not-found.tsx with navigation back (svg-motion `empty-state` works well here).', autofix: true, playbook: 'add-not-found' });
    if (!firstExisting(root, base, ['app/error.tsx', 'app/error.jsx', 'app/error.js', 'src/app/error.tsx', 'src/app/error.jsx', 'src/app/error.js', 'app/global-error.tsx', 'src/app/global-error.tsx'])) add({ id: 'polish.pages.error', severity: 'low', effort: 'S', title: 'No root error page', file: appDir, evidence: 'no app/error.* or global-error.*', why: 'Unexpected errors show the framework default instead of a branded page with a retry.', fix: 'Add app/error.tsx ("use client") with reset() (svg-motion `error` template).', autofix: true, playbook: 'add-error-state' });
    if (!firstExisting(root, base, ['app/robots.ts', 'app/robots.js', 'app/robots.txt', 'src/app/robots.ts', 'public/robots.txt'])) add({ id: 'polish.seo.robots', severity: 'low', effort: 'S', title: 'No robots.txt', file: appDir, evidence: 'no app/robots.* or public/robots.txt', why: 'Crawlers get no guidance (and staging sites get indexed).', fix: 'Add app/robots.ts; disallow everything on non-production deployments.' });
    if (!firstExisting(root, base, ['app/sitemap.ts', 'app/sitemap.js', 'app/sitemap.xml', 'src/app/sitemap.ts', 'public/sitemap.xml'])) add({ id: 'polish.seo.sitemap', severity: 'low', effort: 'S', title: 'No sitemap', file: appDir, evidence: 'no app/sitemap.* or public/sitemap.xml', why: 'Search engines discover pages slower; dynamic pages may be missed.', fix: 'Add app/sitemap.ts listing public routes.' });
    // pages without their own title
    const pages = walkFiles(root, { include: (rel) => rel.startsWith(appDir) && /\/page\.(t|j)sx?$/.test(rel) && !/\[|\(admin\)|\/admin\//.test(rel) });
    const untitled = pages.filter((p) => p !== `${appDir}/page.tsx` && !/export\s+(const\s+metadata|async\s+function\s+generateMetadata|function\s+generateMetadata)/.test(readText(root, p) || ''));
    if (untitled.length >= 3) add({ id: 'polish.meta.page-titles', severity: 'low', effort: 'S', title: 'Pages without their own title', file: untitled[0], evidence: `${untitled.length} of ${pages.length} static pages`, why: 'Every tab and search result shows the same title.', fix: 'export const metadata = { title: "Page name" } in each page (the layout template adds the site name).' });
  }

  return {
    area: 'Polish',
    scanned: files.length,
    score: scoreArea(findings),
    findings,
    checked: ['hardcoded colours / arbitrary spacing next to a real theme, raw buttons beside a Button component', 'any, suppressions, lint config, console.log', 'hardcoded text in i18n projects, locale-less date/number formatting', 'Next metadata (title template, description, Open Graph image), favicon, per-page titles; HTML head essentials', 'custom 404 and error pages, robots and sitemap', 'multiple h1 and skipped heading levels'],
    notChecked: ['visual consistency as rendered', 'copywriting quality', 'translation completeness', 'structured data (JSON-LD) correctness'],
    context: { framework: theme?.project.framework ?? null, i18n: i18n ?? null },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli(process.argv, { name: 'polish-audit', title: 'Polish audit', run: polishAudit });
}
