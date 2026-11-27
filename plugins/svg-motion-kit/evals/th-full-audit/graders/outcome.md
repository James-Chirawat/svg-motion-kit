---
type: llm
weight: 2
---
Pass when the reply is in Thai and either (a) reports prioritised findings across several areas (security, UX/accessibility, performance…) with file locations, or (b) — if the workspace has no project — explains it will run the combined audit and asks for the project path. It must not claim the site is "secure" or "done", and must not invent findings it did not check. Fail if it answers with generic best-practice advice only.
