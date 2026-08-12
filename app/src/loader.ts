import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Product } from "./catalog.js";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Reads the seeded catalog from `app/data/catalog.json`.
 * Resolved relative to this file so it works no matter what the cwd is —
 * an MCP server is launched by the host, not from your terminal.
 */
export function loadCatalog(): Product[] {
  const path = resolve(here, "../data/catalog.json");
  return JSON.parse(readFileSync(path, "utf8")) as Product[];
}
