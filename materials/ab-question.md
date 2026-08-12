# A/B question (Task D)

Use **exactly this prompt**, unchanged, in both runs. Do not reword it between
run A and run B — a changed prompt invalidates the comparison.

---

```
Which products in our catalog need reordering right now, and what is the
total value of the stock we are currently holding? Give me the SKUs and
the total as a number.
```

---

## Why this prompt

It has a **single verifiable right answer** that cannot be produced by
plausible-sounding reasoning:

- "Needs reordering" = `stock <= reorderLevel` — 9 SKUs in the seeded data.
- "Total value" = `sum(price * stock)` across all 24 products — an exact number.

You can compute the ground truth yourself at any time:

```bash
cd app && npm run build
node -e "import('./dist/index.js').then(m=>{const c=m.loadCatalog();console.log(m.lowStock(c).map(p=>p.sku).join(', '));console.log(m.inventoryValue(c));})"
```

## Run A — MCP connected

Your custom server from Task B is registered and running. Ask the question in a
**new** chat. Record: did the agent call your tool(s)? Which ones? Was the
answer correct?

## Run B — MCP disconnected

Remove or disable your server in the MCP config (and restart the host so it
actually drops the connection — a stale session may still hold the tools). Ask
the **same** question in a **new** chat. Record what the agent did instead:
did it try to read the JSON file directly, did it guess, did it refuse, was the
arithmetic right?

## What to look for

The interesting result is not only "with MCP it was right". Note *how* the
failure mode looked without it — a wrong total, a partial SKU list, a plausible
but unverified answer, or an honest "I need to read the file". Any of these is
a legitimate finding as long as you report what actually happened.

If run B also gets it right (for example the agent reads `catalog.json` itself
and aggregates correctly), that is a **valid and interesting result too** —
report it honestly and say what that tells you about when an MCP server is
actually worth its cost. Do not manufacture a difference that did not occur.
