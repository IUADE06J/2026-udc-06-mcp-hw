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

Configured in `.cursor/mcp.json`. Full scope notes: `docs/mcp/servers.md`.

- **filesystem** (`@modelcontextprotocol/server-filesystem`) — read the seeded catalog in `app/data/` (`catalog.json`) without exposing the rest of the repo, home directory, or drive. Allowed path is `${workspaceFolder}/app/data` only.
- **memory** (`@modelcontextprotocol/server-memory`) — local knowledge graph across chats (facts about SKUs, low stock, A/B notes). No network, no token. Does not replace catalog tools.
- **catalog** (`mcp-server/`) — read-only tools `search_inventory`, `check_stock`, `low_stock` plus resource `inventory://catalog`. Wraps `app/` domain functions; do not reimplement those rules.
