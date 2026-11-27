// audit-core.mjs — shared pieces for every svg-motion-kit audit (ui, perf, security, polish, audit)
//
// - walkFiles / readText: bounded, read-only project walking that skips build output and deps
// - finding(): the shared finding shape (see docs/ROADMAP.md "Shared finding format")
// - scoreArea(): 0–100 health score per area from findings
// - toMarkdown() / writeReport(): human report + JSON in <project>/.svg-motion/
//
// Zero dependencies, no network.

import fs from 'node:fs';
import path from 'node:path';

export const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.output', '.astro', 'dist', 'build', 'out', 'coverage',
  '.turbo', '.vercel', '.netlify', 'vendor', '.svg-motion', '.cache', 'storybook-static', 'env', 'venv', '.venv',
  '__pycache__', 'target', 'Pods', 'DerivedData', '.idea', '.vscode',
]);
export const SKIP_FILE = /(\.test\.|\.spec\.|\.stories\.|\.d\.ts$|\.min\.(js|css)$|\.dc\.html$|(^|\/)(tests?|__tests__|e2e|cypress|playwright|__mocks__|__fixtures__|fixtures|design-mockups|mockups?|prototypes?|sandbox|generated|__generated__|\.prisma)\/)/;
/** Folders that hold tooling, not the shipped app. UX/perf/polish skip them; security still scans them. */
export const NON_APP = /(^|\/)(scripts?|bin|tools|migrations|seeds?|prisma\/seed|cli)\//;
export const UI_EXT = new Set(['.tsx', '.jsx', '.vue', '.svelte', '.astro', '.html']);
export const CODE_EXT = new Set([...UI_EXT, '.ts', '.js', '.mjs', '.cjs']);
export const STYLE_EXT = new Set(['.css', '.scss', '.sass', '.less', '.pcss']);

/** List files under root (relative, forward slashes). `include(rel, ext)` filters. */
export function walkFiles(root, { include = () => true, ignoreDirs = IGNORE_DIRS, skip = SKIP_FILE, maxFiles = 10000, maxDepth = 12, hidden = false } = {}) {
  const files = [];
  const visit = (dir, depth) => {
    if (depth > maxDepth || files.length >= maxFiles) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (files.length >= maxFiles) return;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!ignoreDirs.has(e.name) && (hidden || !e.name.startsWith('.'))) visit(full, depth + 1);
      } else if (e.isFile()) {
        const rel = path.relative(root, full).split(path.sep).join('/');
        if (skip && skip.test(rel)) continue;
        if (include(rel, path.extname(e.name).toLowerCase())) files.push(rel);
      }
    }
  };
  visit(path.resolve(root), 0);
  return files;
}

export function readText(root, rel, maxBytes = 512 * 1024) {
  try {
    const full = path.join(root, rel);
    if (fs.statSync(full).size > maxBytes) return null;
    const text = fs.readFileSync(full, 'utf8');
    // Minified or bundled output (very long lines) is not source anyone edits.
    if (/\.(m?js|cjs|css)$/.test(rel) && text.length > 20000 && text.length / (text.split('\n').length || 1) > 400) return null;
    return text;
  } catch { return null; }
}

export function fileSize(root, rel) {
  try { return fs.statSync(path.join(root, rel)).size; } catch { return 0; }
}

export function readJson(root, rel) {
  const t = readText(root, rel);
  if (t == null) return null;
  try { return JSON.parse(t); } catch { return null; }
}

export const lineAt = (text, index) => text.slice(0, index).split('\n').length;

/** Find the shallowest package.json (monorepo-friendly) and return { dir, pkg, deps }. */
export function projectPackage(root) {
  const candidates = walkFiles(root, { include: (rel) => /(^|\/)package\.json$/.test(rel), maxDepth: 4 })
    .sort((a, b) => a.split('/').length - b.split('/').length);
  const pick = candidates.find((f) => {
    const p = readJson(root, f) || {};
    const d = { ...p.dependencies, ...p.devDependencies };
    return d.next || d.react || d.vue || d.svelte || d.astro || d.nuxt || d['@sveltejs/kit'];
  }) || candidates[0];
  if (!pick) return { dir: '', pkg: {}, deps: {} };
  const pkg = readJson(root, pick) || {};
  return { dir: path.posix.dirname(pick) === '.' ? '' : path.posix.dirname(pick), pkg, deps: { ...pkg.dependencies, ...pkg.devDependencies } };
}

export const SEVERITIES = ['high', 'medium', 'low'];
const EFFORT_ORDER = { S: 0, M: 1, L: 2 };

/** Build a finding in the shared format. */
export function finding({ id, area, severity = 'medium', effort = 'S', title, file = null, line = null, evidence = '', why = '', fix = '', autofix = false, playbook = null }) {
  return {
    id, area, severity, effort, title,
    file, line,
    evidence: String(evidence).replace(/\s+/g, ' ').trim().slice(0, 180),
    why, fix, autofix, ...(playbook ? { playbook } : {}),
  };
}

export function sortFindings(list) {
  const sev = { high: 0, medium: 1, low: 2 };
  return [...list].sort((a, b) => sev[a.severity] - sev[b.severity] || EFFORT_ORDER[a.effort] - EFFORT_ORDER[b.effort]
    || a.id.localeCompare(b.id) || String(a.file).localeCompare(String(b.file)) || (a.line ?? 0) - (b.line ?? 0));
}

/**
 * Health score 0–100 for an area. Each distinct check costs its weight once, repeats cost a little,
 * so one systemic issue doesn't zero the score but many different problems do.
 */
export function scoreArea(findings) {
  const weight = { high: 12, medium: 5, low: 2 };
  const byId = new Map();
  for (const f of findings) byId.set(f.id, [...(byId.get(f.id) || []), f]);
  let penalty = 0;
  for (const list of byId.values()) {
    // a widespread issue costs a bit more than a one-off, but is still one thing to fix
    penalty += weight[list[0].severity] + Math.min(list.length - 1, 3);
  }
  return Math.max(0, 100 - penalty);
}

/** Collapse repeats of the same check: keep up to `keep` examples per id, count the rest. */
export function groupFindings(findings, keep = 3) {
  const groups = new Map();
  for (const f of sortFindings(findings)) {
    const g = groups.get(f.id) || { ...f, count: 0, examples: [] };
    g.count++;
    if (g.examples.length < keep) g.examples.push({ file: f.file, line: f.line, evidence: f.evidence });
    groups.set(f.id, g);
  }
  return [...groups.values()];
}

const where = (e) => (e.file ? `\`${e.file}${e.line ? `:${e.line}` : ''}\`` : '_(project)_');

/** Markdown report for one or more areas. `report` = { title, root, areas: [{ area, score, findings, checked, notChecked }] } */
export function toMarkdown(report) {
  const out = [`# ${report.title}`, ''];
  out.push(`Project: \`${report.root}\` · generated ${new Date().toISOString().slice(0, 10)} by svg-motion-kit`, '');
  if (report.areas.length > 1) {
    out.push('| Area | Score | High | Medium | Low |', '|---|---|---|---|---|');
    for (const a of report.areas) {
      const c = (s) => a.findings.filter((f) => f.severity === s).length;
      out.push(`| ${a.area} | ${a.score}/100 | ${c('high')} | ${c('medium')} | ${c('low')} |`);
    }
    out.push('');
  }
  if (report.top?.length) {
    out.push('## Do these first', '');
    report.top.forEach((g, i) => out.push(`${i + 1}. **${g.title}** (${g.area}, ${g.severity}, effort ${g.effort}): ${where(g.examples[0])}${g.count > 1 ? ` and ${g.count - 1} more` : ''}`));
    out.push('');
  }
  for (const a of report.areas) {
    out.push(`## ${a.area} — ${a.score}/100`, '');
    if (!a.findings.length) out.push('No issues found by these checks.', '');
    for (const g of groupFindings(a.findings)) {
      out.push(`### [${g.severity}] ${g.title}${g.count > 1 ? ` (${g.count})` : ''}`, '');
      if (g.why) out.push(`**Why it matters:** ${g.why}`, '');
      if (g.fix) out.push(`**Fix:** ${g.fix}${g.autofix ? ' _(auto-fixable with a diff)_' : ''}`, '');
      for (const e of g.examples) out.push(`- ${where(e)}${e.evidence ? ` — \`${e.evidence.replace(/`/g, "'")}\`` : ''}`);
      if (g.count > g.examples.length) out.push(`- …and ${g.count - g.examples.length} more`);
      out.push('');
    }
    if (a.checked?.length) out.push(`<details><summary>What was checked</summary>\n\n${a.checked.map((c) => `- ${c}`).join('\n')}\n</details>`, '');
    if (a.notChecked?.length) out.push(`**Not covered by static checks:** ${a.notChecked.join('; ')}.`, '');
  }
  return out.join('\n');
}

/** Write <root>/.svg-motion/<name>.json and .md. Returns the paths. */
export function writeReport(root, name, report) {
  const dir = path.join(root, '.svg-motion');
  fs.mkdirSync(dir, { recursive: true });
  const json = path.join(dir, `${name}.json`);
  const md = path.join(dir, `${name}.md`);
  fs.writeFileSync(json, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(md, `${toMarkdown(report)}\n`);
  return { json, md };
}

/** Standard CLI wrapper: <script> [dir] [--json] [--write] */
export function runCli(argv, { name, title, run }) {
  const args = argv.slice(2);
  const dir = args.find((a) => !a.startsWith('--')) || '.';
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) { console.error(`Not a directory: ${dir}`); process.exit(2); }
  const area = run(path.resolve(dir));
  const report = { title, root: path.resolve(dir), areas: [area] };
  if (args.includes('--json')) { console.log(JSON.stringify(report, null, 2)); }
  else {
    console.log(`${title} — ${area.score}/100 · ${area.scanned} files · ${area.findings.length} findings\n`);
    for (const g of groupFindings(area.findings, 2)) {
      console.log(`[${g.severity}/${g.effort}] ${g.title}${g.count > 1 ? ` ×${g.count}` : ''}`);
      for (const e of g.examples) console.log(`      ${e.file ? `${e.file}${e.line ? `:${e.line}` : ''}` : '(project)'}  ${e.evidence}`);
    }
    if (area.notChecked?.length) console.log(`\nNot covered: ${area.notChecked.join('; ')}`);
  }
  if (args.includes('--write')) {
    const p = writeReport(path.resolve(dir), name, report);
    console.error(`wrote ${path.relative(process.cwd(), p.md)} and .json`);
  }
}
