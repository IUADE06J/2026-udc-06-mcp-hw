/**
 * Read-only MCP adapter over the seeded catalog in `app/`.
 * Domain rules stay in `app/src/catalog.ts` — this file only speaks MCP.
 */

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";

import type { Product } from "../../app/dist/index.js";
import {
  loadCatalog,
  searchProducts,
  findBySku,
  lowStock,
  inventoryValue,
  categories,
} from "../../app/dist/index.js";

function formatProduct(p: Product): string {
  const needsReorder = p.stock <= p.reorderLevel;
  return [
    `${p.sku} — ${p.name}`,
    `category: ${p.category}`,
    `price: ${p.price}`,
    `stock: ${p.stock}`,
    `reorderLevel: ${p.reorderLevel}`,
    `needsReorder: ${needsReorder}`,
  ].join("\n");
}

function createCatalogServer(): McpServer {
  const server = new McpServer({
    name: "catalog-server",
    version: "1.0.0",
  });

  server.registerTool(
    "search_inventory",
    {
      title: "Search inventory",
      description:
        "Search the product catalog by name, SKU, or category (case-insensitive). " +
        "Use when the user asks which products exist, wants a list by category, " +
        "or looks up an item without an exact SKU. An empty query returns the full catalog.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("Free-text match on product name, SKU, or category"),
      }),
    },
    async ({ query }) => {
      const results = searchProducts(loadCatalog(), query);
      return {
        content: [
          {
            type: "text",
            text:
              results.length === 0
                ? `No products matched "${query}".`
                : results.map(formatProduct).join("\n\n"),
          },
        ],
      };
    },
  );

  server.registerTool(
    "check_stock",
    {
      title: "Check stock by SKU",
      description:
        "Look up one product by exact SKU (e.g. KB-1001, LP-9002) and report " +
        "on-hand stock versus its reorder level. Use when the user names a SKU " +
        "or asks whether a specific item needs restocking.",
      inputSchema: z.object({
        sku: z.string().describe("Exact product SKU, format XX-9999"),
      }),
    },
    async ({ sku }) => {
      const product = findBySku(loadCatalog(), sku);
      return {
        content: [
          {
            type: "text",
            text: product
              ? formatProduct(product)
              : `No product with SKU "${sku}".`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "low_stock",
    {
      title: "List items that need reordering",
      description:
        "Return every product whose stock is at or below its reorder level, " +
        "lowest stock first. Use when the user asks which items need reordering, " +
        "are out of stock, or are below the restock threshold. Does not guess — " +
        "uses the catalog rule stock <= reorderLevel.",
      inputSchema: z.object({}),
    },
    async () => {
      const items = lowStock(loadCatalog());
      return {
        content: [
          {
            type: "text",
            text:
              items.length === 0
                ? "No products are at or below their reorder level."
                : items.map(formatProduct).join("\n\n"),
          },
        ],
      };
    },
  );

  server.registerResource(
    "catalog",
    "inventory://catalog",
    {
      title: "Catalog summary",
      description:
        "Read-only snapshot of catalog state: product count, sorted categories, " +
        "and total inventory value (sum of price × stock). Use this for the " +
        "current holding value without scanning every SKU.",
      mimeType: "application/json",
    },
    async (uri) => {
      const catalog = loadCatalog();
      const summary = {
        productCount: catalog.length,
        categories: categories(catalog),
        inventoryValue: inventoryValue(catalog),
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

  return server;
}

serveStdio(createCatalogServer);
