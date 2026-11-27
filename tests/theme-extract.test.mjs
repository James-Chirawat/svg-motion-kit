import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extractTheme, parseColor, parseCssVars } from '../plugins/svg-motion-kit/skills/theme-extract/scripts/extract-tokens.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const example = (name) => path.join(repo, 'examples', name);
const script = path.join(repo, 'plugins/svg-motion-kit/skills/theme-extract/scripts/extract-tokens.mjs');

test('parseColor handles hex, rgb, hsl, oklch and shadcn triplets', () => {
  assert.equal(parseColor('#fff').hex, '#ffffff');
  assert.equal(parseColor('#0EA5E9').hex, '#0ea5e9');
  assert.equal(parseColor('rgb(37, 99, 235)').hex, '#2563eb');
  assert.equal(parseColor('rgb(37 99 235 / 50%)').alpha, 0.5);
  assert.equal(parseColor('hsl(221.2 83.2% 53.3%)').hex, '#2563eb');
  assert.equal(parseColor('221.2 83.2% 53.3%').hex, '#2563eb'); // bare HSL triplet
  assert.equal(parseColor('oklch(1 0 0)').hex, '#ffffff');
  assert.equal(parseColor('oklch(0.145 0 0)').hex, '#0a0a0a'); // Tailwind neutral-950
  assert.equal(parseColor('oklch(0.541 0.281 293.009)').hex, '#7f22fe'); // Tailwind violet-600
  assert.equal(parseColor('oklch(1 0 0 / 10%)').hex, '#ffffff1a');
  assert.equal(parseColor('white').hex, '#ffffff');
  assert.equal(parseColor('var(--x)'), null);
  assert.equal(parseColor('linear-gradient(red, blue)'), null);
});

test('parseCssVars keeps selector context and ignores comments and strings', () => {
  const vars = parseCssVars(`
    /* --nope: 1; */
    :root { --a: #fff; --b: "x;y" }
    @media (prefers-color-scheme: dark) { :root { --a: #000; } }
    .card { --c: red; }
  `);
  assert.deepEqual(vars.map((v) => v.name), ['--a', '--b', '--a', '--c']);
  assert.equal(vars[1].value, '"x;y"');
  assert.deepEqual(vars[2].context, ['@media (prefers-color-scheme: dark)', ':root']);
});

test('next-tailwind: Tailwind v4 + shadcn oklch tokens', () => {
  const t = extractTheme(example('next-tailwind'));
  assert.equal(t.confidence, 'high');
  assert.equal(t.project.framework, 'next');
  assert.equal(t.project.ui, 'react');
  assert.equal(t.project.tailwind.version, 4);
  assert.equal(t.project.typescript, true);
  assert.deepEqual(t.project.motionLibs, ['motion']);
  assert.equal(t.project.componentDir, 'components');
  assert.deepEqual(t.darkMode, { strategy: 'class', selector: '.dark' });

  assert.equal(t.roles.primary.var, '--primary');
  assert.equal(t.roles.primary.css, 'var(--primary, #7f22fe)');
  assert.equal(t.roles.primary.utility, 'primary');
  assert.ok(t.roles.primary.dark, 'primary has a dark value');
  // shadcn --accent is a neutral hover colour, so a vivid chart colour is chosen instead
  assert.equal(t.roles.accent.var, '--chart-2');
  assert.ok(t.roles.accent.vivid >= 0.25);
  assert.ok(t.palette.every((c) => !c.var.startsWith('--color-')), 'palette uses runtime variables');

  assert.equal(t.radius.base, 10);
  assert.ok(t.fonts.families.includes('Geist'));
  assert.equal(t.fonts.tokens.sans.css, 'var(--font-geist-sans)');
});

test('vite-tailwind3: shadcn HSL triplets need hsl(var(--x))', () => {
  const t = extractTheme(example('vite-tailwind3'));
  assert.equal(t.project.ui, 'react');
  assert.equal(t.project.tailwind.version, 3);
  assert.equal(t.project.tailwind.config, 'tailwind.config.js');
  assert.deepEqual(t.project.motionLibs, ['framer-motion']);
  assert.equal(t.project.componentDir, 'src/components');
  assert.equal(t.darkMode.strategy, 'class');

  assert.equal(t.roles.primary.css, 'hsl(var(--primary))');
  assert.equal(t.roles.primary.light, '#2563eb');
  assert.equal(t.roles.primary.utility, 'primary');
  assert.equal(t.roles.accent, null);
  assert.ok(t.warnings.some((w) => w.includes('accent')));
  assert.equal(t.radius.base, 8);
  assert.ok(t.fonts.families.includes('Inter'));
});

test('plain-html: custom names and media-query dark mode', () => {
  const t = extractTheme(example('plain-html'));
  assert.equal(t.project.framework, 'html');
  assert.equal(t.project.tailwind, null);
  assert.deepEqual(t.darkMode, { strategy: 'media', selector: '@media (prefers-color-scheme: dark)' });
  assert.equal(t.roles.primary.var, '--brand');
  assert.equal(t.roles.primary.light, '#0ea5e9');
  assert.equal(t.roles.primary.dark, '#38bdf8');
  assert.equal(t.roles.background.var, '--surface');
  assert.equal(t.roles.foreground.var, '--ink');
  assert.equal(t.roles.border.var, '--line');
  assert.equal(t.roles.accent.var, '--accent');
  assert.ok(!JSON.stringify(t).includes('--tag-bg'), 'component-scoped variables are ignored');
  assert.ok(t.fonts.families.includes('Poppins'));
});

test('no-theme: low confidence and actionable warnings', () => {
  const t = extractTheme(example('no-theme'));
  assert.equal(t.confidence, 'low');
  assert.equal(t.roles.primary, null);
  assert.equal(t.darkMode.strategy, 'none');
  assert.ok(t.warnings.some((w) => w.includes('Ask the user')));
});

// Regressions found by running the extractor on real projects.
function fixture(files) {
  const dir = fs.mkdtempSync(path.join(repo, 'tests', '.tmp-'));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
}

test('self-referencing @theme inline variable does not recurse forever', () => {
  const dir = fixture({
    'package.json': '{"dependencies":{"next":"16.0.0","tailwindcss":"^4"}}',
    'app/globals.css': '@import "tailwindcss";\n@theme inline { --font-sans: var(--font-sans); --color-primary: var(--primary); }\n:root { --primary: #f7b828; --background: #fff; --foreground: #111; }',
  });
  try {
    const t = extractTheme(dir);
    assert.equal(t.fonts.tokens.sans.css, 'var(--font-sans)');
    assert.equal(t.roles.primary.css, 'var(--primary, #f7b828)');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('brand-style names are guessed as primary and flagged', () => {
  const dir = fixture({
    'styles.css': ':root { --background: #f6f9fd; --foreground: #0f2544; --brand-blue: #3068a8; --brand-blue-soft: #e5eef8; --gold: #d4a853; }',
  });
  try {
    const t = extractTheme(dir);
    assert.equal(t.roles.primary.var, '--brand-blue');
    assert.equal(t.roles.primary.guessed, true);
    assert.equal(t.confidence, 'medium');
    assert.ok(t.warnings.some((w) => w.includes('guessed from --brand-blue')));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('accent is never guessed from status or unrelated colours; pale tints are not vivid', () => {
  const dir = fixture({
    'styles.css': ':root { --primary: #2b6faa; --accent: #e7f1f9; --destructive: #dc2626; --success: #008f3d; --pay-mastercard: #eb001b; }',
  });
  try {
    const t = extractTheme(dir);
    assert.equal(t.roles.accent, null);
    assert.ok(t.palette.every((c) => !['--destructive', '--success'].includes(c.var)));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('package.json in a sub-folder is found (monorepo / nested app)', () => {
  const dir = fixture({
    'README.md': '# repo',
    'web/package.json': '{"dependencies":{"next":"16.0.0","react":"19.0.0"}}',
    'web/src/app/globals.css': ':root { --primary: #0b6b53; --background: #fff; --foreground: #111; }',
    'web/src/components/.keep': '',
    'scripts/env/package.json': '{"name":"not-the-app"}',
  });
  try {
    const t = extractTheme(dir);
    assert.equal(t.project.root, 'web');
    assert.equal(t.project.framework, 'next');
    assert.equal(t.project.componentDir, 'web/src/components');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('CLI --dry-run --json prints JSON and writes nothing', () => {
  const dir = example('plain-html');
  const res = spawnSync(process.execPath, [script, dir, '--dry-run', '--json'], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  assert.equal(JSON.parse(res.stdout).roles.primary.var, '--brand');
  assert.equal(fs.existsSync(path.join(dir, '.svg-motion')), false);
});

test('CLI --out writes the theme file where asked', () => {
  const out = path.join(fs.mkdtempSync(path.join(repo, 'tests', '.tmp-')), 'theme.json');
  try {
    const res = spawnSync(process.execPath, [script, example('next-tailwind'), '--out', out], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);
    assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).schemaVersion, 1);
  } finally {
    fs.rmSync(path.dirname(out), { recursive: true, force: true });
  }
});

test('CLI rejects a missing directory', () => {
  const res = spawnSync(process.execPath, [script, path.join(repo, 'does-not-exist'), '--dry-run'], { encoding: 'utf8' });
  assert.equal(res.status, 2);
});
