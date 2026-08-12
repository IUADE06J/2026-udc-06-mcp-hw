# Domain brief — the catalog your MCP server wraps

This is the **source of truth** for what your custom MCP server (Task B) should
expose. Read it before writing any tools.

## The data

`app/data/catalog.json` — 24 synthetic products. Each has:

| Field | Type | Meaning |
|---|---|---|
| `sku` | string | Stable id, format `XX-9999` (e.g. `KB-1001`) |
| `name` | string | Human-readable product name |
| `category` | string | One of: peripherals, displays, accessories, audio, furniture, cables, storage |
| `price` | number | Unit price |
| `stock` | number | Units currently on hand |
| `reorderLevel` | number | Restock threshold — at or below this, the item needs reordering |

The data is entirely synthetic. There is no real business, no PII, no secrets.

## The API your server should wrap

`app/src/catalog.ts` exports pure functions; `app/src/loader.ts` reads the JSON.
Both are re-exported from `app/src/index.ts`, which compiles to
`app/dist/index.js`:

```ts
loadCatalog(): Product[]                              // reads catalog.json
searchProducts(catalog: Product[], query: string)     // name | sku | category, case-insensitive
findBySku(catalog: Product[], sku: string)            // exact sku, case-insensitive
lowStock(catalog: Product[]): Product[]               // stock <= reorderLevel, lowest first
categories(catalog: Product[]): string[]              // unique, sorted
inventoryValue(catalog: Product[]): number            // sum(price * stock), 2dp
```

**Do not reimplement this logic inside the MCP server.** Import it. A real MCP
server is a thin protocol adapter over existing domain code — that is the whole
point, and it is what makes the server trustworthy: the business rules stay in
one tested place.

Run `cd app && npm install && npm run build` once, so `app/dist/` exists for
your server to import.

## Why this domain

An LLM cannot answer *"which items need reordering?"* or *"what is our total
inventory value?"* by reasoning — the numbers live in a file it would have to
read and correctly aggregate. That makes it an honest test of whether a tool
call actually changed the outcome (Task D).

## Suggested shape for your server

Not prescriptive — but a natural mapping is:

- **tool** `search_inventory(query)` → `searchProducts`
- **tool** `check_stock(sku)` → `findBySku`, reporting stock vs reorder level
- **tool** `low_stock()` → `lowStock` (optional third)
- **resource** `inventory://catalog` → the catalog, or a summary of it
  (categories + product count + total value) so a client can read state
  without calling a tool

Remember the distinction: **tools** are model-invoked actions; **resources** are
application-readable context. Deciding which of your capabilities is which is
part of the exercise.
