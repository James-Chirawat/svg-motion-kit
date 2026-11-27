import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { securityAudit, mask } from '../plugins/svg-motion-kit/skills/security-audit/scripts/security-audit.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = () => fs.mkdtempSync(path.join(repo, 'tests', '.tmp-'));
// Fake secrets are assembled at runtime so no realistic secret ever appears in this repository.
const fake = {
  stripe: ['sk', 'live', 'Z'.repeat(8) + '0123456789abcdefgh'].join('_'),
  aws: ['AK', 'IA', 'Z'.repeat(16)].join(''),
  github: ['ghp', 'Z'.repeat(36)].join('_'),
  pem: ['-----BEGIN', 'RSA PRIVATE', 'KEY-----'].join(' '),
  jwtService: ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'service_role', iss: 'x' })).toString('base64url'), 'c2lnbmF0dXJlc2lnbmF0dXJl'].join('.'),
  jwtAnon: ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role: 'anon', iss: 'x' })).toString('base64url'), 'c2lnbmF0dXJlc2lnbmF0dXJl'].join('.'),
};

test('mask never reveals a secret', () => {
  const m = mask(fake.stripe);
  assert.ok(!m.includes(fake.stripe.slice(4, -2)));
  assert.match(m, /chars, masked/);
});

test('leaky: every planted problem is found, secrets masked, committed .env detected', () => {
  const dir = tmp();
  try {
    fs.cpSync(path.join(repo, 'examples/leaky'), dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'lib/payments.ts'), `export const stripe = "${fake.stripe}";\nexport const aws = "${fake.aws}";\n`);
    fs.writeFileSync(path.join(dir, 'lib/keys.ts'), `const gh = "${fake.github}";\nconst pem = \`${fake.pem}\`;\nconst svc = "${fake.jwtService}";\nexport { gh, pem, svc };\n`);
    fs.writeFileSync(path.join(dir, '.env'), 'DATABASE_URL=postgres://u:p@h/db\n');
    spawnSync('git', ['init', '-q'], { cwd: dir });
    spawnSync('git', ['add', '-A', '-f'], { cwd: dir });
    const a = securityAudit(dir);
    const ids = new Set(a.findings.map((f) => f.id));
    for (const id of ['sec.secret.stripe-live', 'sec.secret.aws-access-key', 'sec.secret.github-token', 'sec.secret.private-key', 'sec.secret.jwt', 'sec.env.committed', 'sec.env.public-secret',
      'sec.xss.dangerous-html', 'sec.xss.svg-upload', 'sec.xss.eval', 'sec.auth.token-storage', 'sec.auth.client-only-guard', 'sec.redirect.open', 'sec.api.no-auth', 'sec.action.no-auth',
      'sec.headers.csp', 'sec.headers.frame', 'sec.build.sourcemaps', 'sec.deps.no-lockfile']) {
      assert.ok(ids.has(id), `missing ${id}`);
    }
    const json = JSON.stringify(a);
    for (const v of Object.values(fake)) assert.ok(!json.includes(v), 'a secret value leaked into the report');
    assert.equal(a.findings.find((f) => f.id === 'sec.secret.jwt').severity, 'high', 'service_role JWT is high');
    assert.equal(a.findings.find((f) => f.id === 'sec.action.no-auth').file, 'app/actions.ts');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('false-positive guards: local .env, anon JWT, placeholders, storage key names, project auth helpers, middleware, public routes', () => {
  const dir = tmp();
  try {
    const w = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text); };
    w('package.json', '{"dependencies":{"next":"15.0.0"}}');
    w('package-lock.json', '{}');
    w('.gitignore', '.env*\n');
    w('.env', `STRIPE_SECRET_KEY=${fake.stripe}\n`);
    w('lib/supabase.ts', `export const anon = "${fake.jwtAnon}";\nconst apiKey = "your-api-key-here";\nconst TOKEN_KEY = "vh_admin_token";\n`);
    w('app/api/orders/route.ts', 'import { requireResidentScope } from "@/lib/scope";\nexport async function POST(req) { const s = await requireResidentScope(req); await prisma.order.create({ data: {} }); }\n');
    w('app/api/public/waitlist/route.ts', 'import { rateLimit } from "@/lib/rl";\nexport async function POST(req) { await rateLimit(req); await prisma.waitlist.create({ data: {} }); }\n');
    w('app/actions.ts', '"use server";\nimport { auth } from "@/auth";\nexport async function save() { const s = await auth(); if (!s) throw new Error("401"); await prisma.post.update({ where: {}, data: {} }); }\n');
    w('next.config.mjs', 'export default { async headers() { return [{ source: "/(.*)", headers: [{ key: "Content-Security-Policy", value: "default-src \'self\'" }, { key: "X-Frame-Options", value: "DENY" }, { key: "Referrer-Policy", value: "strict-origin" }, { key: "Permissions-Policy", value: "camera=()" }, { key: "X-Content-Type-Options", value: "nosniff" }] }]; } };\n');
    spawnSync('git', ['init', '-q'], { cwd: dir });
    spawnSync('git', ['add', '-A'], { cwd: dir }); // .env stays ignored
    assert.deepEqual(securityAudit(dir).findings.map((f) => `${f.id} ${f.file}:${f.line}`), []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
