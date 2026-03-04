# AI Agent Mandates: Tailwatch

1. **Execution Guardrail:** NEVER run typecheck, format, lint, build, or start servers unless the user explicitly asks for it in the current task.
2. **Source Control:** NEVER stage, commit, or push changes unless explicitly and specifically instructed by the user for the current task.
3. **Commit Messages:** Do not use Conventional Commits (no `feat:`, `fix:`, etc. prefixes). Use simple, lowercase, non-capitalized messages.
4. **Styling:** Always prefer Tailwind variables and utility classes over custom ones. Follow Tailwind best practices for component extraction and custom configuration. Only create custom CSS variables if strictly necessary.
