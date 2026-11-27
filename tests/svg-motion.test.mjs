import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractTheme } from '../plugins/svg-motion-kit/skills/theme-extract/scripts/extract-tokens.mjs';
import { renderTemplate, listTemplates, TEMPLATE_DIR } from '../plugins/svg-motion-kit/skills/svg-motion/scripts/render-template.mjs';
import { validateSvg } from '../plugins/svg-motion-kit/skills/svg-motion/scripts/validate-svg.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scripts = path.join(repo, 'plugins/svg-motion-kit/skills/svg-motion/scripts');
const tpl = (name) => fs.readFileSync(path.join(TEMPLATE_DIR, `${name}.svg`), 'utf8');
const themeOf = (ex) => extractTheme(path.join(repo, 'examples', ex));

const GOOD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" class="smk-x-ab12cd" role="img" aria-labelledby="t-ab12cd">
<title id="t-ab12cd">ok</title>
<style>.smk-x-ab12cd { --c: var(--primary, #123456); } .smk-x-ab12cd .a { fill: var(--c); animation: smk-x-spin 1s infinite; }
@keyframes smk-x-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .smk-x-ab12cd * { animation: none !important; } }</style>
<circle class="a" cx="5" cy="5" r="4"/></svg>`;
const rules = (svg, opts) => validateSvg(svg, opts).errors.map((e) => e.rule);

// ---------------------------------------------------------------- validate-svg

test('validate: a well-formed, themed, accessible SVG passes', () => {
  assert.deepEqual(validateSvg(GOOD).errors, []);
});

test('validate: rejects unsafe content', () => {
  assert.ok(rules(GOOD.replace('<circle', '<script>alert(1)</script><circle')).includes('safety'));
  assert.ok(rules(GOOD.replace('<circle', '<circle onclick="x()"')).includes('safety'));
  assert.ok(rules(GOOD.replace('<circle', '<image href="https://evil.example/x.png"/><circle')).includes('safety'));
  assert.ok(rules(GOOD.replace('<circle', '<foreignObject/><circle')).includes('safety'));
});

test('validate: rejects hardcoded colours in inline mode, allows them as palette in standalone', () => {
  const hard = GOOD.replace('fill: var(--c)', 'fill: #ff0000');
  assert.ok(rules(hard).includes('colour'));
  assert.ok(rules(GOOD.replace('<circle class="a"', '<circle fill="rgb(1,2,3)" class="a"')).includes('colour'));
  const palette = GOOD.replace('var(--primary, #123456)', '#123456');
  assert.ok(!rules(palette, { mode: 'standalone' }).includes('colour'));
  assert.ok(validateSvg(palette).warnings.some((w) => w.rule === 'colour'), 'inline: literal palette is only a warning');
  assert.ok(!rules(GOOD.replace('var(--primary, #123456)', 'hsl(var(--primary))')).includes('colour'), 'hsl(var(--x)) is a theme reference');
});

test('validate: motion needs reduced-motion and must not animate layout', () => {
  assert.ok(rules(GOOD.replace(/@media \(prefers-reduced-motion: reduce\) \{[^}]*\{[^}]*\} \}/, '')).includes('motion'));
  assert.ok(rules(GOOD.replace('transform: rotate(360deg)', 'width: 20px')).includes('motion'));
  assert.ok(validateSvg(GOOD.replace('transform: rotate(360deg)', 'fill: red')).warnings.some((w) => w.rule === 'motion'));
});

test('validate: accessibility, structure, size', () => {
  assert.ok(rules(GOOD.replace(' role="img" aria-labelledby="t-ab12cd"', '').replace(/<title[^<]*<\/title>/, '')).includes('a11y'));
  assert.deepEqual(rules(GOOD.replace(' role="img" aria-labelledby="t-ab12cd"', ' aria-hidden="true"')), []);
  assert.ok(rules(GOOD.replace(' viewBox="0 0 10 10"', '')).includes('structure'));
  assert.ok(rules(GOOD.replace('</svg>', '<g>')).includes('structure'));
  assert.ok(rules(GOOD.replace('<circle class="a"', '<g id="t-ab12cd"/><circle class="a"')).includes('structure'), 'duplicate id');
  assert.ok(rules(GOOD.replace('</svg>', `<!-- ${'x'.repeat(16 * 1024)} --></svg>`)).includes('size'));
});

test('validate: unscoped selectors and keyframes are flagged in inline mode', () => {
  const leaky = GOOD.replace('.smk-x-ab12cd .a {', '.a {').replace(/smk-x-spin/g, 'spin');
  const w = validateSvg(leaky).warnings.map((x) => x.rule);
  assert.ok(w.filter((r) => r === 'scope').length >= 2);
});

// ---------------------------------------------------------------- templates × themes

test('every template renders and validates for every example theme, in both modes', () => {
  const themes = [...['next-tailwind', 'vite-tailwind3', 'plain-html', 'no-theme'].map(themeOf), null];
  const names = listTemplates().map((t) => t.name);
  assert.ok(names.length >= 8, `expected at least 8 templates, got ${names.length}`);
  for (const theme of themes) {
    for (const name of names) {
      for (const mode of ['inline', 'standalone']) {
        const { svg } = renderTemplate(tpl(name), theme, { name, mode, id: 'ab12cd' });
        const { errors, warnings } = validateSvg(svg, { mode });
        assert.deepEqual(errors, [], `${name} / ${mode} / ${theme?.project.framework ?? 'no theme'}`);
        assert.ok(!warnings.some((w) => w.rule === 'scope'), `${name} / ${mode}: ${JSON.stringify(warnings)}`);
      }
    }
  }
});

test('render: inline mode references the project variables', () => {
  const next = renderTemplate(tpl('success'), themeOf('next-tailwind'), { name: 'success', id: 'ab12cd' });
  assert.match(next.svg, /--c-primary: var\(--primary, #7f22fe\)/);
  assert.equal(next.used['--c-primary'], 'primary');
  assert.match(next.svg, /class="smk-success-ab12cd"/);
  const vite = renderTemplate(tpl('success'), themeOf('vite-tailwind3'), { name: 'success', id: 'ab12cd' });
  assert.match(vite.svg, /--c-primary: hsl\(var\(--primary\)\)/);
  // vite-tailwind3 has no colourful accent, so accent falls back to primary
  assert.equal(vite.used['--c-accent'], 'primary');
});

test('render: standalone mode writes literal light colours plus a dark block', () => {
  const { svg } = renderTemplate(tpl('success'), themeOf('vite-tailwind3'), { name: 'success', mode: 'standalone', id: 'ab12cd' });
  assert.match(svg, /--c-primary: #2563eb/);
  assert.match(svg, /@media \(prefers-color-scheme: dark\) \{ \.smk-success-ab12cd \{[^}]*--c-primary: #3b82f6/);
  assert.match(svg, /font-family: "Inter", ui-sans-serif/, 'the project font comes first');
});

test('render: fallbacks follow the project dark-mode strategy when the theme lacks a role', () => {
  const theme = themeOf('next-tailwind');
  const { svg, used } = renderTemplate(tpl('error'), { ...theme, roles: { ...theme.roles, destructive: null } }, { name: 'error', id: 'ab12cd' });
  assert.match(used['--c-danger'], /^fallback/);
  assert.match(svg, /\.dark \.smk-error-ab12cd \{ --c-danger: #F07A63; \}/);
});

test('render: texts are escaped, --bare drops the card, theme radius is used', () => {
  const { svg } = renderTemplate(tpl('empty-state'), themeOf('plain-html'), { name: 'empty-state', id: 'ab12cd', texts: { title: 'No <orders> & "returns"' }, bare: true });
  assert.match(svg, /No &lt;orders&gt; &amp; &quot;returns&quot;/);
  assert.ok(!svg.includes('class="card"'));
  const withCard = renderTemplate(tpl('empty-state'), themeOf('plain-html'), { name: 'empty-state', id: 'ab12cd' }).svg;
  assert.match(withCard, /class="card" x="1" y="1" width="358" height="262" rx="18"/, 'plain-html radius 12px → rx 18');
});

test('render: two renders on one page never share ids or scopes', () => {
  const a = renderTemplate(tpl('loader'), null, { name: 'loader' }).svg;
  const b = renderTemplate(tpl('loader'), null, { name: 'loader' }).svg;
  const ids = (s) => [...s.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids(a).filter((id) => ids(b).includes(id)).length, 0);
});

test('render CLI: --project renders straight from a project folder', () => {
  const out = path.join(fs.mkdtempSync(path.join(repo, 'tests', '.tmp-')), 'success.svg');
  try {
    const res = spawnSync(process.execPath, [path.join(scripts, 'render-template.mjs'), 'success', '--project', path.join(repo, 'examples/plain-html'), '--out', out, '--text', 'title=Saved!'], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);
    const svg = fs.readFileSync(out, 'utf8');
    assert.match(svg, /var\(--brand, #0ea5e9\)/);
    assert.match(svg, />Saved!</);
    const check = spawnSync(process.execPath, [path.join(scripts, 'validate-svg.mjs'), out], { encoding: 'utf8' });
    assert.equal(check.status, 0, check.stdout);
  } finally { fs.rmSync(path.dirname(out), { recursive: true, force: true }); }
});

test('README example SVGs pass standalone validation', () => {
  const dir = path.join(repo, 'docs/assets');
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.svg') && f !== 'icon.svg')) {
    assert.deepEqual(validateSvg(fs.readFileSync(path.join(dir, f), 'utf8'), { mode: 'standalone' }).errors, [], f);
  }
});

// ---------------------------------------------------------------- PR 2: scout, no-text, to-component

import { scout } from '../plugins/svg-motion-kit/skills/svg-motion/scripts/scout.mjs';
import { svgToReact } from '../plugins/svg-motion-kit/skills/svg-motion/scripts/to-component.mjs';

test('scout finds the planted moments in next-tailwind, ranked', () => {
  const { spots } = scout(path.join(repo, 'examples/next-tailwind'));
  const kinds = spots.map((s) => `${s.kind}@${s.file ?? 'app'}`);
  assert.equal(spots[0].kind, 'error', 'errors rank first');
  for (const k of ['error@app/error.tsx', 'empty@app/page.tsx', 'success@app/settings/page.tsx', 'upload@app/settings/page.tsx', 'offline@app']) {
    assert.ok(kinds.includes(k), `missing ${k} in ${kinds.join(', ')}`);
  }
  const empty = spots.find((s) => s.kind === 'empty');
  assert.equal(empty.template, 'empty-state');
  assert.equal(empty.plainText, true);
  assert.ok(!kinds.some((k) => k.startsWith('success@app/error.tsx')), 'route files only report their own moment');
});

test('scout: loading in vite, hero in plain html, nothing invented for no-theme', () => {
  assert.equal(scout(path.join(repo, 'examples/vite-tailwind3')).spots[0].kind, 'loading');
  assert.equal(scout(path.join(repo, 'examples/plain-html')).spots[0].kind, 'hero');
  assert.deepEqual(scout(path.join(repo, 'examples/no-theme')).spots, []);
});

test('scout: an already illustrated spot ranks below a plain-text one', () => {
  const dir = fs.mkdtempSync(path.join(repo, 'tests', '.tmp-'));
  try {
    fs.writeFileSync(path.join(dir, 'A.tsx'), 'export const A = ({ items }) => items.length === 0 ? <p>No items yet</p> : null;\n');
    fs.writeFileSync(path.join(dir, 'B.tsx'), 'export const B = ({ items }) => items.length === 0 ? (<div><svg viewBox="0 0 1 1"/><p>No items yet</p></div>) : null;\n');
    const { spots } = scout(dir);
    const a = spots.find((s) => s.file === 'A.tsx'), b = spots.find((s) => s.file === 'B.tsx');
    assert.ok(a && b && a.score > b.score, JSON.stringify(spots));
    assert.equal(b.illustrated, true);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('render --no-text removes words and crops, and still validates', () => {
  for (const name of ['success', 'error', 'offline', 'empty-state']) {
    const { svg } = renderTemplate(tpl(name), themeOf('next-tailwind'), { name, id: 'ab12cd', noText: true });
    assert.ok(!/<text\b/.test(svg), `${name} still has text`);
    assert.ok(!/data-smk/.test(svg));
    assert.match(svg, /viewBox="0 0 360 (1|2)\d\d"/);
    assert.deepEqual(validateSvg(svg).errors, [], name);
  }
});

test('to-component produces JSX: camelCase attrs, scoped ids, title/decorative props', () => {
  const { svg } = renderTemplate(tpl('loader'), themeOf('next-tailwind'), { name: 'loader', id: 'ab12cd' });
  const tsx = svgToReact(svg, { name: 'OrdersLoader' });
  assert.match(tsx, /export function OrdersLoader\(\{ title = "Loading content", decorative = false, idSuffix = "ab12cd", className, \.\.\.props \}: OrdersLoaderProps\)/);
  assert.match(tsx, /className=\{\["smk-loader-ab12cd", className\]/);
  assert.match(tsx, /id=\{`smk-shine-\$\{idSuffix\}`\}/);
  assert.match(tsx, /clipPath=\{`url\(#smk-skeleton-\$\{idSuffix\}\)`\}/);
  assert.match(tsx, /strokeWidth|stopColor|<stop className="s-edge"/);
  assert.match(tsx, /<style>\{`[\s\S]*@keyframes smk-loader-spin[\s\S]*`\}<\/style>/);
  assert.ok(!/\sclass=|\sstroke-width=|\sclip-path=|\sxlink:href=/.test(tsx), 'no raw SVG attribute names left');
  const jsx = svgToReact(svg, { name: 'OrdersLoader', ts: false });
  assert.ok(!/OrdersLoaderProps|import type/.test(jsx));
});

test('to-component: inline style strings become objects and braces in text are escaped', () => {
  const svg = '<svg viewBox="0 0 10 10" class="smk-x-ab12cd" role="img" aria-labelledby="t-ab12cd"><title id="t-ab12cd">Hi</title><text style="animation-delay:.2s; --c-x: red">a {b}</text></svg>';
  const tsx = svgToReact(svg, { name: 'X' });
  assert.match(tsx, /style=\{\{ animationDelay: "\.2s", '--c-x': "red" \}\}/);
  assert.match(tsx, /a \{"\{"\}b\{"\}"\}/);
});

test('scout is idempotent: a spot with a generated illustration component is not suggested again', () => {
  const dir = fs.mkdtempSync(path.join(repo, 'tests', '.tmp-'));
  try {
    fs.writeFileSync(path.join(dir, 'page.tsx'), [
      'import { OrdersEmpty } from "@/components/illustrations/OrdersEmpty";',
      'export default function P({ orders }) {',
      '  return orders.length === 0 ? (',
      '    <div className="text-center">',
      '      <OrdersEmpty decorative className="mx-auto w-56" />',
      '      No orders yet',
      '    </div>',
      '  ) : null;',
      '}',
    ].join('\n'));
    const spot = scout(dir).spots.find((s) => s.kind === 'empty');
    assert.ok(!spot || spot.illustrated, JSON.stringify(spot));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('preview: page carries the project theme variables and shows light, dark and reduced motion', async () => {
  const { buildPreview, themeVariableCss } = await import('../plugins/svg-motion-kit/skills/svg-motion/scripts/preview.mjs');
  const css = fs.readFileSync(path.join(repo, 'examples/next-tailwind/app/globals.css'), 'utf8');
  const vars = themeVariableCss(css);
  assert.match(vars, /:root \{[^}]*--primary: oklch\(0\.541/);
  assert.match(vars, /\.dark \{[^}]*--primary: oklch\(0\.606/);
  assert.ok(!/@import|@theme/.test(vars));
  const theme = themeOf('next-tailwind');
  const { svg } = renderTemplate(tpl('success'), theme, { name: 'success', id: 'ab12cd' });
  const html = buildPreview(svg, theme, css);
  assert.match(html, /class="dark smk-preview-dark"/);
  assert.equal((html.match(/class="smk-success-ab12cd"/g) || []).length, 3);
  assert.match(html, /\.reduced \* \{ animation: none !important; \}/);
});
