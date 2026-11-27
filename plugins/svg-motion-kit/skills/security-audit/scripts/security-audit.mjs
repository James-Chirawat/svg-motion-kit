#!/usr/bin/env node
// security-audit.mjs — frontend security mistakes visible in the code (not a pentest)
//
// Usage: node security-audit.mjs [projectDir] [--json] [--write]
//
// Secrets in source and committed .env files (values are always masked), secrets exposed to the
// browser through NEXT_PUBLIC_/VITE_/PUBLIC_ variables, XSS sinks (dangerouslySetInnerHTML,
// v-html, {@html}, innerHTML, eval) including uploaded SVG rendered as markup, tokens in
// localStorage, client-only route guards, mutating API routes and server actions with no auth
// check, open redirects, missing security headers, public source maps, missing lockfile.
// Read-only (runs `git ls-files` if the folder is a git repo), zero dependencies, no network.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { walkFiles, readText, finding, scoreArea, runCli, projectPackage, UI_EXT } from '../../../shared/audit-core.mjs';

const TEXT_EXT = new Set([...UI_EXT, '.ts', '.js', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.toml', '.env', '.py', '.rb', '.go', '.php', '.sh']);
const isEnvFile = (rel) => /(^|\/)\.env(\.[\w.-]+)?$/.test(rel);
const isExampleEnv = (rel) => /\.env\.(example|sample|template|defaults?)$/.test(rel);

export const mask = (v) => (v.length <= 8 ? '•'.repeat(v.length) : `${v.slice(0, 4)}…${v.slice(-2)} (${v.length} chars, masked)`);

const SECRET_PATTERNS = [
  { id: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/g, severity: 'high', label: 'AWS access key id' },
  { id: 'stripe-live', re: /\b(sk|rk)_live_[0-9a-zA-Z]{20,}\b/g, severity: 'high', label: 'Stripe live secret key' },
  { id: 'stripe-test', re: /\bsk_test_[0-9a-zA-Z]{20,}\b/g, severity: 'low', label: 'Stripe test secret key' },
  { id: 'github-token', re: /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/g, severity: 'high', label: 'GitHub token' },
  { id: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, severity: 'high', label: 'Slack token' },
  { id: 'anthropic-key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g, severity: 'high', label: 'Anthropic API key' },
  { id: 'openai-key', re: /\bsk-(proj-)?[A-Za-z0-9_-]{32,}\b/g, severity: 'high', label: 'OpenAI API key' },
  { id: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g, severity: 'medium', label: 'Google API key (restrict it by referrer/API if it must be public)' },
  { id: 'private-key', re: /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g, severity: 'high', label: 'Private key' },
  { id: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, severity: 'medium', label: 'JSON Web Token' },
];
const GENERIC_SECRET = /\b([A-Za-z_]*(?:api[_-]?key|secret|token|password|passwd|private[_-]?key|client[_-]?secret|access[_-]?key)[A-Za-z_]*)\s*[:=]\s*["'`]([^"'`\s$<{}]{12,})["'`]/gi;
const PLACEHOLDER = /^(your[-_]|<|xxx|change[-_]?me|example|dummy|test|placeholder|replace|todo|\*+$|\.\.\.|sk_test_|pk_)/i;
const PUBLIC_PREFIX = /\b(NEXT_PUBLIC|VITE|PUBLIC|NUXT_PUBLIC|REACT_APP|EXPO_PUBLIC|GATSBY)_([A-Z0-9_]*(SECRET|PRIVATE|SERVICE_ROLE|PASSWORD|PASSWD|ADMIN|TOKEN|WEBHOOK)[A-Z0-9_]*)\b/g;
const SAFE_PUBLIC = /(PUBLISHABLE|ANON|PUBLIC_KEY|SITE_KEY|CLIENT_ID|MEASUREMENT_ID|_URL$|LIFF_ID)/;
// Auth evidence: common libraries plus project helpers named require*/ensure*/assert*/getCurrent*/with*.
const AUTH_CHECK = /\b(auth\s*\(|getServerSession|currentUser|getSession\w*|getUser\b|getToken|(require|ensure|assert|check|verify|guard|protect)\w*(Auth|User|Session|Admin|Role|Scope|Permission|Login|Member|Owner|Access|Resident|Customer|Staff)\w*\s*\(|getCurrent\w*\s*\(|isAdmin|can\w*\(|verify(Token|Session|Signature|Jwt)?\s*\(|jwtVerify|clerk|with(Auth|Session|User)\b|supabase\.auth|session\b|cookies\(\)\.get|unauthori[sz]ed|forbidden\s*\(|401|403|constructEvent|svix|x-signature|x-hub-signature|timingSafeEqual|ratelimit)/i;
const WRITE_OP = /\b(prisma\.\w+\.(create|update|upsert|delete|deleteMany|updateMany|createMany)|db\.(insert|update|delete)|\.from\([^)]*\)\.(insert|update|upsert|delete)|\.(insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany|findOneAndUpdate)\(|sql`\s*(insert|update|delete)|fs\.(writeFile|unlink|rm)|stripe\.\w+\.create)/i;

function gitTracked(root) {
  if (!fs.existsSync(path.join(root, '.git'))) return null;
  const r = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? new Set(r.stdout.split('\0').filter(Boolean)) : null;
}

export function securityAudit(rootDir) {
  const root = path.resolve(rootDir);
  const { deps, dir: pkgDir } = projectPackage(root);
  const isNext = !!deps.next;
  const findings = [];
  const add = (o) => findings.push(finding({ area: 'security', ...o }));
  const tracked = gitTracked(root);

  const files = walkFiles(root, { hidden: true, include: (rel, ext) => TEXT_EXT.has(ext) || isEnvFile(rel), ignoreDirs: new Set(['node_modules', '.git', '.next', '.nuxt', '.svelte-kit', '.output', 'dist', 'build', 'out', 'coverage', '.turbo', '.vercel', 'vendor', '.svg-motion', '.cache', 'venv', '.venv', '__pycache__']) })
    .filter((f) => !/(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb)$/.test(f));

  let hasMiddleware = false, headerConfig = '', protectedClientGuards = [];
  const seenSecrets = new Set();
  // A middleware that checks auth for /api covers route handlers it matches.
  const mwFile = files.find((f) => /(^|\/)(src\/)?middleware\.(t|j)s$/.test(f));
  const mwText = mwFile ? readText(root, mwFile) || '' : '';
  const middlewareGuardsApi = AUTH_CHECK.test(mwText) && /['"`]\/api|matcher[\s\S]*api/.test(mwText);

  for (const file of files) {
    const text = readText(root, file, 1024 * 1024);
    if (text == null) continue;
    const lines = text.split('\n');
    const ext = path.extname(file);
    const env = isEnvFile(file);
    const ui = UI_EXT.has(ext);
    const code = ui || ['.ts', '.js', '.mjs', '.cjs'].includes(ext);

    if (/(^|\/)middleware\.(t|j)s$/.test(file)) hasMiddleware = true;
    if (/(^|\/)(next\.config\.(m?js|ts)|vercel\.json|netlify\.toml|_headers|nuxt\.config\.(t|j)s|svelte\.config\.js|vite\.config\.(t|j)s|firebase\.json|staticwebapp\.config\.json)$/.test(file) || /(^|\/)middleware\.(t|j)s$/.test(file) || /hooks\.server\.(t|j)s$/.test(file)) headerConfig += `\n${text}`;

    // ---- committed env files
    if (env && !isExampleEnv(file)) {
      const committed = tracked ? tracked.has(file) : null;
      if (committed) add({ id: 'sec.env.committed', severity: 'high', effort: 'S', title: '.env file committed to git', file, evidence: `${file} is tracked by git`, why: 'Everyone with repo access (and every fork/clone, forever in history) has these values.', fix: 'Rotate every value in it, remove it with `git rm --cached`, add .env* to .gitignore, and use the host\'s secret store.' });
    }

    // ---- known secret formats
    // Local, uncommitted .env files are where secrets belong; only committed ones are a leak (above).
    if (!isExampleEnv(file) && !(env && !(tracked && tracked.has(file)))) {
      for (const p of SECRET_PATTERNS) {
        for (const m of text.matchAll(p.re)) {
          const value = m[0];
          if (p.id === 'jwt' && /anon|publishable/i.test(lines[lineOf(text, m.index) - 1])) continue;
          const key = `${p.id}:${value}`;
          if (seenSecrets.has(key)) continue;
          seenSecrets.add(key);
          let severity = p.severity;
          if (p.id === 'jwt') {
            try { const payload = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString('utf8')); if (payload.role === 'service_role') severity = 'high'; else if (payload.role === 'anon') continue; } catch { /* not decodable */ }
          }
          add({ id: `sec.secret.${p.id}`, severity, effort: 'S', title: `${p.label} in the repository`, file, line: lineOf(text, m.index), evidence: mask(value), why: 'Anyone who can read the code (or the built bundle, if it reaches the client) can use it.', fix: 'Rotate the key now, move it to an environment variable on the server only, and purge it from git history if it was pushed.' });
        }
      }
      // generic assignments (skip env files: values there are expected; committed env is reported above)
      if (code) {
        for (const m of text.matchAll(GENERIC_SECRET)) {
          const [, name, value] = m;
          if (PLACEHOLDER.test(value) || /process\.env|import\.meta\.env/.test(value) || /^(true|false|null|undefined)$/i.test(value)) continue;
          if (/^[A-Z0-9_]+$/.test(value) || /^[a-z]+(-[a-z]+)*$/.test(value)) continue; // identifiers / css-like words
          if (SECRET_PATTERNS.some((p) => new RegExp(p.re.source).test(value))) continue; // already reported
          if (/(token|secret)_?(Name|Key|Header|Type|Url|Endpoint|Field|Label|Placeholder)$/i.test(name)) continue; // e.g. TOKEN_KEY = "app_token" (a storage key name)
          if (/^[a-z][a-z0-9]*([_.:-][a-z0-9]+)+$/.test(value)) continue; // snake/kebab identifiers, not random secrets
          add({ id: 'sec.secret.hardcoded', severity: 'medium', effort: 'S', title: 'Hard-coded credential-like value', file, line: lineOf(text, m.index), evidence: `${name} = ${mask(value)}`, why: 'Credentials in source end up in git history and, for client code, in the browser bundle.', fix: 'Read it from an environment variable on the server; rotate it if it is real.' });
        }
      }
    }

    // ---- secrets exposed to the browser via public env prefixes
    for (const m of text.matchAll(PUBLIC_PREFIX)) {
      if (SAFE_PUBLIC.test(m[2])) continue;
      add({ id: 'sec.env.public-secret', severity: 'high', effort: 'S', title: 'Secret-looking variable exposed to the browser', file, line: lineOf(text, m.index), evidence: m[0], why: `${m[1]}_ variables are inlined into the client bundle; anything named like a secret is readable by every visitor.`, fix: `Rename it without the ${m[1]}_ prefix and use it only in server code (route handlers, server actions, server components).` });
    }

    if (!code) continue;

    // ---- XSS sinks
    lines.forEach((l, i) => {
      const n = i + 1;
      if (/dangerouslySetInnerHTML\s*=\s*\{\{/.test(l)) {
        const ctx = lines.slice(i, i + 3).join(' ');
        if (/DOMPurify\.sanitize|sanitizeHtml|sanitize\(|xss\(|purify/i.test(ctx)) return;
        const jsonLd = /application\/ld\+json/.test(lines.slice(Math.max(0, i - 3), i + 2).join(' ')) && /JSON\.stringify/.test(ctx);
        if (jsonLd) {
          if (!/replace\(\s*\/<\//.test(ctx)) add({ id: 'sec.xss.json-ld', severity: 'low', effort: 'S', title: 'JSON-LD injected without escaping "<"', file, line: n, evidence: l, why: 'If any value contains "</script>", it breaks out of the script tag.', fix: 'Use JSON.stringify(data).replace(/</g, "\\\\u003c").' });
          return;
        }
        const userish = /(props|params|searchParams|data|content|body|description|comment|message|html|markdown|post|item|row|user|text)\b/i.test(ctx);
        add({ id: 'sec.xss.dangerous-html', severity: userish ? 'high' : 'medium', effort: 'S', title: 'HTML injected without sanitising', file, line: n, evidence: l, why: 'If the HTML can contain user or CMS content, it can run scripts in your users\' sessions (stored XSS).', fix: 'Render as text, or sanitise with DOMPurify (isomorphic-dompurify on the server) with a strict allow-list.' });
      }
      if (/\bv-html\s*=|\{@html\s/.test(l) && !/sanitize|DOMPurify|purify/i.test(l)) add({ id: 'sec.xss.dangerous-html', severity: 'high', effort: 'S', title: 'HTML injected without sanitising', file, line: n, evidence: l, why: 'v-html / {@html} renders raw markup; user content becomes script execution.', fix: 'Render as text, or sanitise with DOMPurify first.' });
      if (/\.(innerHTML|outerHTML)\s*\+?=(?!=)|insertAdjacentHTML\s*\(|document\.write\s*\(/.test(l) && !/sanitize|DOMPurify|=\s*["'`]\s*["'`]|=\s*''/.test(l)) add({ id: 'sec.xss.dom-sink', severity: 'medium', effort: 'S', title: 'Raw HTML written to the DOM', file, line: n, evidence: l, why: 'Strings written as HTML run any markup and handlers they contain.', fix: 'Use textContent / element APIs, or sanitise with DOMPurify.' });
      if (/(^|[^.\w])eval\s*\(|new Function\s*\(/.test(l) && !/\/\/.*eval|['"`].*eval\s*\(.*['"`]/.test(l)) add({ id: 'sec.xss.eval', severity: 'high', effort: 'M', title: 'eval / new Function', file, line: n, evidence: l, why: 'Executes strings as code; with any outside input this is remote code execution in the browser or server.', fix: 'Replace with JSON.parse, a lookup table, or explicit logic.' });
      // tokens in localStorage
      if (/(localStorage|sessionStorage)\.setItem\(\s*[^,]*(token|jwt|auth|session|access|refresh|bearer)/i.test(l)) add({ id: 'sec.auth.token-storage', severity: 'medium', effort: 'M', title: 'Auth token stored in localStorage', file, line: n, evidence: l, why: 'Any XSS (or third-party script) can read it and impersonate the user; it also cannot be HttpOnly.', fix: 'Keep session tokens in HttpOnly, Secure, SameSite cookies set by the server.' });
      // open redirect
      if (/(router\.(push|replace)|redirect|NextResponse\.redirect|window\.location(\.href)?\s*=|location\.assign)\s*\(?/.test(l)) {
        const ctx = lines.slice(Math.max(0, i - 4), i + 1).join(' ');
        const fromQuery = /(searchParams\.get|query\.|params\.get|URLSearchParams)[^;]*\b(next|redirect|redirectTo|returnTo|return_to|callback|callbackUrl|url|to|continue)\b/i.test(ctx);
        const validated = /startsWith\(\s*['"]\/['"]|new URL\([^)]*\)\.(origin|host)|isSafe|isRelative|allowlist|allowedHosts|safeRedirect|sanitizeRedirect/.test(lines.slice(Math.max(0, i - 6), i + 2).join(' '));
        if (fromQuery && !validated) add({ id: 'sec.redirect.open', severity: 'medium', effort: 'S', title: 'Redirect target taken from the URL', file, line: n, evidence: l, why: 'Attackers send links like ?next=https://evil.example that bounce users to a phishing page from your trusted domain.', fix: 'Only allow relative paths (value.startsWith("/") && !value.startsWith("//")) or an allow-list of hosts.' });
      }
      // logging secrets
      if (/console\.(log|info|debug)\([^)]*\b(password|token|secret|apiKey|authorization)\b/i.test(l)) add({ id: 'sec.log.secret', severity: 'low', effort: 'S', title: 'Credential printed to logs', file, line: n, evidence: l, why: 'Logs are widely readable and retained.', fix: 'Remove the log or redact the value.' });
    });

    // uploaded SVG rendered as markup
    if (/svg/i.test(text) && /type\s*=\s*["']file["']|readAsText|\.text\(\)/.test(text) && /dangerouslySetInnerHTML|innerHTML|v-html|\{@html/.test(text) && !/DOMPurify|sanitize/i.test(text)) {
      add({ id: 'sec.xss.svg-upload', severity: 'high', effort: 'S', title: 'Uploaded SVG rendered as markup', file, line: lines.findIndex((l) => /readAsText|\.text\(\)|dangerouslySetInnerHTML|innerHTML|v-html|\{@html/.test(l)) + 1, evidence: 'file input / text() + raw HTML rendering', why: 'SVG can contain <script> and event handlers; rendering an uploaded SVG inline runs the uploader\'s code for every viewer.', fix: 'Show uploads with <img src> (scripts do not run there), or sanitise with DOMPurify (USE_PROFILES: { svg: true }); never inline untrusted SVG.' });
    }

    // Next: mutating route handlers without auth
    if (isNext && !middlewareGuardsApi && /(^|\/)app\/(.*\/)?route\.(t|j)s$/.test(file)) {
      for (const m of text.matchAll(/export\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b|export\s+const\s+(POST|PUT|PATCH|DELETE)\s*=/g)) {
        const line = lineOf(text, m.index);
        if (/\/webhooks?(\/|$)|webhook/.test(file)) {
          if (!/signature|verify|constructEvent|svix|hmac|timingSafeEqual|createHmac|x-hub-signature|secret/i.test(text)) add({ id: 'sec.api.webhook-unverified', severity: 'high', effort: 'S', title: 'Webhook without signature verification', file, line, evidence: m[0], why: 'Anyone who finds the URL can forge events (paid orders, delivery updates).', fix: 'Verify the provider signature (HMAC of the raw body with the shared secret, timing-safe compare) before acting.' });
        } else if (/\/(public|auth|login|logout|signin|sign-in|signup|sign-up|register|forgot|reset-password|waitlist|contact|newsletter|health|og)(\/|$)/.test(file)) {
          if (WRITE_OP.test(text) && !/ratelimit|rate-limit|rateLimit|captcha|turnstile|recaptcha|hcaptcha|upstash/i.test(text)) add({ id: 'sec.api.public-no-ratelimit', severity: 'low', effort: 'M', title: 'Public write endpoint without rate limiting', file, line, evidence: m[0], why: 'Open sign-up / contact / waitlist endpoints are spammed and used to enumerate accounts.', fix: 'Add rate limiting (e.g. per IP) and a CAPTCHA/Turnstile for anonymous forms.' });
        } else if (!AUTH_CHECK.test(text)) {
          add({ id: 'sec.api.no-auth', severity: WRITE_OP.test(text) ? 'high' : 'medium', effort: 'M', title: 'Mutating API route without an auth check', file, line, evidence: m[0], why: 'Route handlers are public URLs; without a session/role check anyone can call them.', fix: 'Check the session (and role) at the top of the handler and return 401/403.' });
        }
        break;
      }
    }
    // server actions without auth
    if (/^\s*['"]use server['"]/m.test(text) && WRITE_OP.test(text) && !AUTH_CHECK.test(text)) {
      const m = text.match(/export\s+(async\s+)?function\s+(\w+)/);
      add({ id: 'sec.action.no-auth', severity: 'high', effort: 'M', title: 'Server action writes data without an auth check', file, line: m ? lineOf(text, m.index) : 1, evidence: m ? m[0] : 'use server', why: 'Server actions are callable by anyone with the action id, from any page, with any arguments.', fix: 'Authenticate and authorise inside every action (not only in the page that renders the form), and validate inputs (zod).' });
    }
    // client-only guards on protected areas
    if (ui && /^\s*['"]use client['"]/m.test(text) && /(^|\/)(admin|dashboard|account|settings|portal)(\/|$)/.test(file) && /(router\.(push|replace)|redirect)\(\s*['"`]\/(login|signin|sign-in|auth)/.test(text)) {
      protectedClientGuards.push(file);
    }
  }

  if (isNext && protectedClientGuards.length && !hasMiddleware) {
    add({ id: 'sec.auth.client-only-guard', severity: 'medium', effort: 'M', title: 'Protected pages guarded only in the browser', file: protectedClientGuards[0], evidence: `${protectedClientGuards.length} client page(s) redirect to login; no middleware.ts`, why: 'The page code and its data requests still reach the browser; the redirect only hides them after JavaScript runs.', fix: 'Check the session on the server (middleware.ts, a server layout, or the data layer) before rendering or returning data.' });
  }

  // .env files present but nothing tells git to ignore them
  const envFiles = files.filter((f) => isEnvFile(f) && !isExampleEnv(f));
  const gitignore = readText(root, '.gitignore') || '';
  if (envFiles.length && !/(^|\n)\s*\/?\.env(\*|\..*|\.local)?\s*(\n|$)|(^|\n)\s*\*\.env/.test(gitignore) && !(tracked && envFiles.every((f) => !tracked.has(f)))) {
    add({ id: 'sec.env.not-ignored', severity: 'medium', effort: 'S', title: '.env files are not git-ignored', file: '.gitignore', evidence: `${envFiles.length} .env file(s); no .env rule in .gitignore`, why: 'One `git add .` away from publishing every secret.', fix: 'Add `.env*` (and `!.env.example`) to .gitignore.' });
  }

  // headers
  const web =isNext || deps.nuxt || deps['@sveltejs/kit'] || deps.vite || deps.astro || deps['react-scripts'];
  if (web) {
    const h = headerConfig;
    const missing = [];
    if (!/Content-Security-Policy/i.test(h)) missing.push(['sec.headers.csp', 'medium', 'Content-Security-Policy', 'Limits where scripts, styles and frames can load from, which contains the damage of any XSS.']);
    if (!/X-Frame-Options|frame-ancestors/i.test(h)) missing.push(['sec.headers.frame', 'medium', 'X-Frame-Options / frame-ancestors', 'Stops other sites from framing your pages for clickjacking.']);
    if (!/Referrer-Policy/i.test(h)) missing.push(['sec.headers.referrer', 'low', 'Referrer-Policy', 'Prevents full URLs (with tokens or ids) leaking to other sites.']);
    if (!/Permissions-Policy/i.test(h)) missing.push(['sec.headers.permissions', 'low', 'Permissions-Policy', 'Disables camera, microphone, geolocation etc. for pages and embeds that do not need them.']);
    if (!/X-Content-Type-Options/i.test(h)) missing.push(['sec.headers.nosniff', 'low', 'X-Content-Type-Options: nosniff', 'Stops browsers from treating uploads as executable content.']);
    for (const [id, severity, name, why] of missing) {
      add({ id, severity, effort: 'S', title: `No ${name} header configured`, file: null, evidence: 'not found in next.config / middleware / vercel.json / netlify / server hooks', why, fix: isNext ? 'Add it in next.config headers() (or middleware for a nonce-based CSP). Your host may set some of these — check the live response headers.' : 'Set it in your host config (vercel.json, netlify _headers, server). Check the live response headers.' });
    }
  }
  // build exposure
  if (/productionBrowserSourceMaps\s*:\s*true/.test(headerConfig)) add({ id: 'sec.build.sourcemaps', severity: 'medium', effort: 'S', title: 'Production source maps are public', file: 'next.config', evidence: 'productionBrowserSourceMaps: true', why: 'Your original source (comments, internal URLs, logic) is downloadable by anyone.', fix: 'Turn it off, or upload source maps privately to your error tracker.' });
  if (/build\s*:\s*\{[^}]*sourcemap\s*:\s*true/.test(headerConfig)) add({ id: 'sec.build.sourcemaps', severity: 'low', effort: 'S', title: 'Source maps shipped with the build', file: 'vite.config', evidence: 'build.sourcemap: true', why: 'The original source becomes public.', fix: 'Use sourcemap: "hidden" and upload them to your error tracker.' });
  // lockfile
  const lockDir = pkgDir ? path.join(root, pkgDir) : root;
  if (fs.existsSync(path.join(lockDir, 'package.json')) && !['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb', 'bun.lock'].some((f) => fs.existsSync(path.join(lockDir, f)) || fs.existsSync(path.join(root, f)))) {
    add({ id: 'sec.deps.no-lockfile', severity: 'low', effort: 'S', title: 'No lockfile', file: path.posix.join(pkgDir || '', 'package.json'), evidence: 'package.json without package-lock / pnpm-lock / yarn.lock', why: 'Every install can pull different (possibly compromised) versions.', fix: 'Commit the lockfile and install with npm ci / pnpm install --frozen-lockfile in CI.' });
  }

  return {
    area: 'Security',
    scanned: files.length,
    score: scoreArea(findings),
    findings,
    checked: ['secrets in source (AWS, Stripe, GitHub, Slack, OpenAI, Anthropic, Google, private keys, JWTs incl. Supabase service_role) — values masked', 'committed .env files (git ls-files)', 'secret-looking NEXT_PUBLIC_/VITE_/PUBLIC_ variables', 'XSS sinks: dangerouslySetInnerHTML, v-html, {@html}, innerHTML, document.write, eval, uploaded SVG rendered as markup', 'tokens in localStorage, client-only route guards', 'Next route handlers and server actions that write without an auth check', 'open redirects from query parameters', 'security headers in config, public source maps, lockfile'],
    notChecked: ['dependency vulnerabilities — run `npm audit` (needs network; ask first)', 'live response headers set by the host/CDN', 'authorisation logic correctness (who may do what)', 'backend, database rules (e.g. Supabase RLS), infrastructure', 'this is a code-level checklist, not a penetration test'],
  };
}

function lineOf(text, i) { return text.slice(0, i).split('\n').length; }

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli(process.argv, { name: 'security-audit', title: 'Security audit', run: securityAudit });
}
