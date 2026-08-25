# MCP-сервери проєкту (Task A)

**Хост(и), у якому налаштовано:** Cursor
**Файл конфігурації:** `.cursor/mcp.json`

---

## Сервер 1 — filesystem

| | |
|---|---|
| **Навіщо** | Дати агенту читати засіяний каталог `app/data/catalog.json` (24 синтетичні товари) без доступу до решти репозиторію, домашньої теки чи диска. Це вузький файловий скоуп для Task A і запасний шлях до даних у Task D, якщо власний сервер недоступний. |
| **Транспорт** | stdio |
| **Як запускається** | `npx -y @modelcontextprotocol/server-filesystem ${workspaceFolder}/app/data` |
| **Область доступу (scope)** | Лише `app/data` (Cursor підставляє `${workspaceFolder}`). Не репозиторій цілком, не `%USERPROFILE%`, не `C:\`. Цього достатньо: у каталозі лежить лише `catalog.json`. |
| **Секрети** | немає |
| **Версія** | плаваюча (`npx -y` без `@версії`) — свідомий компроміс для старту без lockfile; приймаємо ризик, що наступний запуск може підтягнути інший тег. Зафіксована під час перевірки: `2026.7.10`. |

**Які tools він дав агенту:** у Cursor (namespace `project-0-2026-udc-06-mcp-hw-filesystem`) видно, зокрема:

- `read_file` (deprecated; заміна — `read_text_file`)
- `read_text_file`
- `read_media_file`
- `read_multiple_files`
- `write_file`
- `edit_file`
- `create_directory`
- `list_directory`
- `list_directory_with_sizes`
- `directory_tree`
- `move_file`
- `search_files`
- `get_file_info`
- `list_allowed_directories`

Той самий набір дав і `tools/list` на процесі без хоста.

Серед них є write-tools (`write_file`, `edit_file`, `create_directory`, `move_file`). Вони обмежені `app/data`, але все одно ширші за read-only; тому власний сервер у Task B має бути окремо read-only.

**Перевірка, що працює:**

1. **Виклик з хоста Cursor** (цей чат, 2026-08-24): агент викликав `list_allowed_directories` без аргументів. Відповідь сервера дослівно:

   ```
   Allowed directories:
   D:\Lessons_Selenium_Bionics\lesson1\2026-udc-06-mcp-hw\app\data
   ```

   Cursor **не** підмінив скоуп на весь workspace через Roots: реальна межа збіглася з аргументом у `.cursor/mcp.json` (`${workspaceFolder}/app/data`).
2. Раніше, stdio-handshake без `capabilities.roots`: `list_directory` на цьому шляху повернув `[FILE] catalog.json`. У stderr:

   ```
   Secure MCP Filesystem Server running on stdio
   Client does not support MCP Roots, using allowed directories set from server args: [
     'D:\\Lessons_Selenium_Bionics\\lesson1\\2026-udc-06-mcp-hw\\app\\data'
   ]
   ```

   `roots` у специфікації — координація, не гарантія безпеки (`SHOULD`, не `MUST`; у ревізії `2026-07-28` механізм позначений deprecated). Справжня межа — права ОС / пісочниця процесу. У цій конфігурації хост поважає аргумент `app/data`.


---

## Сервер 2 — memory

| | |
|---|---|
| **Навіщо** | Локальний knowledge graph між чатами: зафіксувати факти про каталог (категорії, SKU з низьким стоком, висновки A/B), не ходячи в мережу і не вимагаючи токена. Другий npx-сервер без Python/`uv`, як радить walkthrough. |
| **Транспорт** | stdio |
| **Як запускається** | `npx -y @modelcontextprotocol/server-memory` |
| **Область доступу (scope)** | Лише локальний граф (типово `memory.jsonl` у каталозі пакета npx). Мережі немає. `MEMORY_FILE_PATH` не задавали — зайвий запис у workspace не потрібен. Граф не читає `catalog.json` і не замінює filesystem. |
| **Секрети** | немає |
| **Версія** | плаваюча (`npx -y`). Зафіксована під час встановлення пакета: `2026.7.4`. |

**Які tools він дав агенту:** з README опублікованого пакета `@modelcontextprotocol/server-memory@2026.7.4` (офіційний список API):

- `create_entities`
- `create_relations`
- `add_observations`
- `delete_entities`
- `delete_observations`
- `delete_relations`
- `read_graph`
- `search_nodes`
- `open_nodes`

Також є resource `memory://knowledge-graph`.

**Перевірка, що працює:** у цій сесії агента Cursor не віддав memory-tools у динамічний каталог (знову лише namespace `cursor`). Конфіг у `.cursor/mcp.json` є, пакет з npm підтягнувся (`2026.7.4`). Живий виклик `read_graph` / `create_entities` з хоста ще треба зробити після Enable сервера в Settings → MCP: записати одну сутність на кшталт `catalog_ground_truth` і прочитати її через `read_graph`. Поки хост не інжектував tools — стверджувати «агент викликав memory у чаті» було б неправдою.

---

## Сервер 3 — catalog

Власний сервер Task B (`mcp-server/`), той самий файл конфігу, що й публічні.

| | |
|---|---|
| **Навіщо** | Read-only доступ до каталогу через доменні функції `app/` (`searchProducts`, `findBySku`, `lowStock`, `categories`, `inventoryValue`), без переписування логіки в MCP-шарі. |
| **Транспорт** | stdio |
| **Як запускається** | `node ${workspaceFolder}/mcp-server/dist/server.js` |
| **Область доступу (scope)** | Визначає `loadCatalog()` у `app/` — читає лише `app/data/catalog.json` (шлях від файлу лоадера, не cwd). Мережі, інших каталогів і запису немає. |
| **Секрети** | немає |
| **Версія** | локальний білд `catalog-server` `1.0.0` (`mcp-server/dist/server.js`), не `npx`. Перед запуском потрібні `cd app && npm run build` і `cd mcp-server && npm run build`. |

**Які tools він дав агенту:** у Cursor (namespace `project-0-2026-udc-06-mcp-hw-catalog`):

- `search_inventory`
- `check_stock`
- `low_stock`

Resource: `inventory://catalog`. Усі — лише читання (немає write/delete/network tools).

**Перевірка, що працює:** хост викликав `check_stock` (`SS-1102`), `low_stock` (9 SKU) і читав `inventory://catalog` (`inventoryValue` 46152).

---

## Що НЕ підключали і чому

- **git** (`uvx`) і **fetch** (`uvx`) — з таблиці walkthrough. Потрібні Python + `uv`; ставити їх заради двох зайвих серверів не варто. Fetch ще й тягне довільний зовнішній контент (ризик prompt injection) — для синтетичного каталогу це зайва поверхня атаки.
- **GitHub / будь-який сервер із токеном** — для Task A ключ не потрібен; літеральний секрет у конфігу заборонений.
- **filesystem на `${userHome}` або на корінь диска** — свідомо відкинуто: це дірка, а не «зручний скоуп».

---

## Область доступу — головне

Filesystem навмисно звужено до `${workspaceFolder}/app/data`, а не до репозиторію, домашньої теки чи `C:\`. У цьому каталозі лежить лише `catalog.json` — ground truth для Task D; решта коду, `.env`, git-історія серверу не віддані.

Виклик `list_allowed_directories` з Cursor підтвердив саме цей шлях; Roots workspace не розширили скоуп. Аргумент у `mcp.json` тут збігся з реальною межею сервера, але це спостереження цієї сесії, а не гарантія специфікації.
