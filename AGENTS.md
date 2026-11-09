<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Publication

Work on this project locally. Publish or update its Sites deployment only when the user explicitly requests publication in the current task.

## Project context

Read `CONTEXTO_IA.md` for the current architecture, editor behavior, demo/real data distinction, security rules, and validation workflow before modifying this project.

## Collaboration

Codex and Claude Code both work on this project with equal relevance. Both follow the shared protocol in `CONTEXTO_IA.md` §1.1 (check `git status` first, never revert or reformat the other agent's work, one commit per task with a Spanish message, update `CONTEXTO_IA.md` when behavior changes). `CLAUDE.md` is Claude Code's entry point and adds no project rules of its own. Never store passwords or credential notes in project files: the GitHub repository is public.
