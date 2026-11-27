import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { perfAudit } from '../plugins/svg-motion-kit/skills/perf-audit/scripts/perf-audit.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = () => fs.mkdtempSync(path.join(repo, 'tests', '.tmp-'));

test('slow-next: every planted problem is found', () => {
  const dir = tmp();
  try {
    fs.cpSync(path.join(repo, 'examples/slow-next'), dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'public/hero.png'), Buffer.alloc(700 * 1024, 7)); // large image, generated so the repo stays small
    const a = perfAudit(dir);
    const ids = new Set(a.findings.map((f) => f.id));
    for (const id of ['perf.image.format', 'perf.bundle.client-layout', 'perf.font.thai-weights', 'perf.font.thai-subset', 'perf.font.next-font', 'perf.third-party.script',
      'perf.fetch.waterfall', 'perf.fetch.loop', 'perf.cache.all-dynamic', 'perf.image.next-img', 'perf.image.dimensions', 'perf.image.lcp-priority',
      'perf.fetch.effect', 'perf.fetch.no-abort', 'perf.render.index-key', 'perf.bundle.moment', 'perf.bundle.lodash', 'perf.bundle.dynamic-import', 'perf.motion.lottie']) {
      assert.ok(ids.has(id), `missing ${id}`);
    }
    const img = a.findings.find((f) => f.id === 'perf.image.format');
    assert.equal(img.severity, 'high');
    assert.equal(img.file, 'public/hero.png');
    const wf = a.findings.find((f) => f.id === 'perf.fetch.waterfall');
    assert.deepEqual([wf.file, wf.line], ['app/page.tsx', 8]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('false-positive guards: dependent and guarded awaits, static lists, generated code, keyframe bounds', () => {
  const dir = tmp();
  try {
    fs.mkdirSync(path.join(dir, 'src/generated'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), '{"dependencies":{"next":"15.0.0","react":"19.0.0"}}');
    fs.writeFileSync(path.join(dir, 'src/a.ts'), [
      'export async function a() {',
      '  const user = await getUser();',
      '  const orders = await getOrders(',
      '    { userId: user.id },',
      '  );',
      '  return orders;',
      '}',
      'export async function b() {',
      '  const id = await getSessionId();',
      '  if (!id) return null;',
      '  const row = await db.find({ x: 1 });',
      '  return row;',
      '}',
    ].join('\n'));
    fs.writeFileSync(path.join(dir, 'src/List.tsx'), 'export const L = () => <div>{[40, 60, 80].map((w, i) => <span key={i} style={{ width: w }} />)}</div>;');
    fs.writeFileSync(path.join(dir, 'src/generated/client.js'), 'for (const x of xs) {\n  await fetch(x);\n}\n');
    fs.writeFileSync(path.join(dir, 'src/a.css'), '@keyframes fade {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}\n.box { width: 10px; height: 10px; }\n');
    assert.deepEqual(perfAudit(dir).findings.map((f) => `${f.id} ${f.file}:${f.line}`), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('clean examples have no high-severity performance findings', () => {
  for (const e of ['plain-html', 'vite-tailwind3', 'next-tailwind']) {
    assert.deepEqual(perfAudit(path.join(repo, 'examples', e)).findings.filter((f) => f.severity === 'high'), [], e);
  }
});

test('a long useEffect is still read to its end (regression from a live run)', () => {
  const dir = fs.mkdtempSync(path.join(repo, 'tests', '.tmp-'));
  try {
    fs.writeFileSync(path.join(dir, 'package.json'), '{"dependencies":{"react":"19.0.0"}}');
    const filler = Array.from({ length: 15 }, (_, i) => `    const v${i} = ${i};`).join('\n');
    fs.writeFileSync(path.join(dir, 'List.tsx'), `import { useEffect } from "react";\nexport function L() {\n  useEffect(() => {\n${filler}\n    fetch("/api/x").then((r) => r.json());\n  }, []);\n  return null;\n}\n`);
    const ids = perfAudit(dir).findings.map((f) => f.id);
    assert.ok(ids.includes('perf.fetch.effect') && ids.includes('perf.fetch.no-abort'), ids.join(','));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
