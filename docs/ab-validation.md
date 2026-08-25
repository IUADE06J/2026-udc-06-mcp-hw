# A/B-валідація MCP (Task D)

**Промпт (однаковий для A і B):**

```
Which products in our catalog need reordering right now, and what is the
total value of the stock we are currently holding? Give me the SKUs and
the total as a number.
```

**Хост / модель:** Cursor / Cursor Grok 4.6  
**Сервер під тестом:** `mcp-server/` (`search_inventory`, `check_stock`, `low_stock`, resource `inventory://catalog`)  
**Дата прогонів:** 2026-08-24. A — цей чат із увімкненим `catalog`. B — окремий новий чат після вимкнення `catalog`.

## Ground truth

Порахований локально, щоб було з чим звіряти:

```
SKU, що потребують дозамовлення: DK-4001, WC-8002, DS-6002, MS-2001, MN-3002, HS-5002, SS-1102, KB-1002, CB-7003
Загальна вартість запасів: 46152
```

Команда з `materials/ab-question.md` (з `app/`):

```bash
npm run build
node -e "import('./dist/index.js').then(m=>{const c=m.loadCatalog();console.log(m.lowStock(c).map(p=>p.sku).join(', '));console.log(m.inventoryValue(c));})"
```

Вивід: ті самі 9 SKU (порядок `lowStock`: найменший stock першим) і `46152`. Правило дозамовлення — `stock <= reorderLevel`; сума — `sum(price * stock)` по всіх 24 позиціях, округлення як у `inventoryValue`.

## Прогін A — MCP підключено

**Що зробив агент:**

1. `low_stock` на `catalog` (namespace `project-0-2026-udc-06-mcp-hw-catalog`), аргументи `{}`.
2. Читання resource `inventory://catalog` (той самий сервер) — зведення `productCount` / `categories` / `inventoryValue`.

`search_inventory` і `check_stock` не викликались: промпт питає весь список на reorder і одну суму, не пошук і не один SKU.

**Відповідь:**

SKU на дозамовлення (як повернув `low_stock`):  
`DK-4001`, `WC-8002`, `DS-6002`, `MS-2001`, `MN-3002`, `HS-5002`, `SS-1102`, `KB-1002`, `CB-7003`.

Загальна вартість запасів (з `inventory://catalog`): **46152**.

**Правильно?** Так. 9 SKU і сума збігаються з ground truth. Агент не рахував `price * stock` сам.

## Прогін B — MCP вимкнено

**Як саме вимикали:** `catalog` вимкнено в хості, далі **новий чат** (не продовження сесії A). Старий чат з живими catalog-tools не використовували. Після запису `catalog` знову потрібен у `.cursor/mcp.json` для Task B.

**Що зробив агент:** не відмовився і не видав правдоподібну вигадку. Відповідь називає правило `stock <= reorderLevel` і `sum(price × stock)` по 24 позиціях seeded-каталогу — тобто агент мав дані каталогу (файл / filesystem), не tools `low_stock` / `inventory://catalog`. Лог викликів того чату сюди не копіювали, лише фінальний текст.

**Відповідь** (дослівно з того чату):

```
Need reordering now (stock <= reorderLevel):

DK-4001, WC-8002, DS-6002, MS-2001, MN-3002, HS-5002, SS-1102, KB-1002, CB-7003

Total value of stock currently held: 46152

That is sum(price × stock) across all 24 products in the seeded catalog.
```

**Правильно?** Так. Ті самі 9 SKU (той самий порядок, що `lowStock`) і сума **46152**.

## Таблиця відмінностей

| Аспект | A (з MCP) | B (без catalog, новий чат) |
|---|---|---|
| Викликав tool | так: `low_stock` + resource `inventory://catalog` | ні catalog; відповідь з даних seeded-каталогу (файл), не з наших tools |
| Список SKU повний | так, 9 SKU | так, ті самі 9 SKU в тому ж порядку |
| Загальна сума точна | так, 46152 з resource | так, 46152 |
| Скільки кроків знадобилось | 2 MCP-виклики, без арифметики в моделі | окремий чат; агент сам застосував правило і суму |
| Впевненість відповіді vs її правильність | висока: цифри з `app/` (`lowStock` / `inventoryValue`) | теж правильна; правило відтворює модель, не сервер |

## Висновок

MCP **не змінив правильність**: A (з `catalog`) і B (новий чат без `catalog`) обидва дали 9 SKU і **46152**. Це чесний нульовий результат.

Різниця лише в шляху. A бере правило з протестованого `app/`. B без сервера все одно дістався тих самих чисел, бо `catalog.json` лишається доступним (filesystem / читання файлу). Поки агент бачить JSON і коректно агрегує, власний сервер не дає унікального доступу — він дає стабільний API і менше шансів помилитись у `stock <= reorderLevel`. Він вартий ціни, коли файлу немає в скоупі, правило складніше за один JSON, або filesystem write-tools занадто широкі. У цьому репо вузький `app/data` уже достатній, щоб відповісти без `mcp-server/`.
