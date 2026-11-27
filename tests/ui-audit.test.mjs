import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { uiAudit, contrastRatio, tagBlocks } from '../plugins/svg-motion-kit/skills/ui-audit/scripts/ui-audit.mjs';
import { scoreArea, toMarkdown, finding } from '../plugins/svg-motion-kit/shared/audit-core.mjs';
import { renderTemplate, TEMPLATE_DIR } from '../plugins/svg-motion-kit/skills/svg-motion/scripts/render-template.mjs';
import { svgToVue, svgToSvelte, globalizeCss } from '../plugins/svg-motion-kit/skills/svg-motion/scripts/to-component.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ex = (n) => path.join(repo, 'examples', n);
const ids = (a) => new Set(a.findings.map((f) => f.id));

test('contrast ratio matches WCAG reference values', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.equal(contrastRatio('#777777', '#ffffff'), 4.48);
  assert.equal(contrastRatio('#ffffff', '#f59e0b'), 2.15);
  assert.equal(contrastRatio('#ffffff1a', '#000000'), null, 'translucent colours are skipped');
});

test('tagBlocks reads JSX attributes containing arrow functions', () => {
  const [b] = tagBlocks('<button className="x" onClick={() => go(a > b)}><Icon /></button>', 'button');
  assert.match(b.attrs, /onClick=\{\(\) => go\(a > b\)\}/);
});

test('ux-gaps: every planted problem is found with file:line', () => {
  const a = uiAudit(ex('ux-gaps'));
  for (const id of ['ux.states.error', 'ux.states.loading', 'ux.states.empty', 'ux.tap-target', 'ux.hover-only', 'ux.form.feedback', 'ux.copy.vague-error',
    'a11y.contrast', 'a11y.img-alt', 'a11y.input-label', 'a11y.icon-button', 'a11y.click-div', 'a11y.focus-outline', 'a11y.html-lang', 'a11y.reduced-motion']) {
    assert.ok(ids(a).has(id), `missing ${id}`);
  }
  const btn = a.findings.find((f) => f.id === 'a11y.icon-button');
  assert.deepEqual([btn.file, btn.line], ['components/UserList.tsx', 17]);
  const c = a.findings.filter((f) => f.id === 'a11y.contrast').map((f) => f.evidence).join(' | ');
  assert.match(c, /--primary-foreground #ffffff on --primary #f59e0b = 2\.15:1/);
  assert.ok(a.score < 40, `score ${a.score}`);
});

test('clean examples stay clean (no high-severity false positives)', () => {
  for (const e of ['vite-tailwind3', 'plain-html', 'no-theme']) {
    const highs = uiAudit(ex(e)).findings.filter((f) => f.severity === 'high');
    assert.deepEqual(highs.map((f) => f.evidence), [], e);
  }
});

test('false-positive guards: status strings, labelled dynamic ids, primitives, mockups, tabIndex -1', () => {
  const dir = fs.mkdtempSync(path.join(repo, 'tests', '.tmp-'));
  try {
    fs.mkdirSync(path.join(dir, 'components/ui'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'design-mockups'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'A.tsx'), [
      'export function A({ id, s }) {',
      '  if (s === "failed") return null;',
      '  return (<div><label htmlFor={id}>Name</label><input id={id} />',
      '  <main tabIndex={-1} className="outline-none">x</main>',
      '  <div className="focus-within:ring-2"><input aria-label="q" className="outline-none" /></div></div>);',
      '}',
    ].join('\n'));
    fs.writeFileSync(path.join(dir, 'components/ui/input.tsx'), 'export const Input = (p) => <input className="outline-none focus-visible:ring-2" {...p} />;');
    fs.writeFileSync(path.join(dir, 'design-mockups/Home.html'), '<html><body><button><svg/></button></body></html>');
    assert.deepEqual(uiAudit(dir).findings.map((f) => `${f.id} ${f.file}:${f.line}`), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('shared report: score and markdown', () => {
  const f = [finding({ id: 'x.a', area: 'ux', severity: 'high', title: 'A', file: 'a.tsx', line: 1 }), finding({ id: 'x.a', area: 'ux', severity: 'high', title: 'A', file: 'b.tsx', line: 2 }), finding({ id: 'x.b', area: 'ux', severity: 'low', title: 'B' })];
  assert.equal(scoreArea(f), 100 - (12 + 1) - 2);
  const md = toMarkdown({ title: 'T', root: '/p', areas: [{ area: 'UX', score: 80, findings: f, notChecked: ['runtime'] }] });
  assert.match(md, /### \[high\] A \(2\)/);
  assert.match(md, /`a\.tsx:1`/);
  assert.match(md, /Not covered by static checks:\*\* runtime/);
});

test('to-component: Vue and Svelte targets keep per-instance ids and working CSS', () => {
  const svg = renderTemplate(fs.readFileSync(path.join(TEMPLATE_DIR, 'loader.svg'), 'utf8'), null, { name: 'loader', id: 'ab12cd' }).svg;
  const vue = svgToVue(svg);
  assert.match(vue, /<script setup lang="ts">/);
  assert.match(vue, /:id="`smk-shine-\$\{idSuffix\}`"/);
  assert.match(vue, /:clip-path="`url\(#smk-skeleton-\$\{idSuffix\}\)`"/);
  assert.match(vue, /<style>\n\.smk-loader-ab12cd/);
  assert.ok(!/<style>[\s\S]*<\/style>[\s\S]*<\/template>/.test(vue.split('<template>')[1].split('</template>')[0] + '</template>'), 'no <style> inside the template');
  const sv = svgToSvelte(svg);
  assert.match(sv, /export let idSuffix = "ab12cd";/);
  assert.match(sv, /clip-path="url\(#smk-skeleton-\{idSuffix\}\)"/);
  assert.match(sv, /:global\(\.smk-loader-ab12cd \.arc\)/);
  assert.match(sv, /@keyframes -global-smk-loader-spin/);
  assert.equal(globalizeCss('@media (x) { .a .b, .c { x: 1 } }'), '@media (x) { :global(.a .b), :global(.c) { x: 1 } }');
});
