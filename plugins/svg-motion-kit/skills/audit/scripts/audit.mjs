#!/usr/bin/env node
// audit.mjs — run every svg-motion-kit audit and merge them into one prioritised report
//
// Usage: node audit.mjs [projectDir] [--only ui,perf,security,polish,design] [--skip …] [--json] [--no-write]
//   Writes <project>/.svg-motion/audit.md and audit.json by default (use --no-write to only print).
//
// Areas: UX & accessibility (ui-audit), Performance (perf-audit), Security (security-audit),
// Polish (polish-audit), Design (design-lint, as 100 − genericness) and, as suggestions rather
// than findings, the svg-motion scout's best spots for motion. Every finding gets a stable number
// (F1, F2 …) so a fix can be requested by number.
// Read-only apart from the report files, zero dependencies, no network.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { finding, sortFindings, groupFindings, toMarkdown, scoreArea } from '../../../shared/audit-core.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const skill = (name, file) => pathToFileURL(path.join(HERE, '..', '..', name, 'scripts', file)).href;

export const AREAS = {
  security: { label: 'Security', weight: 0.3, priority: 0 },
  ui: { label: 'UX & accessibility', weight: 0.25, priority: 1 },
  perf: { label: 'Performance', weight: 0.2, priority: 2 },
  design: { label: 'Design', weight: 0.15, priority: 3 },
  polish: { label: 'Polish', weight: 0.1, priority: 4 },
};

async function runArea(key, root) {
  switch (key) {
    case 'ui': return (await import(skill('ui-audit', 'ui-audit.mjs'))).uiAudit(root);
    case 'perf': return (await import(skill('perf-audit', 'perf-audit.mjs'))).perfAudit(root);
    case 'security': return (await import(skill('security-audit', 'security-audit.mjs'))).securityAudit(root);
    case 'polish': return (await import(skill('polish-audit', 'polish-audit.mjs'))).polishAudit(root);
    case 'design': {
      const r = (await import(skill('design-lint', 'lint-design.mjs'))).lintDesign(root);
      const findings = r.findings.map((f) => finding({ id: `design.${f.rule}`, area: 'design', severity: f.severity, effort: f.rule.startsWith('theme') ? 'M' : 'S', title: f.title, file: f.file, line: f.line, evidence: f.evidence, why: 'Reads as generic AI-generated UI rather than this product.', fix: f.fix, playbook: 'design-direction' }));
      return { area: 'Design', scanned: r.scanned, score: 100 - r.score, findings, genericness: r.score, band: r.band, checked: ['12 generic-AI-look rules (design-lint)'], notChecked: ['visual quality as rendered'] };
    }
    default: throw new Error(`unknown area ${key}`);
  }
}

/** Rank grouped findings for "Do these first". */
export function topActions(findings, n = 10) {
  const sev = { high: 0, medium: 1, low: 2 };
  const eff = { S: 0, M: 1, L: 2 };
  const areaKey = (f) => (f.area === 'ux' || f.area === 'a11y' ? 'ui' : f.area === 'performance' ? 'perf' : f.area);
  return groupFindings(findings, 3)
    .sort((a, b) => sev[a.severity] - sev[b.severity] || (AREAS[areaKey(a)]?.priority ?? 9) - (AREAS[areaKey(b)]?.priority ?? 9) || eff[a.effort] - eff[b.effort] || b.count - a.count)
    .slice(0, n);
}

export async function runAudit(rootDir, { only, skip = [] } = {}) {
  const root = path.resolve(rootDir);
  const keys = (only?.length ? only : Object.keys(AREAS)).filter((k) => !skip.includes(k));
  const areas = [];
  for (const key of keys) {
    const a = await runArea(key, root);
    areas.push({ key, ...a, area: AREAS[key].label });
  }
  // number every finding (stable order: severity, effort, id, file, line)
  let n = 0;
  for (const a of areas) a.findings = sortFindings(a.findings).map((f) => ({ ref: `F${++n}`, ...f }));
  const all = areas.flatMap((a) => a.findings);
  const weightSum = areas.reduce((s, a) => s + AREAS[a.key].weight, 0) || 1;
  const overall = Math.round(areas.reduce((s, a) => s + a.score * AREAS[a.key].weight, 0) / weightSum);

  let motion = [];
  try {
    const { scout } = await import(skill('svg-motion', 'scout.mjs'));
    motion = scout(root, { top: 5 }).spots.filter((s) => !s.illustrated);
  } catch { /* optional */ }

  return {
    title: 'Frontend audit',
    root,
    generatedAt: new Date().toISOString(),
    generator: 'svg-motion-kit/audit',
    overall,
    areas,
    top: topActions(all, 10),
    motion,
  };
}

export function auditMarkdown(report) {
  const md = toMarkdown(report).split('\n');
  const head = [`**Overall: ${report.overall}/100** (weighted: security 30%, UX & a11y 25%, performance 20%, design 15%, polish 10%)`, ''];
  md.splice(3, 0, ...head);
  let out = md.join('\n')
    // reference numbers make "fix F12" possible
    .replace(/^### \[(high|medium|low)\] (.+)$/gm, (line, sev, title) => {
      const ids = report.areas.flatMap((a) => a.findings).filter((f) => f.title === title.replace(/ \(\d+\)$/, '')).map((f) => f.ref);
      return `### [${sev}] ${title}  \`${ids.slice(0, 6).join(' ')}${ids.length > 6 ? ' …' : ''}\``;
    });
  if (report.motion?.length) {
    out += `\n## Where motion would help (svg-motion)\n\n${report.motion.map((s) => `- **${s.kind}** → \`${s.template}\` at ${s.file ? `\`${s.file}:${s.line}\`` : '_(whole app)_'} — ${s.why}`).join('\n')}\n`;
  }
  out += '\n---\nTo fix something, ask for it by number (e.g. "fix F3 and F7"). Fixes are applied one at a time, each shown as a diff first.\n';
  return out;
}

async function main(argv) {
  const args = argv.slice(2);
  const list = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1].split(',').map((s) => s.trim()) : undefined; };
  const dir = args.find((a, i) => !a.startsWith('--') && !['--only', '--skip'].includes(args[i - 1])) || '.';
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) { console.error(`Not a directory: ${dir}`); process.exit(2); }
  const report = await runAudit(dir, { only: list('--only'), skip: list('--skip') || [] });
  if (!args.includes('--no-write')) {
    const out = path.join(path.resolve(dir), '.svg-motion');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'audit.json'), `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(path.join(out, 'audit.md'), auditMarkdown(report));
  }
  if (args.includes('--json')) { console.log(JSON.stringify(report, null, 2)); return; }
  console.log(`Frontend audit — overall ${report.overall}/100`);
  for (const a of report.areas) {
    const c = (s) => a.findings.filter((f) => f.severity === s).length;
    console.log(`  ${a.area.padEnd(20)} ${String(a.score).padStart(3)}/100   high ${c('high')}  medium ${c('medium')}  low ${c('low')}`);
  }
  console.log('\nDo these first:');
  report.top.forEach((g, i) => {
    const refs = report.areas.flatMap((a) => a.findings).filter((f) => f.id === g.id).map((f) => f.ref);
    const e = g.examples[0];
    console.log(`${String(i + 1).padStart(2)}. [${g.severity}/${g.effort}] ${g.title} — ${e.file ? `${e.file}${e.line ? `:${e.line}` : ''}` : '(project)'}${g.count > 1 ? ` +${g.count - 1}` : ''}  (${refs.slice(0, 3).join(' ')}${refs.length > 3 ? ' …' : ''})`);
  });
  if (report.motion.length) console.log(`\nMotion opportunities: ${report.motion.map((s) => `${s.kind}@${s.file ?? 'app'}`).join(', ')}`);
  if (!args.includes('--no-write')) console.error('\nwrote .svg-motion/audit.md and audit.json');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main(process.argv).catch((e) => { console.error(e.message); process.exit(1); });

export { scoreArea };
