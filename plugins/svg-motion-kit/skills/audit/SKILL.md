---
name: audit
description: Run a full frontend review in one go (security, UX and accessibility, performance, design genericness, polish), merge it into one prioritised report with numbered findings and a "do these first" list, then fix chosen findings one at a time with diffs. Use for "audit my site", "review everything before launch", "full frontend check", "what should I fix first", "is this production-ready", "ตรวจเว็บทั้งหมด", "ตรวจก่อนขึ้น production", "ควรแก้อะไรก่อน", or "fix F3". For a single area, the area skill (ui-audit, perf-audit, security-audit, polish-audit, design-lint) is enough.
---

# audit

One command for the whole frontend review: a prioritised report with evidence, then safe fixes chosen by number.

**Language:** reply in the language the user wrote in, Thai or English. Keep file names, code and CLI output as they are.

## 1. Run it

```bash
node "<skill-dir>/scripts/audit.mjs" "<project>"                      # all areas; writes .svg-motion/audit.md + audit.json
node "<skill-dir>/scripts/audit.mjs" "<project>" --only security,ui   # some areas
node "<skill-dir>/scripts/audit.mjs" "<project>" --skip design
```

- **Areas and weights:** security 30%, UX & accessibility 25%, performance 20%, design 15% (100 minus design-lint's genericness), polish 10%.
- **Motion suggestions:** spots from the svg-motion scout are listed separately, as suggestions rather than findings.
- **Numbering:** every finding gets a number (F1, F2 …) so the user can ask for fixes by number.
- Read-only apart from the two report files. Uses Node 18+ and makes no network calls.

## 2. Verify, then report

1. Open `.svg-motion/audit.md`.
2. For each **high** or **medium** item in "Do these first", open the file and confirm it, following the verification notes in the area skill:
   - [ui-audit](../ui-audit/SKILL.md)
   - [perf-audit](../perf-audit/SKILL.md)
   - [security-audit](../security-audit/SKILL.md)
   - [polish-audit](../polish-audit/SKILL.md)
   - [design-lint](../design-lint/SKILL.md)
3. Drop false positives and say how many you dropped.
4. Reply with:
   - the overall score and a one-line verdict per area
   - **Do these first:** at most 7 confirmed items, each with its F-number, file:line, the risk in plain words, and the effort
   - the motion opportunities, in one line
   - **not covered:** what static checks can't see. Offer, with consent, Lighthouse for real performance, `npm audit` for dependencies, and a browser pass in light and dark mode.
5. End by asking which findings to fix, for example "fix F2 F5", "fix all high", or "แก้ข้อ 1–3".

Never paste secret values. Security findings are already masked.

## 3. Fix mode (only for the findings the user picked)

For each chosen finding, **one at a time**:

1. Read its `playbook` (or id) and follow [references/playbooks.md](references/playbooks.md).
2. Make the smallest change that fixes it, using the project's own components, tokens and libraries. Install nothing without asking.
3. Show the diff and explain it in one sentence. Write only after the user approves, unless they already said to apply without asking.
4. Re-run that area to confirm the finding is gone: `audit.mjs … --only <area> --no-write`.
5. If the fix breaks something, such as a failing type check or test, or the finding is still there, **stop**, revert the change and report back. Don't pile more fixes on top.

When all chosen fixes are done, re-run the full audit and report the before and after scores.

Some things are never done in fix mode without an explicit, separate yes:
- rewriting git history (purging a secret)
- rotating keys (only the user can do this at the provider)
- adding dependencies
- changing auth logic beyond adding a check that the project already uses elsewhere
