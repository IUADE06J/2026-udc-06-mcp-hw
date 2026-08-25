# catalog-server (Task B)

Read-only MCP adapter over `app/`. Tools and the resource **import**
`searchProducts`, `findBySku`, `lowStock`, `categories`, `inventoryValue`,
and `loadCatalog` from `app/dist/` — they do not reimplement catalog rules.

```
mcp-server/
├── src/server.ts
├── dist/server.js
├── package.json
└── tsconfig.json
```

`src/` and `dist/` sit at the same depth so `../../app/dist/index.js` is valid
in both source and the compiled file.

## Tools / resource

| Name | Kind | Domain call |
|---|---|---|
| `search_inventory` | tool | `searchProducts` |
| `check_stock` | tool | `findBySku` |
| `low_stock` | tool | `lowStock` |
| `inventory://catalog` | resource | `categories` + `inventoryValue` |

All four are read-only: no writes, deletes, or network.

SDK: **v2** (`@modelcontextprotocol/server`).

## Build and run

```bash
cd app && npm install && npm test && npm run build && cd ..
cd mcp-server && npm install && npm run build
```

Host config (`.cursor/mcp.json`) launches `node` on `mcp-server/dist/server.js`
with `${workspaceFolder}` so the path is absolute regardless of cwd.

Smoke-test without a host:

```bash
npx @modelcontextprotocol/inspector --cli node ./dist/server.js --method tools/list
```
