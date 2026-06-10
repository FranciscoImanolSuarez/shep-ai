# Skill Registry — shep-ai

Generated: 2026-04-25

## Project Conventions

| Source | Path | Description |
|--------|------|-------------|
| CLAUDE.md | `CLAUDE.md` | References AGENTS.md |
| AGENTS.md | `AGENTS.md` | Next.js 16 breaking changes — read docs before coding |

## User Skills

| Skill | Trigger | Compact Rules |
|-------|---------|---------------|
| go-testing | Go tests, Bubbletea TUI testing | N/A for this project (TypeScript) |
| skill-creator | Creating new AI skills | Follow Agent Skills spec |
| nothing-design | User explicitly says "Nothing style" or "/nothing-design" | Nothing design system — NOT auto-triggered |
| branch-pr | Creating a pull request | PR creation workflow for Agent Teams Lite |
| issue-creation | Creating a GitHub issue | Issue creation workflow for Agent Teams Lite |
| judgment-day | Adversarial review | Parallel blind judge protocol |

## Compact Rules

### AGENTS.md
- Next.js 16 has breaking changes from training data
- MUST read `node_modules/next/dist/docs/` before writing Next.js code
- Heed deprecation notices

### CLAUDE.md
- Never add Co-Authored-By to commits. Conventional commits only.
- Never build after changes.
- Use bat/rg/fd/sd/eza instead of cat/grep/find/sed/ls.
- When asking a question, STOP and wait for response.
- Never agree without verification.
- Always propose alternatives with tradeoffs.
