# MCP-сервер над каталогом (Task B)

Тонкий protocol-адаптер над доменом із `app/`. Read-only.

```bash
cd app && npm install && npm run build   # спершу! сервер імпортує app/dist
cd ../mcp-server && npm install && npm run build
node ./dist/server.js                    # має «висіти», чекаючи JSON-RPC у stdin
```

## Що віддає

| | Назва | Що робить |
|---|---|---|
| tool | `search_inventory(query)` | → `searchProducts` |
| tool | `check_stock(sku)` | → `findBySku`, stock проти reorderLevel |
| tool | `low_stock(limit?)` | → `lowStock` |
| resource | `inventory://catalog` | `categories` + `inventoryValue` + список SKU на дозамовлення |

Уся логіка **імпортована** з `app/dist/index.js`. У цьому файлі немає жодного
бізнес-правила: ні фільтра `stock <= reorderLevel`, ні суми `price * stock`.

Read-only структурно: жоден tool не приймає шляху, не пише на диск і не
ходить у мережу. Усі три марковані `readOnlyHint: true`.

---

## 🔧 Правки до скелета з `docs/templates/mcp-server/`

Скелет **не збирався й не запускався** автором до публікації (так і сказано в
його шапці). Ось що виявилось при реальному прогоні на
`@modelcontextprotocol/server@2.0.0` + `zod@4.4.3`, Node 24.

### 1. 🔴 Критично: сервер компілювався, але падав при старті

Це єдина справжня помилка, і вона підступна тим, що **`npm run build`
проходить без жодного попередження**.

Скелет кладе `server.ts` у корінь пакета, а збирає в `dist/`:

```
mcp-server/server.ts        ->  mcp-server/dist/server.js
```

Імпорт у джерелі — `from "../app/dist/index.js"`. **TypeScript ніколи не
переписує відносні шляхи**: рядок потрапляє в `dist/server.js` дослівно. Але
файл тепер лежить на один рівень глибше, тож той самий рядок означає вже
`mcp-server/app/dist/index.js`, якого не існує:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '...\mcp-server\app\dist\index.js'
  imported from '...\mcp-server\dist\server.js'
Did you mean to import "../../app/dist/index.js"?
```

Чому `tsc` мовчить: із-за меж `rootDir` читається лише `app/dist/index.d.ts`,
а `.d.ts` не емітується — отже правило «файл поза rootDir» не порушено.
Помилка існує тільки в рантаймі. Класичний false green.

**Виправлення** — зрівняти глибину джерела й виводу, щоб один і той самий
відносний шлях був правильним в обох:

```diff
- mcp-server/server.ts
+ mcp-server/src/server.ts

  // tsconfig.json
-   "rootDir": ".",
-   "include": ["*.ts"]
+   "rootDir": "src",
+   "include": ["src/**/*.ts"]

  // server.ts
- from "../app/dist/index.js"
+ from "../../app/dist/index.js"
```

Тепер `src/` і `dist/` — сусіди, і `../../app/dist/index.js` вірний і під час
компіляції, і під час виконання. Альтернатива — додати `"udc-ws06-app":
"file:../app"` у залежності й імпортувати за іменем пакета (`app/package.json`
вже має відповідний `exports`), але це важча зміна.

### 2. ✅ Решта припущень скелета виявились ПРАВИЛЬНИМИ

Перевірено по `.d.mts` встановленого пакета, не по документації:

| Припущення скелета | Вердикт |
|---|---|
| Пакет `@modelcontextprotocol/server@^2.0.0` існує | ✅ `2.0.0` — реліз, не pre-release |
| `import { McpServer } from "@modelcontextprotocol/server"` | ✅ експортується з головного входу |
| `import { StdioServerTransport } from ".../server/stdio"` | ✅ subpath `./stdio` є в `exports`, клас експортується |
| `server.connect(transport)` | ✅ `connect(transport: Transport): Promise<void>` |
| `registerTool(name, {description, inputSchema}, handler)` | ✅ і саме `inputSchema: z.object({...})` — **не** raw JSON Schema |
| `import * as z from "zod/v4"` | ✅ subpath `./v4` є в exports zod 4.4.3 |
| top-level `await` | ✅ ESM + NodeNext |

Уточнення до застереження скелета «`StdioServerTransport` vs `serveStdio`»:
**обидва існують** і обидва експортуються з `@modelcontextprotocol/server/stdio`.
Це не «одне з двох застаріле» — це два різні входи. Перевірено обидва: при
відкритті з'єднання звичайним `initialize` вони поводяться однаково.

### 3. ℹ️ Дрібніші уточнення (не помилки скелета)

- **`capabilities` не треба вказувати вручну.** Docstring `serveStdio` у SDK
  показує `new McpServer({...}, { capabilities: { tools: {} } })`, тож виникає
  підозра, що голий однааргументний конструктор зі скелета недостатній. Це не
  так: `registerTool`/`registerResource` вмикають capabilities самі. Виміряно —
  відповідь на `initialize`:
  `"capabilities":{"tools":{"listChanged":true},"resources":{"listChanged":true}}`.
- **`registerResource` — 4 аргументи:** `(name, uriOrTemplate, config, cb)`.
  Скелет лишав це як TODO і не помилявся; форма повернення `{ contents: [{ uri,
  text }] }` теж правильна. `ResourceTemplate` (для динамічних URI) експортується
  з **головного** входу, а не з `/stdio`.
- **`server/discover` не працює** ні тут, ні через `serveStdio`, якщо
  з'єднання відкрито звичайним `initialize` — обидва дають
  `{"code":-32601,"message":"Method not found"}`. Правильний метод для stdio —
  `tools/list`. Типи `DiscoverRequest`/`DiscoverResult` в SDK експортуються, але
  належать до «модерної» ери, у яку класичний `initialize`-хендшейк не
  переводить.
- Узгоджений `protocolVersion` — `2025-11-25` (`LATEST_PROTOCOL_VERSION`),
  при тому що `DEFAULT_NEGOTIATED_PROTOCOL_VERSION` = `2025-03-26`.

## Перевірка

```bash
# незалежним клієнтом, без браузера — див. docs/task-e-bonus.md
npx -y @modelcontextprotocol/inspector --cli node ./dist/server.js --method tools/list
npx -y @modelcontextprotocol/inspector --cli node ./dist/server.js --method resources/list
```
