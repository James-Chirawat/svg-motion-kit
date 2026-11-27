---
type: llm
weight: 2
---
Pass when the reply either reports tokens it actually found in the workspace, or (if the workspace has no frontend project) says clearly that no theme was found and asks for the project path or a primary colour. Fail if it invents a palette and presents it as the project's tokens.
