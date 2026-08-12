# AGENTS.md — catalog app

Guidance for an Agentic IDE working inside `app/`.

## Stack

- TypeScript (ES2022, NodeNext modules), Node 22+
- vitest for tests, colocated as `*.test.ts`
- No framework, no runtime dependencies — this is a plain domain library

## Commands

```bash
npm install
npm test          # vitest run
npm run typecheck # tsc, no emit
npm run build     # tsc -> dist/  (needed before mcp-server/ can import it)
```

## Architecture

- `data/catalog.json` — the seeded product data (synthetic, 24 items).
- `src/catalog.ts` — **pure** functions over a `Product[]` passed in. No I/O.
- `src/loader.ts` — the only file that touches the filesystem (`loadCatalog`).
- `src/index.ts` — public surface; everything external imports from here.

The split is deliberate: pure logic stays trivially testable, and the MCP
server in `mcp-server/` imports the same functions rather than reimplementing
them.

## Conventions

- Named exports only, no default exports.
- No `any`. Prefer `unknown` plus narrowing if a type is genuinely open.
- Keep `src/catalog.ts` free of imports from `node:*` — it must stay pure.
- Every exported function gets a colocated test case in `src/catalog.test.ts`.
- Import paths carry the `.js` extension (NodeNext), even from `.ts` sources.

## Guardrails

- **Do not change the signatures** of the exported catalog functions —
  `mcp-server/` depends on them, and so does the graded homework.
- **Do not edit `data/catalog.json`.** The A/B exercise in Task D compares
  against the seeded numbers; changing the data invalidates it.
- Never add real business data, PII, or secrets here. Everything is synthetic
  on purpose.

## MCPs

Registered in [`../.mcp.json`](../.mcp.json) at the repo root. Full rationale
and scope analysis: [`../docs/mcp/servers.md`](../docs/mcp/servers.md);
threat model: [`../docs/mcp/SECURITY.md`](../docs/mcp/SECURITY.md).

| Server | What it is for | Scope given | Writes? |
|---|---|---|---|
| `catalog` (own, `mcp-server/`) | Authoritative answers over this catalog: `search_inventory`, `check_stock`, `low_stock`, plus the `inventory://catalog` resource | No path arguments at all — reads only via `loadCatalog()` from `app/dist` | No — read-only by construction |
| `filesystem` | Lets an agent read `catalog.json` directly (needed as the control condition for the Task D A/B) | Argument narrowed to `app/data/` only | **Yes** — 4 of its 14 tools write (`write_file`, `edit_file`, `create_directory`, `move_file`) |
| `memory` | Carries domain facts about the catalog across sessions | One gitignored JSON file (`MEMORY_FILE_PATH`) | **Yes** — but only into its own state file |

Notes for whoever works here next:

- **Prefer the `catalog` server over reading `data/catalog.json` by hand.** Both
  routes reach the same numbers, but the tools call the same tested functions
  this app exports, so the answer cannot drift from `npm test`.
- The `catalog` server imports `app/dist/`, so **`npm run build` must have run**
  or the server will not start.
- `filesystem` can modify files under `app/data/`. `data/catalog.json` is
  seeded ground truth and **must not be edited** — see Guardrails above. Treat
  its write tools as off-limits here.
- No MCP server in this project needs an API key. If one ever does, it goes in
  the config as `${ENV_VAR}` and the value lives in `.env` (gitignored).
