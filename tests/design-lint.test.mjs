import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintDesign } from '../plugins/svg-motion-kit/skills/design-lint/scripts/lint-design.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ex = (n) => path.join(repo, 'examples', n);

test('generic-ai example is caught: high score and every planted rule', () => {
  const r = lintDesign(ex('generic-ai'));
  assert.ok(r.score >= 45, `score ${r.score}`);
  assert.equal(r.band, 'looks AI-generated');
  for (const rule of ['purple-gradient', 'theme-ai-purple', 'gradient-text', 'glow-shadow', 'glassmorphism', 'blur-orbs', 'sparkles', 'emoji-icons', 'ai-copy', 'uniform-cards', 'pill-badge', 'generic-font']) {
    assert.ok(r.rules[rule], `missing ${rule}; got ${Object.keys(r.rules).join(', ')}`);
  }
  const grad = r.findings.find((f) => f.rule === 'purple-gradient' && f.file === 'app/page.tsx');
  assert.equal(grad.line, 13);
  assert.equal(r.findings[0].severity, 'high');
});

test('distinct examples stay clean', () => {
  assert.equal(lintDesign(ex('plain-html')).score, 0);
  assert.equal(lintDesign(ex('no-theme')).score, 0);
  const vite = lintDesign(ex('vite-tailwind3'));
  assert.ok(vite.score < 20, `vite ${vite.score}`);
  // next-tailwind uses a violet primary on purpose: flagged once, still "distinct"
  const next = lintDesign(ex('next-tailwind'));
  assert.deepEqual(Object.keys(next.rules), ['theme-ai-purple']);
  assert.equal(next.band, 'distinct');
});

test('frosted sticky headers and neutral shadows are not flagged', () => {
  const dir = fs.mkdtempSync(path.join(repo, 'tests', '.tmp-'));
  try {
    fs.writeFileSync(path.join(dir, 'Header.tsx'), [
      'export const H = () => <header className="sticky top-0 bg-white/80 backdrop-blur border-b">x</header>;',
      'export const C = () => <div className="rounded-lg shadow-sm">y</div>;',
      'export const G = () => <div className="bg-gradient-to-r from-emerald-500 to-teal-500">z</div>;',
    ].join('\n'));
    fs.writeFileSync(path.join(dir, 'a.css'), '.card { box-shadow: 0 1px 2px rgba(0,0,0,.1); }\n.hero { background: linear-gradient(90deg, #0ea5e9, #14b8a6); }\n');
    assert.deepEqual(lintDesign(dir).findings, []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
