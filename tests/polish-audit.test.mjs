import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { polishAudit } from '../plugins/svg-motion-kit/skills/polish-audit/scripts/polish-audit.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('rough-edges: every planted issue is found, including Thai hardcoded text', () => {
  const a = polishAudit(path.join(repo, 'examples/rough-edges'));
  const ids = new Set(a.findings.map((f) => f.id));
  for (const id of ['polish.meta.missing', 'polish.i18n.hardcoded-text', 'polish.i18n.default-locale', 'polish.tokens.hardcoded-color', 'polish.tokens.arbitrary-spacing', 'polish.ui.raw-buttons',
    'polish.headings.multiple-h1', 'polish.headings.skip', 'polish.code.any', 'polish.code.suppressions', 'polish.code.console', 'polish.code.no-lint',
    'polish.meta.og-image', 'polish.meta.favicon', 'polish.meta.page-titles', 'polish.pages.not-found', 'polish.pages.error', 'polish.seo.robots', 'polish.seo.sitemap']) {
    assert.ok(ids.has(id), `missing ${id}`);
  }
  const thai = a.findings.filter((f) => f.id === 'polish.i18n.hardcoded-text').map((f) => f.evidence);
  assert.ok(thai.includes('คลินิกของเรา') && thai.includes('จองคิว'), thai.join(' | '));
});

test('a well-set-up Next app (metadata in [locale] layout, icons, edge pages, SEO, lint) is clean', () => {
  const dir = fs.mkdtempSync(path.join(repo, 'tests', '.tmp-'));
  try {
    const w = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text); };
    w('package.json', '{"dependencies":{"next":"15.0.0","react":"19.0.0"}}');
    w('eslint.config.mjs', 'export default [];');
    w('src/app/[locale]/layout.tsx', 'export const metadata = { title: { default: "Site", template: "%s · Site" }, description: "Clinic booking", openGraph: { images: ["/og.png"] } };\nexport default function L({ children }) { return <html lang="th"><body>{children}</body></html>; }\n');
    w('src/app/[locale]/page.tsx', 'export default function P() { return <main><h1>Home</h1><h2>Sub</h2></main>; }\n');
    w('src/app/icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
    w('src/app/not-found.tsx', 'export default function N() { return <p>Not found</p>; }\n');
    w('src/app/error.tsx', '"use client";\nexport default function E() { return <p>Error</p>; }\n');
    w('src/app/robots.ts', 'export default function r() { return {}; }\n');
    w('src/app/sitemap.ts', 'export default function s() { return []; }\n');
    w('scripts/og/og-image.html', '<html><body>og template</body></html>');
    w('src/lib/date.ts', 'export const fmt = (d: Date) => d.toLocaleDateString("th-TH", { dateStyle: "medium" });\n');
    assert.deepEqual(polishAudit(dir).findings.map((f) => `${f.id} ${f.file}`), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
