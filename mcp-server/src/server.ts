/**
 * MCP server over the seeded catalog domain — Task B.
 *
 * Read-only: every tool and the single resource only READ the catalog.
 * There is no write, no delete, and no network call anywhere in this file.
 *
 * The catalog logic is IMPORTED from app/ — this file is a thin protocol
 * adapter and deliberately contains no business rules of its own.
 *
 * Verified against @modelcontextprotocol/server@2.0.0 + zod@4.4.3 on Node 24.
 * See ../docs/mcp/servers.md for the fixes applied to the original skeleton.
 */

import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

// NOTE: this file lives in `mcp-server/src/` and compiles to `mcp-server/dist/`.
// Those two directories are at the SAME depth, so this relative specifier
// resolves identically at compile time and at run time. The original skeleton
// put server.ts at the package root, which made the emitted path shift by one
// directory and fail at run time — see README for the full explanation.
import {
  loadCatalog,
  searchProducts,
  findBySku,
  lowStock,
  inventoryValue,
  categories,
} from "../../app/dist/index.js";

const server = new McpServer({
  name: "catalog-server",
  version: "1.0.0",
});

// ── Tool 1 ────────────────────────────────────────────────────────────────
server.registerTool(
  "search_inventory",
  {
    title: "Search inventory",
    description:
      "Search the product catalog by name, SKU, or category. Use when the " +
      "user asks what products exist, asks about a specific item, or wants " +
      "everything in a category. Returns SKU, name, category, price, stock.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Free-text match on product name, SKU, or category"),
    }),
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ query }) => {
    const results = searchProducts(loadCatalog(), query);
    return {
      content: [
        {
          type: "text" as const,
          text:
            results.length === 0
              ? `No products matched "${query}".`
              : results
                  .map(
                    (p) =>
                      `${p.sku} — ${p.name} (${p.category}) · ${p.price} · stock ${p.stock}`,
                  )
                  .join("\n"),
        },
      ],
    };
  },
);

// ── Tool 2 ────────────────────────────────────────────────────────────────
server.registerTool(
  "check_stock",
  {
    title: "Check stock for one SKU",
    description:
      "Report current stock for a single SKU against its reorder level. Use " +
      "when the user names a specific SKU and asks whether it is running low " +
      "or how many units are on hand.",
    inputSchema: z.object({
      sku: z.string().describe("Exact SKU, e.g. KB-1001 (case-insensitive)"),
    }),
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ sku }) => {
    const product = findBySku(loadCatalog(), sku);
    if (!product) {
      return {
        content: [
          { type: "text" as const, text: `No product with SKU "${sku}".` },
        ],
        isError: true,
      };
    }
    const needsReorder = product.stock <= product.reorderLevel;
    return {
      content: [
        {
          type: "text" as const,
          text:
            `${product.sku} — ${product.name} (${product.category})\n` +
            `stock ${product.stock} / reorder level ${product.reorderLevel}\n` +
            (needsReorder
              ? "NEEDS REORDERING (stock is at or below reorder level)"
              : "Stock is above the reorder level."),
        },
      ],
    };
  },
);

// ── Tool 3 ────────────────────────────────────────────────────────────────
server.registerTool(
  "low_stock",
  {
    title: "List items needing reorder",
    description:
      "List every product whose stock is at or below its reorder level, " +
      "lowest stock first. Use when the user asks what needs reordering, " +
      "what is running low, or what to restock. Authoritative — do not " +
      "estimate this from memory.",
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Return at most this many items (default: all)"),
    }),
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ limit }) => {
    const items = lowStock(loadCatalog());
    const shown = typeof limit === "number" ? items.slice(0, limit) : items;
    return {
      content: [
        {
          type: "text" as const,
          text:
            shown.length === 0
              ? "Nothing is at or below its reorder level."
              : `${items.length} item(s) need reordering:\n` +
                shown
                  .map(
                    (p) =>
                      `${p.sku} — ${p.name}: stock ${p.stock} <= reorder ${p.reorderLevel}`,
                  )
                  .join("\n"),
        },
      ],
    };
  },
);

// ── Resource ──────────────────────────────────────────────────────────────
// Application-controlled context read by URI. The model does not invoke it;
// the host reads it to put "state of the catalog" in front of the model.
server.registerResource(
  "catalog-summary",
  "inventory://catalog",
  {
    title: "Catalog summary",
    description:
      "Product count, categories, total inventory value, and the SKUs " +
      "currently at or below their reorder level.",
    mimeType: "application/json",
  },
  async (uri) => {
    const catalog = loadCatalog();
    const summary = {
      productCount: catalog.length,
      categories: categories(catalog),
      inventoryValue: inventoryValue(catalog),
      needsReorder: lowStock(catalog).map((p) => p.sku),
    };
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  },
);

// ── Connect ───────────────────────────────────────────────────────────────
// stdio: the HOST launches this process and talks over stdin/stdout.
// Nothing may be printed to stdout except protocol messages — log to stderr.
const transport = new StdioServerTransport();
await server.connect(transport);
