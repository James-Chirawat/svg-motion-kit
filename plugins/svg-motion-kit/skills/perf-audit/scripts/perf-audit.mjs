#!/usr/bin/env node
// perf-audit.mjs — frontend performance problems you can see in the code
//
// Usage: node perf-audit.mjs [projectDir] [--json] [--write]
//
// Images (format, weight, next/image, dimensions, LCP priority, lazy loading), fonts (next/font,
// font-display, Thai weights and subsets, family count), data fetching (waterfalls, N+1 loops,
// effect fetching without cache or abort), caching (everything forced dynamic), bundle (heavy
// dependencies, static imports of charts/maps/editors, "use client" layouts), rendering (index
// keys), third-party scripts, SVG and motion weight.
// Static only: it says what needs a real measurement (Lighthouse) instead of guessing.
// Read-only, zero dependencies, no network.

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { walkFiles, readText, fileSize, finding, scoreArea, runCli, projectPackage, UI_EXT, STYLE_EXT } from '../../../shared/audit-core.mjs';

const RASTER = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff']);
const IMAGE = new Set([...RASTER, '.webp', '.avif', '.svg']);
const THAI_FONTS = /\b(Sarabun|Prompt|Kanit|Noto[ _+]Sans[ _+]Thai|Noto[ _+]Serif[ _+]Thai|IBM[ _+]Plex[ _+]Sans[ _+]Thai(?:[ _+]Looped)?|Mitr|Bai[ _+]Jamjuree|Chakra[ _+]Petch|Anuphan|Taviraj|Pridi|Itim|Mali|Niramit|K2D|Krub|Athiti|Chonburi|Trirong|Pattaya|Charm|Fahkwang|Kodchasan|KoHo|Sriracha|Thasadith|Srisakdi|Charmonman|Chakra)\b/;
const HEAVY_CLIENT = ['chart.js', 'react-chartjs-2', 'recharts', 'echarts', 'echarts-for-react', 'apexcharts', 'react-apexcharts', 'mapbox-gl', 'maplibre-gl', 'leaflet', 'react-leaflet', 'three', '@react-three/fiber', 'monaco-editor', '@monaco-editor/react', 'pdfjs-dist', 'react-pdf', 'xlsx', 'quill', 'react-quill', '@tiptap/react', 'lottie-web', 'lottie-react', 'plotly.js', 'react-plotly.js', 'highcharts'];
const KB = 1024;
const kb = (n) => `${Math.round(n / KB)} KB`;

export function perfAudit(rootDir) {
  const root = path.resolve(rootDir);
  const { deps } = projectPackage(root);
  const isNext = !!deps.next;
  const usesDataLib = !!(deps.swr || deps['@tanstack/react-query'] || deps['react-query'] || deps['@apollo/client'] || deps.urql);
  const findings = [];
  const add = (o) => findings.push(finding({ area: 'performance', ...o }));

  // ---------------------------------------------------------------- images on disk
  const imageFiles = walkFiles(root, { include: (rel, ext) => IMAGE.has(ext), skip: /(^|\/)(tests?|__tests__|fixtures|design-mockups|mockups?)\/|\.min\./ });
  for (const f of imageFiles) {
    const ext = path.extname(f).toLowerCase();
    const size = fileSize(root, f);
    if (/(^|\/)(favicon|apple-touch-icon|icon|og|opengraph-image|twitter-image)[^/]*$/.test(f)) continue;
    if (RASTER.has(ext) && size > 100 * KB) {
      add({ id: 'perf.image.format', severity: size > 500 * KB ? 'high' : size > 200 * KB ? 'medium' : 'low', effort: 'S', title: 'PNG/JPEG/GIF that should be AVIF or WebP', file: f, evidence: `${ext.slice(1).toUpperCase()} ${kb(size)}`, why: 'AVIF/WebP are typically 30–70% smaller at the same quality; heavy images are the most common cause of slow Largest Contentful Paint.', fix: ext === '.gif' ? 'Replace animated GIFs with <video autoplay muted loop playsinline> (MP4/WebM) or a CSS/SVG animation.' : 'Convert to AVIF/WebP (e.g. `npx @squoosh/cli` or sharp), keep the original as fallback only if old browsers matter; in Next, next/image does this automatically.', autofix: false });
    } else if (!RASTER.has(ext) && ext !== '.svg' && size > 400 * KB) {
      add({ id: 'perf.image.weight', severity: 'medium', effort: 'S', title: 'Very large image file', file: f, evidence: `${ext.slice(1).toUpperCase()} ${kb(size)}`, why: 'Even modern formats need sensible dimensions; this is likely larger than any screen it is shown on.', fix: 'Resize to the largest displayed width (×2 for retina) and re-encode.' });
    } else if (ext === '.svg' && size > 50 * KB) {
      add({ id: 'perf.svg.weight', severity: 'low', effort: 'S', title: 'Heavy SVG file', file: f, evidence: kb(size), why: 'Exported SVGs often carry editor metadata and excessive precision.', fix: 'Run svgo (`npx svgo file.svg`), or simplify paths; for photos use a raster format instead.' });
    }
  }

  // ---------------------------------------------------------------- code
  const files = walkFiles(root, { include: (rel, ext) => UI_EXT.has(ext) || STYLE_EXT.has(ext) || ['.ts', '.js', '.mjs'].includes(ext) });
  let dynamicMarkers = 0, dynamicFile = null, fontFamilies = new Set();

  for (const file of files) {
    const text = readText(root, file);
    if (text == null) continue;
    const ext = path.extname(file);
    const lines = text.split('\n');
    const isUi = UI_EXT.has(ext);
    const isClient = /^\s*['"]use client['"]/m.test(text);

    // ---- "use client" on layouts
    if (isNext && /(^|\/)app\/(.*\/)?layout\.(t|j)sx?$/.test(file) && isClient) {
      add({ id: 'perf.bundle.client-layout', severity: 'high', effort: 'M', title: '"use client" on a layout', file, line: lines.findIndex((l) => /use client/.test(l)) + 1, evidence: lines.find((l) => /use client/.test(l)), why: 'Every page under this layout becomes client-rendered and ships its JavaScript, losing Server Component streaming and caching.', fix: 'Keep the layout a Server Component; move interactive parts (providers, menus) into small client components rendered inside it.' });
    }

    // ---- fonts
    for (const m of text.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'\s)>]+)/g)) {
      const line = lines.findIndex((l) => l.includes(m[0])) + 1;
      const fams = [...m[1].matchAll(/family=([^:&]+)(?::[^&]*?wght@([\d;.,]+))?/g)];
      for (const f of fams) {
        const fam = decodeURIComponent(f[1]).replace(/\+/g, ' ');
        fontFamilies.add(fam);
        const weights = f[2] ? f[2].split(/[;,]/).filter(Boolean).length : 1;
        if (THAI_FONTS.test(fam) && weights > 3) add({ id: 'perf.font.thai-weights', severity: 'medium', effort: 'S', title: 'Thai font loaded in many weights', file, line, evidence: `${fam}: ${weights} weights`, why: 'Thai fonts are large (often 100–300 KB per weight); every extra weight delays text.', fix: 'Load only the 2–3 weights you use (e.g. 400;600).' });
      }
      if (isNext) add({ id: 'perf.font.next-font', severity: 'medium', effort: 'S', title: 'Google Fonts loaded from the CDN instead of next/font', file, line, evidence: m[0].slice(0, 100), why: 'A third-party CSS request blocks rendering and causes layout shift when the font swaps in.', fix: 'Use next/font/google: it self-hosts, subsets, preloads and sets size-adjust to avoid shifts.' });
      else if (!/display=(swap|optional|fallback)/.test(m[1])) add({ id: 'perf.font.display', severity: 'low', effort: 'S', title: 'Google Fonts URL without display=swap', file, line, evidence: m[0].slice(0, 100), why: 'Text stays invisible until the font loads (FOIT).', fix: 'Append &display=swap to the URL.' });
    }
    for (const m of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']next\/font\/google["']/g)) {
      for (const name of m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
        const fam = name.replace(/_/g, ' ');
        fontFamilies.add(fam);
        const call = text.match(new RegExp(`\\b${name}\\s*\\(\\s*\\{([\\s\\S]*?)\\}\\s*\\)`));
        if (!call) continue;
        const line = lineAtIndex(text, call.index);
        const weights = (call[1].match(/weight\s*:\s*\[([^\]]*)\]/) || [])[1];
        const nWeights = weights ? weights.split(',').filter((w) => w.trim()).length : 0;
        if (THAI_FONTS.test(fam) && nWeights > 3) add({ id: 'perf.font.thai-weights', severity: 'medium', effort: 'S', title: 'Thai font loaded in many weights', file, line, evidence: `${fam}: ${nWeights} weights`, why: 'Thai fonts are large; every extra weight delays text.', fix: 'Keep only the weights you use (usually 2–3).' });
        if (THAI_FONTS.test(fam) && !/subsets\s*:\s*\[[^\]]*['"]thai['"]/.test(call[1])) add({ id: 'perf.font.thai-subset', severity: 'medium', effort: 'S', title: 'Thai font without the "thai" subset', file, line, evidence: `${fam}(${call[1].replace(/\s+/g, ' ').trim().slice(0, 80)})`, why: 'Without the thai subset, Thai text falls back to a system font or is fetched late, so the page re-flows.', fix: 'Add subsets: ["thai", "latin"].' });
      }
    }
    if (STYLE_EXT.has(ext)) {
      for (const m of text.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
        if (!/font-display\s*:/.test(m[1])) add({ id: 'perf.font.display', severity: 'low', effort: 'S', title: '@font-face without font-display', file, line: lineAtIndex(text, m.index), evidence: m[0].slice(0, 100), why: 'Text may stay invisible until the font downloads.', fix: 'Add font-display: swap (or optional for non-critical fonts).' });
      }
      // layout-triggering animation in CSS
      for (const kf of keyframeBlocks(text)) {
        const props = [...kf.body.matchAll(/(?:^|[;{\s])(width|height|top|left|right|bottom|margin[\w-]*|padding[\w-]*)\s*:/g)].map((x) => x[1]);
        if (props.length) add({ id: 'perf.motion.layout', severity: 'medium', effort: 'S', title: 'Animation of layout properties', file, line: lineAtIndex(text, kf.index), evidence: `@keyframes ${kf.name} animates ${[...new Set(props)].join(', ')}`, why: 'Animating size/position forces layout on every frame and janks on mid-range phones.', fix: 'Animate transform (translate/scale) and opacity instead.' });
      }
    }
    if (!isUi && !/\.(ts|js|mjs)$/.test(file)) continue;

    // ---- caching markers (Next)
    if (isNext) {
      const marks = (text.match(/cache\s*:\s*['"]no-store['"]|export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]|export\s+const\s+revalidate\s*=\s*0\b/g) || []).length;
      if (marks) { dynamicMarkers += marks; dynamicFile ||= file; }
    }

    // ---- imports: heavy deps
    for (const m of text.matchAll(/^\s*import\s+(?:[\w*{}\s,]+\s+from\s+)?["']([^"']+)["']/gm)) {
      const mod = m[1];
      const line = lineAtIndex(text, m.index);
      if (mod === 'moment' || mod.startsWith('moment/')) add({ id: 'perf.bundle.moment', severity: 'medium', effort: 'M', title: 'moment.js in the bundle', file, line, evidence: m[0].trim(), why: 'moment is ~70 KB+ gzipped with locales and is in maintenance mode.', fix: 'Use Intl.DateTimeFormat, date-fns or dayjs.' });
      if (mod === 'lodash') add({ id: 'perf.bundle.lodash', severity: 'medium', effort: 'S', title: 'Whole lodash imported', file, line, evidence: m[0].trim(), why: 'Importing from "lodash" pulls the entire library (~70 KB) into client bundles.', fix: 'Import per function (lodash/debounce), use lodash-es, or native methods.' });
      if (mod === '@mui/icons-material' && /\{/.test(m[0])) add({ id: 'perf.bundle.barrel-icons', severity: 'medium', effort: 'S', title: 'Barrel import from @mui/icons-material', file, line, evidence: m[0].trim(), why: 'Barrel imports can slow builds and dev servers dramatically and may bloat bundles.', fix: 'Import icons by path: import Close from "@mui/icons-material/Close".' });
      const heavy = HEAVY_CLIENT.find((h) => mod === h || mod.startsWith(`${h}/`));
      if (heavy && isUi && (isClient || !isNext) && !/next\/dynamic|React\.lazy|lazy\(\s*\(\)\s*=>\s*import/.test(text)) {
        add({ id: 'perf.bundle.dynamic-import', severity: 'medium', effort: 'S', title: 'Heavy library imported up front', file, line, evidence: m[0].trim(), why: `${heavy} is large and usually only needed on part of a page; importing it statically delays interactivity for everyone.`, fix: isNext ? 'Load the component with next/dynamic (ssr: false if it needs the browser).' : 'Lazy-load it with React.lazy/import() when it is about to be shown.' });
      }
    }
    if (/\bfrom\s+["']jquery["']|\$\(document\)\.ready/.test(text) && (deps.react || deps.vue || deps.svelte)) {
      add({ id: 'perf.bundle.jquery', severity: 'medium', effort: 'M', title: 'jQuery alongside a component framework', file, line: lines.findIndex((l) => /jquery|\$\(document\)/.test(l)) + 1, evidence: lines.find((l) => /jquery|\$\(document\)/.test(l)), why: 'Two DOM libraries ship and fight over the same nodes.', fix: 'Replace jQuery calls with framework state/refs or native DOM APIs.' });
    }

    lines.forEach((l, i) => {
      const n = i + 1;
      // waterfall: two awaits of independent requests back to back
      const a = l.match(/const\s+(\w+|\{[^}]+\})\s*=\s*await\s+(fetch|get\w*|load\w*|db\.|prisma\.|supabase|axios|api\.)/);
      if (a) {
        for (let j = i + 1; j <= Math.min(lines.length - 1, i + 3); j++) {
          const b = lines[j].match(/const\s+(\w+|\{[^}]+\})\s*=\s*await\s+(fetch|get\w*|load\w*|db\.|prisma\.|supabase|axios|api\.)/);
          if (b) {
            const firstVars = a[1].replace(/[{}\s]/g, '').split(',').map((v) => v.split(':').pop()).filter(Boolean);
            // the whole second statement (arguments often continue on the next lines)
            let end = j;
            while (end < Math.min(lines.length - 1, j + 25) && !/;\s*$|^\s*\)\s*;?\s*$/.test(lines[end])) end++;
            const stmt = lines.slice(j, end + 1).join('\n').split('=').slice(1).join('=');
            // a guard on the first result in between (if (!user) return / throw) makes the order deliberate
            const between = lines.slice(i + 1, j).join('\n');
            const guarded = firstVars.some((v) => new RegExp(`\\b${v}\\b`).test(between) && /\b(return|throw|redirect|notFound)\b/.test(between));
            if (!guarded && !firstVars.some((v) => new RegExp(`\\b${v}\\b`).test(stmt))) {
              add({ id: 'perf.fetch.waterfall', severity: 'medium', effort: 'S', title: 'Independent requests awaited one after another', file, line: n, evidence: `${l.trim()} … ${lines[j].trim()}`.slice(0, 170), why: 'Each await waits for the previous request; two 300 ms calls take 600 ms instead of 300 ms.', fix: 'Start them together: const [a, b] = await Promise.all([getA(), getB()]).', autofix: true, playbook: 'promise-all' });
            }
            break;
          }
        }
      }
      // N+1: await inside loops
      if (/for\s*\(\s*(const|let)\s+\w+\s+of\b/.test(l)) {
        const body = lines.slice(i + 1, i + 8).join('\n');
        if (/await\s+(fetch|db\.|prisma\.|get\w*\(|axios|api\.)/.test(body)) add({ id: 'perf.fetch.loop', severity: 'medium', effort: 'M', title: 'Request inside a loop (N+1)', file, line: n, evidence: l, why: 'One request per item multiplies latency and server load as lists grow.', fix: 'Fetch in one batched request (an "in" query / bulk endpoint), or at least run them with Promise.all.' });
      }
      if (/\.forEach\s*\(\s*async\b/.test(l)) add({ id: 'perf.fetch.foreach-async', severity: 'medium', effort: 'S', title: 'async callback in forEach', file, line: n, evidence: l, why: 'forEach does not wait: requests fire unbounded and errors are lost.', fix: 'Use for…of with await, or Promise.all(items.map(async …)).' });
      // effect fetching
      if (/useEffect\s*\(/.test(l)) {
        const body = lines.slice(i, i + 12).join('\n');
        if (/\bfetch\s*\(|axios\./.test(body)) {
          if (!usesDataLib) add({ id: 'perf.fetch.effect', severity: 'low', effort: 'M', title: 'Data fetched in useEffect without a cache', file, line: n, evidence: lines.slice(i, i + 3).join(' ').trim(), why: 'Every mount refetches, requests are not deduplicated, and nothing renders until JavaScript loads.', fix: isNext ? 'Fetch in a Server Component, or use SWR / TanStack Query on the client.' : 'Use SWR or TanStack Query (caching, dedup, retries).' });
          if (!/AbortController|signal|ignore\s*=\s*true|let\s+(cancelled|canceled|active|mounted)\b/.test(body)) add({ id: 'perf.fetch.no-abort', severity: 'low', effort: 'S', title: 'Effect fetch without cancellation', file, line: n, evidence: lines[i].trim(), why: 'Fast navigation leaves stale requests running and can set state from an old response.', fix: 'Pass an AbortController signal and abort it in the effect cleanup.' });
        }
      }
      // index keys
      if (/\.map\s*\(\s*\(\s*\w+\s*,\s*(\w+)\s*\)\s*=>/.test(l)) {
        const idx = l.match(/\.map\s*\(\s*\(\s*\w+\s*,\s*(\w+)\s*\)/)[1];
        const chunk = lines.slice(i, i + 4).join(' ');
        const staticList = /\]\s*\.map\s*\(|Array\.from\s*\(|Array\(\s*\d+\s*\)|\.fill\s*\(|\bskeleton/i.test(l) || /(^|\/)loading\.(t|j)sx?$/.test(file);
        if (!staticList && new RegExp(`key=\\{\\s*${idx}\\s*\\}`).test(chunk)) add({ id: 'perf.render.index-key', severity: 'low', effort: 'S', title: 'Array index used as React key', file, line: n, evidence: chunk.trim().slice(0, 140), why: 'Reordering or inserting items re-renders and can mix up component state.', fix: 'Use a stable id from the data as the key.' });
      }
      // images in markup
      if (isUi && /<img\b/.test(l)) {
        const tag = lines.slice(i, i + 6).join(' ').match(/<img\b[\s\S]*?\/?>/)?.[0] || l;
        const svg = /\.svg["'`]|data:image/.test(tag);
        if (isNext && !svg && !/eslint-disable[^\n]*no-img-element/.test(lines.slice(Math.max(0, i - 2), i + 1).join(' '))) add({ id: 'perf.image.next-img', severity: 'medium', effort: 'S', title: '<img> instead of next/image', file, line: n, evidence: tag.slice(0, 140), why: 'next/image serves AVIF/WebP at the right size per device and lazy-loads by default.', fix: 'Use <Image src width height alt /> from next/image (or fill + sizes for responsive boxes).', autofix: true, playbook: 'next-image' });
        if (!svg && !(/\bwidth\s*=/.test(tag) && /\bheight\s*=/.test(tag)) && !/aspect-|\b(w|h|size)-\d|object-|style=\{\{[^}]*(width|height)/.test(tag)) add({ id: 'perf.image.dimensions', severity: 'medium', effort: 'S', title: 'Image without width/height', file, line: n, evidence: tag.slice(0, 140), why: 'The browser cannot reserve space, so content jumps when the image loads (Cumulative Layout Shift).', fix: 'Set width and height attributes (or an aspect-ratio box).' });
        if (!isNext && /\.map\s*\(|v-for|\{#each/.test(lines.slice(Math.max(0, i - 4), i + 1).join(' ')) && !/loading\s*=\s*["']lazy/.test(tag)) add({ id: 'perf.image.lazy', severity: 'low', effort: 'S', title: 'List images load eagerly', file, line: n, evidence: tag.slice(0, 140), why: 'Off-screen images compete with what users see first.', fix: 'Add loading="lazy" (and decoding="async") to images below the fold.' });
      }
      // third-party scripts
      if (isUi && /<script\b[^>]*\bsrc\s*=\s*["']https?:\/\//.test(l)) {
        if (isNext) add({ id: 'perf.third-party.script', severity: 'medium', effort: 'S', title: 'Third-party <script> outside next/script', file, line: n, evidence: l, why: 'It loads with no strategy and can block rendering or hydration.', fix: 'Use <Script src strategy="afterInteractive" | "lazyOnload" /> from next/script.' });
        else if (!/\b(async|defer)\b|type\s*=\s*["']module["']/.test(l)) add({ id: 'perf.third-party.script', severity: 'medium', effort: 'S', title: 'Render-blocking third-party script', file, line: n, evidence: l, why: 'The browser stops parsing the page until it downloads and runs.', fix: 'Add defer (or async for independent widgets), or load it after interaction.' });
      }
    });

    // LCP: the first next/image on a page/hero without priority
    if (isNext && /(^|\/)app\/(.*\/)?page\.(t|j)sx$|hero/i.test(file)) {
      const m = text.match(/<Image\b[\s\S]*?\/>/);
      if (m && !/\bpriority\b|fetchPriority=["']high|loading=["']eager|\bpreload\b/.test(m[0])) {
        add({ id: 'perf.image.lcp-priority', severity: 'low', effort: 'S', title: 'First image on the page is not prioritised', file, line: lineAtIndex(text, m.index), evidence: m[0].replace(/\s+/g, ' ').slice(0, 140), why: 'If this is the largest above-the-fold image it is your LCP element; lazy-loading it delays LCP.', fix: 'If it is above the fold, add priority (Next ≤15) / preload, and sizes when using fill.' });
      }
    }
    // inline SVG weight
    for (const m of text.matchAll(/<svg\b[\s\S]*?<\/svg>/g)) {
      if (m[0].length > 10 * KB) add({ id: 'perf.svg.inline-large', severity: 'low', effort: 'S', title: 'Large inline SVG in a component', file, line: lineAtIndex(text, m.index), evidence: `${kb(m[0].length)} inline`, why: 'Inline SVG is parsed with the JavaScript bundle on every page that imports it.', fix: 'Optimise with svgo, or serve it as a file (<img src>) if it is not styled by CSS.' });
    }
  }

  if (dynamicMarkers >= 3) add({ id: 'perf.cache.all-dynamic', severity: 'medium', effort: 'M', title: 'Caching turned off in many places', file: dynamicFile, evidence: `${dynamicMarkers} × no-store / force-dynamic / revalidate = 0`, why: 'Every request re-renders and re-fetches on the server; time-to-first-byte grows with traffic.', fix: 'Cache what is shared (revalidate: 60, tags) and keep no-store only for per-user data.' });
  if (fontFamilies.size > 3) add({ id: 'perf.font.families', severity: 'low', effort: 'S', title: 'Many font families', file: null, evidence: [...fontFamilies].join(', '), why: 'Each family adds requests and swap shifts.', fix: 'Use one family for text and at most one for display.' });
  if (deps['lottie-web'] || deps['lottie-react'] || deps['@lottiefiles/react-lottie-player']) add({ id: 'perf.motion.lottie', severity: 'low', effort: 'M', title: 'Lottie runtime in the bundle', file: null, evidence: 'lottie dependency in package.json', why: 'The Lottie player is 60–250 KB; simple loaders and icons do not need it.', fix: 'Use CSS/SVG animations for simple loops (svg-motion templates) and keep Lottie for complex illustrations, lazy-loaded.' });

  return {
    area: 'Performance',
    scanned: files.length + imageFiles.length,
    score: scoreArea(findings),
    findings,
    checked: ['image formats, weights, next/image, dimensions, LCP priority, lazy loading', 'fonts: next/font, font-display, Thai weights and subsets, family count', 'data fetching: waterfalls, loops (N+1), async forEach, effect fetching, cancellation', 'Next caching markers (no-store / force-dynamic)', 'bundle: moment, lodash, barrel icons, heavy libraries imported statically, "use client" layouts, jQuery', 'rendering: index keys', 'third-party scripts', 'SVG and animation weight'],
    notChecked: ['real Core Web Vitals (LCP, INP, CLS) — run Lighthouse or PageSpeed Insights', 'actual bundle sizes — run the framework analyzer (e.g. @next/bundle-analyzer)', 'server and API response times', 'images loaded from a CMS or CDN at runtime'],
  };
}

function lineAtIndex(text, i) { return text.slice(0, i).split('\n').length; }

function keyframeBlocks(css) {
  const out = [];
  const re = /@keyframes\s+([\w-]+)\s*\{/g;
  let m;
  while ((m = re.exec(css))) {
    let depth = 1, i = re.lastIndex;
    while (i < css.length && depth) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
    out.push({ name: m[1], body: css.slice(re.lastIndex, i - 1), index: m.index });
    re.lastIndex = i;
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli(process.argv, { name: 'perf-audit', title: 'Performance audit', run: perfAudit });
}
