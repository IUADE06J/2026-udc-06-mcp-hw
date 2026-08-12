// Pure catalog logic. No I/O here — this is the domain an MCP server wraps.
// Keep these signatures stable: the MCP server in `mcp-server/` imports them.

export interface Product {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  reorderLevel: number;
}

/** Case-insensitive match on name, sku, or category. Empty query returns everything. */
export function searchProducts(catalog: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...catalog];
  return catalog.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q),
  );
}

export function findBySku(catalog: Product[], sku: string): Product | undefined {
  const target = sku.trim().toUpperCase();
  return catalog.find((p) => p.sku.toUpperCase() === target);
}

/** Items at or below their reorder level — the question the AI cannot answer by guessing. */
export function lowStock(catalog: Product[]): Product[] {
  return catalog
    .filter((p) => p.stock <= p.reorderLevel)
    .sort((a, b) => a.stock - b.stock);
}

export function categories(catalog: Product[]): string[] {
  return [...new Set(catalog.map((p) => p.category))].sort();
}

/** Total tied-up capital, rounded to cents. */
export function inventoryValue(catalog: Product[]): number {
  const total = catalog.reduce((sum, p) => sum + p.price * p.stock, 0);
  return Math.round(total * 100) / 100;
}
