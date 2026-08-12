# UDC Workshop 6 — MCP (Model Context Protocol)

Домашнє завдання: підключити публічні MCP-сервери з безпечним скоупінгом,
зібрати **власний MCP-сервер** над засіяним каталогом товарів, описати
threat model і довести A/B-тестом, що сервер реально змінив результат.

👉 **Повні інструкції — [`docs/walkthrough.md`](docs/walkthrough.md)**

## Швидкий старт

```bash
gh repo fork koldovsky/2026-udc-06-mcp-hw --clone
cd 2026-udc-06-mcp-hw
git checkout -b ws06/<github-username>

cd app && npm install && npm test && npm run build && cd ..
```

`npm test` має бути зеленим (8 тестів), а `npm run build` — створити
`app/dist/`, з якого ваш MCP-сервер імпортуватиме доменні функції.

## Що вже є в репо

| Шлях | Що це |
|---|---|
| `app/src/catalog.ts` | Чисті доменні функції — **не реалізовуйте їх заново в сервері, імпортуйте** |
| `app/src/loader.ts` | `loadCatalog()` — єдиний доступ до файлової системи |
| `app/data/catalog.json` | 24 синтетичні товари. **Не редагувати** — це ground truth для Task D |
| `app/AGENTS.md` | Baseline для `app/`; Task A додає сюди секцію `## MCPs` |
| `materials/domain-brief.md` | Що саме має виставляти ваш сервер |
| `materials/ab-question.md` | Фіксований промпт для A/B + як порахувати правильну відповідь |
| `docs/templates/` | Шаблони: `servers.md`, `SECURITY.md`, `ab-validation.md`, `task-e-bonus.md`, скелет сервера |
| `.env.example` | Зразок для секретів — реальний `.env` у `.gitignore` |

## Що створюєте ви

- `.mcp.json` / `.cursor/mcp.json` — конфіг підключених серверів (Task A)
- `docs/mcp/servers.md` — що підключено, з якою областю доступу (Task A)
- `app/AGENTS.md` → секція `## MCPs` (Task A)
- `mcp-server/` — власний сервер, ≥2 tools + ≥1 resource (Task B)
- `docs/mcp/SECURITY.md` — threat model (Task C)
- `docs/ab-validation.md` — A/B-порівняння (Task D)
- `docs/task-e-bonus.md` — бонус, один шлях (Task E)

## Головне правило безпеки

Жодних реальних секретів у репозиторії. Токени — лише через `${ENV_VAR}` у
конфізі, значення — у `.env`, який гітігнориться. Перед PR:

```bash
git grep -nE "ghp_|github_pat_|sk-" || echo "clean"
```
