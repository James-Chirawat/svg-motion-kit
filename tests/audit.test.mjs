import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runAudit, auditMarkdown, topActions } from '../plugins/svg-motion-kit/skills/audit/scripts/audit.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ex = (n) => path.join(repo, 'examples', n);

test('audit merges all five areas with numbered findings and an overall score', async () => {
  const r = await runAudit(ex('ux-gaps'));
  assert.deepEqual(r.areas.map((a) => a.key), ['security', 'ui', 'perf', 'design', 'polish']);
  const refs = r.areas.flatMap((a) => a.findings.map((f) => f.ref));
  assert.equal(new Set(refs).size, refs.length, 'refs are unique');
  assert.equal(refs[0], 'F1');
  assert.ok(r.overall > 0 && r.overall < 100);
  assert.equal(r.top[0].severity, 'high');
  assert.ok(r.motion.length >= 1, 'scout suggestions included');
});

test('--only / --skip limit the areas', async () => {
  const r = await runAudit(ex('plain-html'), { only: ['design', 'polish'] });
  assert.deepEqual(r.areas.map((a) => a.key), ['design', 'polish']);
  const s = await runAudit(ex('plain-html'), { skip: ['security', 'perf'] });
  assert.deepEqual(s.areas.map((a) => a.key), ['ui', 'design', 'polish']);
});

test('top actions put security highs before UX highs, and S effort before M', () => {
  const mk = (id, area, severity, effort) => ({ id, area, severity, effort, title: id, file: 'a', line: 1, evidence: '' });
  const top = topActions([mk('ux.a', 'ux', 'high', 'S'), mk('sec.b', 'security', 'high', 'M'), mk('perf.c', 'performance', 'medium', 'S'), mk('sec.d', 'security', 'high', 'S')]);
  assert.deepEqual(top.map((g) => g.id), ['sec.d', 'sec.b', 'ux.a', 'perf.c']);
});

test('markdown report lists refs, motion suggestions and how to request fixes', async () => {
  const r = await runAudit(ex('generic-ai'), { only: ['design', 'ui'] });
  const md = auditMarkdown(r);
  assert.match(md, /\*\*Overall: \d+\/100\*\*/);
  assert.match(md, /### \[high\] Indigo\/violet\/purple gradient.*`F\d+/);
  assert.match(md, /fix F3 and F7/);
});

test('CLI writes .svg-motion/audit.md and audit.json', () => {
  const dir = fs.mkdtempSync(path.join(repo, 'tests', '.tmp-'));
  try {
    fs.cpSync(ex('leaky'), dir, { recursive: true });
    const res = spawnSync(process.execPath, [path.join(repo, 'plugins/svg-motion-kit/skills/audit/scripts/audit.mjs'), dir, '--only', 'security'], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /Do these first/);
    const json = JSON.parse(fs.readFileSync(path.join(dir, '.svg-motion/audit.json'), 'utf8'));
    assert.equal(json.areas[0].key, 'security');
    assert.ok(fs.readFileSync(path.join(dir, '.svg-motion/audit.md'), 'utf8').includes('Security'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
