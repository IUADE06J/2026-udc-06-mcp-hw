# AGENTS.md

Baseline guidance for an Agentic IDE working in **this homework repo**.

> UDC Workshop 6 homework — MCP (Model Context Protocol). Participants connect
> public MCP servers with safe scoping, build a custom MCP server over the
> seeded catalog domain, document a threat model, and prove with an A/B test
> that the server changed the outcome. See `docs/walkthrough.md`.

## Context

- `app/` is a small TypeScript **catalog/inventory library** — the domain a
  custom MCP server wraps. See `app/AGENTS.md` for its own conventions.
  - `app/src/catalog.ts` — pure functions (`searchProducts`, `findBySku`,
    `lowStock`, `categories`, `inventoryValue`).
  - `app/src/loader.ts` — `loadCatalog()`, the only filesystem touch.
  - `app/data/catalog.json` — 24 synthetic products. **Do not edit** — Task D
    compares against these numbers.
  - `cd app && npm install && npm test` is green from the start;
    `npm run build` produces `app/dist/` which `mcp-server/` imports.
- `mcp-server/` does **not exist yet** — the participant creates it in Task B.
- `materials/domain-brief.md` is the source of truth for what the server should
  expose; `materials/ab-question.md` holds the fixed A/B prompt.
- Graded by CodeRabbit (`.coderabbit.yaml`) against the Definition of Done in
  `docs/walkthrough.md`.

## Conventions

- Documentation language: Ukrainian or English (participant's choice).
- Keep deliverables at the agreed paths so auto-review can find them:
  - `.mcp.json` and/or `.cursor/mcp.json` — MCP server config (Task A)
  - `docs/mcp/servers.md` — what is connected and with what scope (Task A)
  - `app/AGENTS.md` — gains a `## MCPs` section (Task A)
  - `mcp-server/` — the custom server, ≥2 tools + ≥1 resource (Task B)
  - `docs/mcp/SECURITY.md` — threat model (Task C)
  - `docs/ab-validation.md` — A/B write-up (Task D)
  - `docs/task-e-bonus.md` — bonus, one path (Task E)
- MCP config must reference secrets as `${ENV_VAR}`, never literal values.

## Guardrails

- **NEVER** commit real secrets, API keys, tokens, or `.env`. They are
  gitignored — keep it that way. Commit `.env.example` instead.
- **NEVER** add real client/NDA business data — `app/` is synthetic on purpose.
- Do not change the exported signatures in `app/src/catalog.ts`.
- Do not edit `app/data/catalog.json` (it is the A/B ground truth).
- The custom MCP server should be **read-only**: no tool that writes, deletes,
  or makes network calls. Least privilege is the lesson of this workshop.
- **Windows + Git Bash:** never use `2>nul` / `>nul` (creates a literal `nul`
  file). Use `2>/dev/null` / `>/dev/null`. `nul` is gitignored as a net.

## How to verify

Before opening a PR: `cd app && npm test` is green, `mcp-server/` actually
starts and its tools appear in your host, `docs/mcp/SECURITY.md` describes
*your* configuration (not generic advice), `docs/ab-validation.md` shows a real
recorded comparison, and `git grep` finds no tokens.
