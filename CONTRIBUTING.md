# Contributing

Thanks for helping. Issues and pull requests are welcome, in English or Thai.

## Layout

```
.claude-plugin/marketplace.json     marketplace entry (what /plugin marketplace add reads)
plugins/svg-motion-kit/
  .claude-plugin/plugin.json        plugin manifest (bump "version" on every release)
  skills/<name>/SKILL.md            one folder per skill
  skills/<name>/scripts/            plain Node .mjs, no dependencies, no network
  skills/<name>/references/         detail that SKILL.md links to
  skills/<name>/templates/          starting SVGs
docs/assets/                        SVGs shown in the README
examples/                           sample projects used to test the skills
```

## Rules for SVG templates and examples

- Use colour only through CSS variables or `currentColor`. A hex value is allowed only as a `var()` fallback, except in `docs/assets/`, where README images must carry their own palette because GitHub shows them through `<img>`.
- Include `@media (prefers-reduced-motion: reduce)`. The resting state with no animation must look finished.
- Animate only `transform` and `opacity`. No flashing more than 3 times a second.
- Use `role="img"` and `<title>` when the image is meaningful, and `aria-hidden="true"` when it is decorative.
- Keep each file small (target under 15 KB). No external fonts, images or scripts.

## Scripts

- Plain Node (`.mjs`), runs on Node 18 or later, on macOS, Linux and Windows.
- No dependencies, no network calls, no writes outside the paths the skill states.

## Tests

```bash
npm test
```

This uses Node's built-in test runner, so there is nothing to install. Tests live in `tests/` and use the projects in `examples/` as fixtures. When you fix a bug found on a real project, add a small regression test that builds its own fixture with the `fixture()` helper.

## Workflow

1. Branch from `main` (`feat/…`, `fix/…`, `docs/…`).
2. Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`).
3. Add a line under `[Unreleased]` in `CHANGELOG.md`.
4. Open a pull request and describe how you tested it: which example project, and what Claude produced.
