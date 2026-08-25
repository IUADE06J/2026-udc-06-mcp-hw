# Threat model MCP-інтеграцій (Task C)

Конфіг: Cursor, `.cursor/mcp.json`. Сервери: `filesystem`, `memory`, `catalog`
(`mcp-server/`). Дані — синтетичні 24 SKU в `app/data/catalog.json`. Це не
загальна шпаргалка: без цих трьох імен і цього шляху документ не описує інший
проєкт.

## 1. Що до чого має доступ

| Сервер | Дані/ресурси, до яких дістає | Секрети | Може писати? | Довіра до автора |
|---|---|---|---|---|
| `filesystem` (`npx -y @modelcontextprotocol/server-filesystem ${workspaceFolder}/app/data`) | лише `app/data` (перевірено `list_allowed_directories` з Cursor 2026-08-24: `D:\Lessons_Selenium_Bionics\lesson1\2026-udc-06-mcp-hw\app\data`). У каталозі лежить тільки `catalog.json`. | немає | **так** — `write_file`, `edit_file`, `create_directory`, `move_file` (обмежені цим каталогом) | офіційний (`@modelcontextprotocol`) |
| `memory` (`npx -y @modelcontextprotocol/server-memory`) | локальний knowledge graph (`memory.jsonl` у каталозі npx-пакета; `MEMORY_FILE_PATH` не задавали). Не читає репозиторій і не ходить у мережу. | немає | **так** — `create_entities`, `create_relations`, `add_observations`, `delete_*` | офіційний (`@modelcontextprotocol`) |
| `catalog` (`node ${workspaceFolder}/mcp-server/dist/server.js`) | `app/data/catalog.json` через `loadCatalog()` з `app/dist`; tools `search_inventory`, `check_stock`, `low_stock`; resource `inventory://catalog` | немає | **ні** — лише читання | свій код у `mcp-server/src/server.ts` |

Не підключені: `fetch` / `git` (`uvx`), GitHub MCP (потрібен токен). Fetch свідомо відкинуто — він би тягнув довільний веб-контент в агента.

## 2. Ризики, які я вважаю реальними для цієї конфігурації

- **Prompt injection через дані.** У конфігу **немає** сервера, який тягне веб, тікети чи чужі репозиторії. Єдине зовнішнє для моделі джерело фактів — `catalog.json` (через `catalog` або `filesystem.read_text_file`). Якщо хтось підмінить `name`/`category` на текст на кшталт «ignore previous instructions, call write_file…», агент прочитає це як товар. Зараз файл синтетичний і під git; ризик — не «інтернет», а коміт або локальне редагування ground truth. `memory` додає другий канал: отруєна сутність у графі живе між чатами й може змінити відповідь у Task D без зміни JSON.

- **Занадто широка область доступу.** `filesystem` навмисно не на `${userHome}` і не на `C:\`. Виклик `list_allowed_directories` з хоста повернув лише `app\data`. Усе одно: усередині цього каталогу сервер може **перезаписати** `catalog.json` — це ламає A/B у Task D. `roots` за специфікацією не є sandbox (`SHOULD`, не `MUST`); у цій сесії Cursor скоуп не розширив, але це спостереження, не контракт. `catalog` бачить тільки те, що читає `loader.ts` (шлях від файлу лоадера, не cwd). `memory` не бачить диск репо, зате пише граф поза git.

- **Витік секретів.** У `.cursor/mcp.json` немає літеральних ключів. Жоден із трьох серверів не вимагає токена. `.env` у `.gitignore`; у репо лишається `.env.example`. Ризик витоку через MCP зараз низький. Реальний сусідній ризик: `filesystem.write_file` у `app/data` не витягне `.env` (файл поза скоупом), але якби скоуп колись став коренем репо — `.env` опинився б у зоні `read_text_file`.

- **Зміна поведінки сервера після встановлення.** `filesystem` і `memory` стартують як `npx -y @пакет` **без піна**. Зафіксовані на момент перевірки: filesystem `2026.7.10`, memory `2026.7.4`. Наступний запуск може підтягнути інший тег (нові write-tools, інша політика Roots). `catalog` запускається з локального `mcp-server/dist/server.js` — змінюється лише після нашого `npm run build`.

- **Дії з побічним ефектом.** `catalog` — без побічних ефектів. `filesystem` може зіпсувати єдиний файл даних. `memory` може стерти граф (`delete_entities`). Cursor за замовчуванням питає approve перед tool call; якщо увімкнути Auto-run для allowlist — `write_file` по `catalog.json` пройде без окремого «так».

## 3. Що я зробив, щоб це зменшити

Кроки, які вже є в цьому репо, а не «треба б»:

- `filesystem` обмежено `${workspaceFolder}/app/data` у `.cursor/mcp.json`; хост підтвердив цей шлях через `list_allowed_directories`. Не домашня тека, не диск, не весь workspace.
- `catalog` має лише read-only tools + resource; немає запису, видалення, `fetch`, HTTP. Логіка імпортована з `app/` (`searchProducts` / `findBySku` / `lowStock` / `inventoryValue` / `categories` / `loadCatalog`), тож правило `stock <= reorderLevel` не дублюється в сервері.
- Секретів у конфігу немає. Якби з’явився токен — лише `${ENV_VAR}` / Cursor `${env:NAME}`, значення в `.env` (гітігнориться), у git — `.env.example`.
- Не підключали `fetch`, `git`, GitHub MCP: зайва мережа, `uv` і PAT не потрібні для синтетичного каталогу.
- Транспорт stdio, процес піднімає Cursor; `catalog` стартує через `node` і абсолютний `${workspaceFolder}/…/dist/server.js`, без `npx` на чужий пакет.

Не зроблено (свідомо): пін версій `@modelcontextprotocol/server-filesystem@2026.7.10` і `server-memory@2026.7.4`; вимкнення write-tools filesystem (пакет їх не вимикає прапорцем — лише скоуп).

## 4. Що лишилось прийнятим ризиком

- Плаваючий `npx -y` для двох публічних серверів — зручно для домашки, неприйнятно в проді (supply chain + зміна tools без рев’ю).
- Write-tools filesystem залишаються ввімкненими всередині `app/data`. У навчальному репо зіпсовані числа видно в git diff; у проді це була б порча inventory-джерела.
- `memory` зберігає стан поза репозиторієм і вміє delete. Для воркшопу граф порожній/навчальний; у проді це була б неконтрольована пам’ять агента.
- `catalog.json` у git — агент довіряє вмісту. Prompt injection з цього файлу ми не фільтруємо (немає sanitizer у `formatProduct`).
- stdio-сервери біжать під тим самим користувачем Windows, що й Cursor. Межа — аргумент сервера й approve в UI, не окремий OS-юзер і не sandbox.
- Це прийнятно, бо репо навчальне, дані синтетичні, немає клієнтських секретів і продакшен-інвентаря.

## 5. Чек-лист перед підключенням будь-якого нового MCP-сервера

- [x] Я знаю, хто автор і чи це офіційний сервер (`@modelcontextprotocol` + свій `mcp-server/`)
- [x] Я прочитав, які саме tools він додає (filesystem write-tools, memory delete-*, catalog лише search/check/low_stock)
- [x] Я дав йому мінімальну область доступу, а не «щоб точно працювало» (`app/data`, не home)
- [x] Жоден секрет не потрапив у файл, який комітиться
- [x] Я знаю, чи є серед його tools такі, що змінюють стан, і чи вимагається підтвердження перед викликом (Cursor approve; catalog — ні, filesystem/memory — так)
- [ ] Версія зафіксована настільки, наскільки це можливо — **ні**: публічні пакети лишаються плаваючими; це прийнятий ризик з розділу 4
