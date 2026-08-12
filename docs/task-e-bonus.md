# Task E (bonus) — Шлях 2: MCP Inspector

Заповнено **один** шлях із трьох: Інспектор. Шляхи 1 (крос-хост) і 3 (сервер із
токеном) не виконувались — для першого потрібен другий живий хост, якого в
цьому середовищі немає, для другого немає жодного сервісу, чий токен я мав би
право сюди підключати. Лишаю їх порожніми свідомо, а не «наполовину».

## Що робив

`@modelcontextprotocol/inspector` зазвичай згадують як web-UI, і саме тому він
здається недоступним у headless-середовищі. Але в нього є **CLI-режим**
(`--cli`), який працює без браузера і робить рівно те, що потрібно для
перевірки: сам піднімає сервер, проводить handshake і викликає один метод.

```bash
cd mcp-server
npx -y @modelcontextprotocol/inspector --cli node ./dist/server.js --method tools/list
npx -y @modelcontextprotocol/inspector --cli node ./dist/server.js --method resources/list
npx -y @modelcontextprotocol/inspector --cli node ./dist/server.js \
  --method tools/call --tool-name check_stock --tool-arg sku=DK-4001
```

Цінність саме в тому, що це **незалежний клієнт**. До цього мій сервер
перевірявся моїм же скриптом — а це ризик, що я тестую власне непорозуміння
про протокол. Інспектор написаний тими ж людьми, що й SDK, і якби я
неправильно зрозумів формат відповіді, він би це показав.

## Що побачив

`tools/list` — усі три tools із описами, схемами й анотаціями:

```json
{
  "name": "low_stock",
  "title": "List items needing reorder",
  "description": "List every product whose stock is at or below its reorder level, lowest stock first. Use when the user asks what needs reordering, what is running low, or what to restock. Authoritative — do not estimate this from memory.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "limit": {
        "description": "Return at most this many items (default: all)",
        "type": "integer",
        "exclusiveMinimum": 0,
        "maximum": 9007199254740991
      }
    },
    "$schema": "https://json-schema.org/draft/2020-12/schema"
  },
  "annotations": { "readOnlyHint": true, "openWorldHint": false }
}
```

`resources/list`:

```json
{
  "resources": [
    {
      "name": "catalog-summary",
      "title": "Catalog summary",
      "uri": "inventory://catalog",
      "description": "Product count, categories, total inventory value, and the SKUs currently at or below their reorder level.",
      "mimeType": "application/json"
    }
  ]
}
```

`tools/call check_stock sku=DK-4001`:

```json
{
  "content": [
    {
      "type": "text",
      "text": "DK-4001 — USB-C Dock 11-port (accessories)\nstock 0 / reorder level 8\nNEEDS REORDERING (stock is at or below reorder level)"
    }
  ]
}
```

## Що завдяки цьому полагодив / дізнався

1. **Підтвердив, що зод-схема справді конвертується в JSON Schema.** Я передаю
   `z.object({...})` в `inputSchema`, і питання, чи хост побачить нормальну
   схему, а не порожній об'єкт, до цього лишалось відкритим. Інспектор показує
   `"type":"object"` з `properties`, `required` і `description` кожного поля —
   тобто модель отримає осмислену схему.
2. **Знайшов косметичну ваду власної схеми.** `z.number().int().positive()`
   з zod v4 дає `"maximum": 9007199254740991` — `Number.MAX_SAFE_INTEGER`
   просочується в публічну схему tool'а. Функціонально нешкідливо, але засмічує
   те, що бачить модель. Прибирається переходом на `z.int().min(1)`, якщо
   хочеться чистішої схеми. Лишив як є і фіксую свідомо.
3. **`readOnlyHint` реально доїжджає до клієнта.** Це не просто коментар у коді
   — анотація видима в протоколі, тож твердження про read-only з
   [`mcp/SECURITY.md`](mcp/SECURITY.md) можна перевірити ззовні, а не вірити
   мені на слово.
4. **Інспектор у `--cli` — придатний спосіб перевірити Task B без хоста.**
   Це знахідка для самого воркшопу: walkthrough пропонує Інспектор як бонусний
   шлях і мовчить про `--cli`, хоча саме він дає учаснику зробити пункт
   «переконайтесь, що tools з'явилися», навіть якщо з хостом не склалося.

## Висновок

Інспектор нічого не «полагодив» у сенсі падаючого багу — сервер уже працював.
Він зробив інше, важливіше: замінив моє власне твердження «сервер відповідає
правильно» на перевірку **незалежним клієнтом**. Для Task B це різниця між «я
написав тест на свій код своїм же розумінням протоколу» і «стороння реалізація
протоколу погоджується з моєю».
