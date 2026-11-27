# Testing svg-motion-kit

There are three layers of tests: fast unit tests, live runs with the plugin loaded the way users load it, and the eval suite.

## 1. Unit tests (every change, in CI)

```bash
npm test
```

These use Node's built-in runner, with nothing to install. They cover the colour maths, CSS parsing and role mapping in `theme-extract`. They also render every template against every example theme in both modes and require zero validator errors, and they cover the scout, the React export, `design-lint`, and regressions found on real projects.

## 2. Live run with the plugin (before a release)

Load the plugin from this folder without installing it, run Claude headless on a **copy** of an example project, and inspect the diff:

```bash
cp -R examples/next-tailwind /tmp/smk-next && cd /tmp/smk-next && git init -q && git add -A && git commit -qm base
claude -p "หน้า Orders ตอนไม่มีออเดอร์ยังเป็นแค่ข้อความ ช่วยใส่ภาพ empty state เคลื่อนไหวที่เข้ากับธีมให้หน่อย ทำได้เลย" \
  --plugin-dir /path/to/svg-motion-kit/plugins/svg-motion-kit \
  --permission-mode acceptEdits \
  --allowedTools "Bash(node:*)" Read Write Edit Glob Grep Skill \
  --output-format stream-json --verbose > run.jsonl
git diff && git status
```

Check that:
- the right skill fired (`Skill` tool use in `run.jsonl`)
- the scripts ran in order: theme → render → validate → component
- the page diff keeps the existing text, and the illustration is `decorative`
- the component type-checks
- the reply is in the user's language

### Results from 2026-11-27 (v0.1 candidate)

| Run | Prompt | Skill chain | Result | Cost |
|---|---|---|---|---|
| Next + Tailwind v4 copy | Thai: add an animated empty state to Orders | `svg-motion` → `theme-extract` → render (`--no-text`) → validate → `to-component` → edit `app/page.tsx` | ✅ 20 turns. Component uses `var(--primary)` and `--chart-2`, is `decorative`, keeps the "No orders yet" text, and passes TS strict. Found issue: the reply came back in English, now fixed with a language rule in every SKILL.md. | $0.51 |
| generic-ai copy | Thai + English: why does this look AI-made, for a Thai clinic scheduling app | `design-lint` → lint script → reads files → computes WCAG contrast | ✅ 13 turns. Reply in Thai, score 93, findings grouped with file:line, three clinic-grounded directions with palettes mapped to existing variables and checked contrast. No code edits. | $0.45 |

Fixes made because of these runs:
- The scout now recognises its own generated components, so it doesn't suggest the same spot again.
- Every skill now replies in the user's language.

## 3. Eval suite (trigger accuracy and outcomes)

```bash
cd plugins/svg-motion-kit
claude plugin eval . --no-publish                 # 3 runs per case, with and without the plugin
claude plugin eval . --runs 1 --max-cost-usd 4    # quick check
```

There are four cases in `plugins/svg-motion-kit/evals/`:
- a Thai empty-state request (`svg-motion`)
- an English "looks AI-made" request (`design-lint`)
- a design-token question (`theme-extract`)
- an unrelated Python question, where **no skill may fire**

Each case has a `tool_used: Skill` trigger check plus an LLM grader that scores the outcome. `--ablation with-without` (the default) also runs every case without the plugin, so the report shows what the plugin adds.

### Results from 2026-11-27 (`--runs 1`, $0.70 total)

| Case | With plugin | Without | Δ | Skill fired |
|---|---|---|---|---|
| th-empty-state | 1.00 | 0.00 | **+1.00** | ✅ svg-motion |
| en-design-lint | 1.00 | 1.00 | 0.00 | ✅ design-lint |
| en-theme-tokens | 1.00 | 1.00 | 0.00 | ✅ theme-extract |
| negative-python | 1.00 | 1.00 | 0.00 | ✅ none (correct) |

Triggering was correct in all four cases, in Thai and English, including the should-not-fire case.

**Known gap:** the eval workspace is empty, so the design-lint and theme-token graders can't tell the plugin's grounded answer from a good generic one (Δ 0). The next step is to scaffold an example project into each case's workspace and grade on file:line evidence and real token values. Until then, the live runs in section 2 are the stronger evidence for those two skills.

### Results from 2026-11-27 (v1.0 candidate)

**Live run: full audit in Thai.** The prompt was "ตรวจเว็บทั้งหมดก่อนขึ้น production … แล้วแก้ข้อแรก", run on a copy of `examples/ux-gaps`. Claude loaded `audit`, ran all five areas and opened every high and medium finding to confirm it (none dropped). It answered in Thai with F-numbers and file:line. It chose to fix F8, the missing error state, rather than the contrast finding, explaining that changing colours is a brand decision. It showed the diff, re-ran the area, and the score went from 72 to 76. 17 turns, $0.61.

**Found by that run, and fixed:** `perf-audit` only looked at the first 12 lines of a `useEffect`, so a longer effect hid its fetch. It now reads the effect up to its dependency array, and a regression test covers it.

**Eval, 7 cases, `--runs 1`, $1.25:**

| Case | With | Without | Δ |
|---|---|---|---|
| en-security | 1.00 | 0.00 | **+1.00** |
| th-full-audit | 1.00 | 1.00 | 0.00 |
| en-perf | 1.00 | 1.00 | 0.00 |
| en-design-lint | 1.00 | 1.00 | 0.00 |
| en-theme-tokens | 1.00 | 1.00 | 0.00 |
| th-empty-state | 1.00 | 1.00 | 0.00 (it was +1.00 in the first run; one run per case is noisy) |
| negative-python | 1.00 | 1.00 | 0.00 (no skill fired, which is correct) |

The skill fired in 6 of 6 trigger cases, and in none of the should-not-fire cases. The gap noted earlier still stands: the eval workspace is empty, so the graders can't reward file-level evidence. Scaffolding example projects into the cases is the next step for the evals.
