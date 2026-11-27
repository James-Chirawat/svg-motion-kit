#!/usr/bin/env node
// scout.mjs — find the moments in a frontend where an animated illustration helps users most
//
// Usage: node scout.mjs [projectDir] [--top 8] [--json]
//
// Looks for empty, loading, error, not-found, success, upload and offline moments in the code,
// notes whether each one is already illustrated or just plain text, and ranks them by how much
// a user feels that moment. Read-only, zero dependencies, no network.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const IGNORE_DIRS = new Set(['node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.output', '.astro', 'dist', 'build', 'out', 'coverage', '.turbo', '.vercel', 'vendor', '.svg-motion', '.cache', 'storybook-static', 'env', 'venv', '__pycache__', 'public', 'static']);
const UI_EXT = new Set(['.tsx', '.jsx', '.vue', '.svelte', '.astro', '.html']);
const CODE_EXT = new Set([...UI_EXT, '.ts', '.js', '.mjs']);
const SKIP_FILE = /(\.test\.|\.spec\.|\.stories\.|\.d\.ts$|\.min\.js$|(^|\/)(tests?|__tests__|e2e|cypress|playwright)\/)/;
const MAX_BYTES = 300 * 1024;

// kind → template, base weight, why it matters
export const KINDS = {
  error:    { template: 'error',       weight: 5, why: 'Users hit a dead end; a clear, calm error with a retry keeps them' },
  empty:    { template: 'empty-state', weight: 4, why: 'First-run and no-result screens decide whether people come back' },
  loading:  { template: 'loader',      weight: 4, why: 'A skeleton makes waits feel shorter than "Loading…" text' },
  notFound: { template: 'empty-state', weight: 3, why: 'A designed 404 turns a broken link into a way back' },
  success:  { template: 'success',     weight: 3, why: 'Confirming a save or payment builds trust' },
  upload:   { template: 'upload',      weight: 3, why: 'Uploads take time; visible progress stops double submits' },
  offline:  { template: 'offline',     weight: 3, why: 'The app fetches data but never tells users when the network drops' },
  hero:     { template: 'hero',        weight: 2, why: 'A landing hero is the first impression; motion can show what the product does' },
};

const TEXT_EMPTY = /\b(no (data|results?|items?|records?|orders?|messages?|notifications?|files?|projects?|matches)|nothing (here|found|yet|to show)|empty|is empty|not found any)\b|ไม่พบ|ไม่มีข้อมูล|ยังไม่มี|ว่างเปล่า/i;
const TEXT_LOADING = /\bloading\b|กำลังโหลด|โปรดรอ|รอสักครู่/i;
const TEXT_ERROR = /something went wrong|\bfailed to\b|\berror occurred\b|\btry again\b|เกิดข้อผิดพลาด|ผิดพลาด|ลองใหม่/i;
const TEXT_SUCCESS = /\b(saved|success(fully)?|submitted|completed|thank you|order placed)\b|สำเร็จ|บันทึกแล้ว|เรียบร้อย/i;

const SIGNALS = [
  { kind: 'empty',   re: /\.length\s*===?\s*0\b|!\s*[\w.?]+\.length\b|\.length\s*<\s*1\b|\bisEmpty\b|\bnoResults?\b/ },
  { kind: 'loading', re: /\b(isLoading|isPending|isFetching|loading\s*(&&|\?)|status\s*===?\s*['"](loading|pending)['"]|<Suspense\b)/ },
  { kind: 'error',   re: /\b(isError|error\s*(&&|\?)|status\s*===?\s*['"]error['"]|<ErrorBoundary\b)/, uiOnly: true },
  { kind: 'success', re: /\b(alert\s*\(|toast\.success\s*\(|isSuccess\b|status\s*===?\s*['"]success['"])/, uiOnly: true },
  { kind: 'upload',  re: /type\s*=\s*\{?\s*["']file["']|\buseDropzone\b|new FormData\s*\(/ },
];

const NETWORK = /\b(fetch\s*\(|axios\b|useSWR\b|useQuery\b|createApi\b|\$fetch\b|ky\.)/;
const ONLINE_HANDLING = /navigator\.onLine|addEventListener\(\s*['"](online|offline)['"]|useNetworkState|useOnline\b|onlineManager/;
const ILLUSTRATED = /<svg\b|<img\b|<Image\b|Illustration|Lottie|<Player\b|\.svg['"]|<Spinner\b|<Skeleton\b|animate-spin|animate-pulse/;

function walk(root) {
  const files = [];
  const visit = (dir, depth) => {
    if (depth > 10 || files.length > 8000) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (!IGNORE_DIRS.has(e.name) && !e.name.startsWith('.')) visit(full, depth + 1); }
      else if (e.isFile() && CODE_EXT.has(path.extname(e.name))) {
        const rel = path.relative(root, full).split(path.sep).join('/');
        if (!SKIP_FILE.test(rel)) files.push(rel);
      }
    }
  };
  visit(root, 0);
  return files;
}

const isRoute = (f) => /(^|\/)(app|src\/app)\/.*\/?(page|layout|loading|error|not-found)\.(t|j)sx?$|(^|\/)(pages|routes|views|src\/pages|src\/routes)\//.test(f) || /(^|\/)index\.html$/.test(f);

export function scout(rootDir, { top = 8 } = {}) {
  const root = path.resolve(rootDir);
  const files = walk(root);
  const hits = [];
  let networkFiles = 0;
  let handlesOffline = false;

  for (const file of files) {
    let text;
    try { if (fs.statSync(path.join(root, file)).size > MAX_BYTES) continue; text = fs.readFileSync(path.join(root, file), 'utf8'); } catch { continue; }
    const lines = text.split('\n');
    const ui = UI_EXT.has(path.extname(file));
    if (NETWORK.test(text)) networkFiles++;
    if (ONLINE_HANDLING.test(text)) handlesOffline = true;
    const base = path.basename(file);

    // Route-level files are strong signals on their own.
    if (/^loading\.(t|j)sx?$/.test(base)) hits.push({ kind: 'loading', file, line: 1, snippet: 'route loading file', route: true });
    if (/^(error|global-error)\.(t|j)sx?$/.test(base)) hits.push({ kind: 'error', file, line: 1, snippet: 'route error boundary', route: true });
    if (/^(not-found\.(t|j)sx?|404\.(t|j)sx?|404\.html|404\.vue|\+error\.svelte)$/.test(base)) hits.push({ kind: 'notFound', file, line: 1, snippet: 'not-found page', route: true });
    if (ui && /<(header|section)[^>]*class(Name)?=["'][^"']*\bhero\b|function Hero\b|const Hero\b|<Hero\b/.test(text)) {
      const i = lines.findIndex((l) => /\bhero\b|Hero/.test(l));
      hits.push({ kind: 'hero', file, line: i + 1, snippet: lines[i].trim() });
    }

    lines.forEach((l, i) => {
      for (const s of SIGNALS) {
        if (s.uiOnly && !ui) continue;
        if (s.re.test(l)) hits.push({ kind: s.kind, file, line: i + 1, snippet: l.trim() });
      }
      if (!ui) return;
      // Visible copy that names the moment (JSX/HTML text or string literals).
      const copy = (l.match(/>([^<>{}]{3,})</g) || []).concat(l.match(/["'`]([^"'`]{3,80})["'`]/g) || []).join(' ');
      if (!copy) return;
      if (TEXT_EMPTY.test(copy)) hits.push({ kind: 'empty', file, line: i + 1, snippet: l.trim(), copy: true });
      if (TEXT_LOADING.test(copy)) hits.push({ kind: 'loading', file, line: i + 1, snippet: l.trim(), copy: true });
      if (TEXT_ERROR.test(copy)) hits.push({ kind: 'error', file, line: i + 1, snippet: l.trim(), copy: true });
      if (TEXT_SUCCESS.test(copy)) hits.push({ kind: 'success', file, line: i + 1, snippet: l.trim(), copy: true });
    });

    // Context for each hit in this file: already illustrated? plain text?
    for (const h of hits.filter((x) => x.file === file && x.illustrated === undefined)) {
      const from = Math.max(0, h.line - 7), to = Math.min(lines.length, h.line + 6);
      const near = lines.slice(from, to).join('\n');
      h.illustrated = ILLUSTRATED.test(near);
      h.plainText = !h.illustrated && /<(p|div|span|td|li|h\d)[^>]*>\s*[^<{]{3,}\s*<\//.test(near);
    }
  }

  if (networkFiles >= 2 && !handlesOffline) {
    hits.push({ kind: 'offline', file: null, line: null, snippet: `${networkFiles} files fetch data; no online/offline handling found`, illustrated: false, plainText: false, project: true });
  }

  // A route file that *is* a moment (error.tsx, not-found.tsx, loading.tsx) only reports that moment.
  const routeKind = new Map(hits.filter((h) => h.route).map((h) => [h.file, h.kind]));
  const kept = hits.filter((h) => !routeKind.has(h.file) || routeKind.get(h.file) === h.kind);

  // One spot per file and kind: keep the strongest line, count the rest as evidence.
  const groups = new Map();
  for (const h of kept) {
    const key = `${h.kind}|${h.file}`;
    const g = groups.get(key) || { kind: h.kind, file: h.file, lines: [], evidence: 0, copy: false, route: false, illustrated: false, plainText: false, project: !!h.project, snippet: h.snippet, line: h.line };
    if (h.copy && !g.copy) { g.line = h.line; g.snippet = h.snippet; } // prefer the line users actually read
    g.lines.push(h.line);
    g.evidence++;
    g.copy ||= !!h.copy;
    g.route ||= !!h.route || (h.file ? isRoute(h.file) : false);
    g.illustrated ||= !!h.illustrated;
    g.plainText ||= !!h.plainText;
    groups.set(key, g);
  }

  const spots = [...groups.values()].map((g) => {
    let score = KINDS[g.kind].weight;
    if (g.copy) score += 1;
    if (g.plainText) score += 1;
    if (g.route) score += 1;
    if (g.evidence >= 3) score += 0.5;
    if (g.illustrated) score -= 3;
    return {
      kind: g.kind,
      template: KINDS[g.kind].template,
      score: Math.round(score * 10) / 10,
      file: g.file,
      line: g.line,
      snippet: (g.snippet || '').slice(0, 120),
      illustrated: g.illustrated,
      plainText: g.plainText,
      why: KINDS[g.kind].why,
    };
  }).filter((s) => s.score > 1).sort((a, b) => b.score - a.score || String(a.file).localeCompare(String(b.file)));

  return { root, scanned: files.length, spots: spots.slice(0, top), more: Math.max(0, spots.length - top) };
}

function main(argv) {
  const args = argv.slice(2);
  const topIdx = args.indexOf('--top');
  const top = topIdx >= 0 ? Number(args[topIdx + 1]) : 8;
  const dir = args.find((a, i) => !a.startsWith('--') && !(topIdx >= 0 && i === topIdx + 1)) || '.';
  if (!fs.existsSync(dir)) { console.error(`Not a directory: ${dir}`); process.exit(2); }
  const res = scout(dir, { top });
  if (args.includes('--json')) { console.log(JSON.stringify(res, null, 2)); return; }
  console.log(`svg-motion scout — ${res.scanned} files scanned\n`);
  if (!res.spots.length) { console.log('No obvious empty, loading, error or success moments found.'); return; }
  res.spots.forEach((s, i) => {
    const where = s.file ? `${s.file}:${s.line}` : '(whole app)';
    const state = s.illustrated ? 'already illustrated' : s.plainText ? 'plain text today' : '';
    console.log(`${String(i + 1).padStart(2)}. [${s.score}] ${s.kind.padEnd(8)} → ${s.template.padEnd(11)} ${where}${state ? `  (${state})` : ''}`);
    console.log(`      ${s.why}`);
    if (s.snippet) console.log(`      ${s.snippet}`);
  });
  if (res.more) console.log(`\n…and ${res.more} more (use --top).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main(process.argv);
