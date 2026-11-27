---
type: llm
weight: 2
---
Pass when the reply:
- is written in Thai;
- follows a theme-first workflow: it looks for the project's theme (theme.json / theme-extract / CSS variables) or asks where the project is, instead of inventing colours;
- does NOT paste a finished SVG with hardcoded hex colours or an indigo/violet/purple gradient;
- mentions keeping the visible text in the page (or accessibility / reduced motion) OR clearly plans to render from a template and validate it.
Fail if it hand-writes an arbitrary purple/indigo SVG or ignores the project's theme.
