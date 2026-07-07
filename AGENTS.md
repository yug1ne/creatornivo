<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
# Creatornivo — Правила работы Grok Build (AGENTS.md)

## 1. Главная цель и философия проекта
Creatornivo — честный Early Access продукт.  
Доверие строится на **рабочем коде**, прозрачных лимитах, реальной поддержке и честном описании статуса Beta/Early Access.  
**Строго запрещено**: fake testimonials, fake ratings, fake counters, fake scarcity, недоказуемые обещания скорости/конверсии/экономии времени.

## 1.1 Важные соглашения проекта (Project Conventions)

> **Основной домен проекта: `creatornivo.com`** (канонический хост: `www.creatornivo.com`).

При генерации **любого** контента — примеров, URL, картинок, скриншотов, иллюстраций, mockup-адресной строки — **всегда** используй `creatornivo.com`.

**Запрещено:** `app.creatornivo.com` и любые выдуманные поддомены (`app.`, `staging.` и т.п.) в пользовательском контенте.

Перед коммитом маркетингового/UI-контента проверяй: `rg "app\.creatornivo" src/` — **0 совпадений**.

## 1.2 Текущий фокус разработки (Июль 2026)

> **Приоритет сейчас — качество опыта существующих и новых пользователей**, а не добавление большого количества нового функционала.

Технический фундамент в основном закрыт: бэкапы + DR, Sentry, Health Check, серверные квоты генераций, privacy (export/delete), password reset, Logout в protected-зоне.

**Активные направления:**

| Направление | Что делать |
|-------------|------------|
| **Полировка UX** | Тексты, empty/error states, консистентность UI, мелкие friction points в Dashboard/Generate/Library/Settings. |
| **Onboarding и удержание** | Доработка tour для новых пользователей: register → first template → first generation → save to library. |
| **Email-коммуникация** | Базовые transactional emails: welcome, Pro purchase confirmation, quota warning (80%/100%). |

**Не приоритет сейчас:** кастомные шаблоны, one-time generation packs, analytics/SEO, глубокое stress-тестирование генераций на production (отложено — риск расходов и нагрузки). См. `roadmap.md` → Backlog.

**Blockers для Live** (параллельно, не перескакивать): auth incident monitoring (этап 1), Paddle Live (8), controlled purchase test (9), legal review (7).

## 2. Обязательный безопасный workflow (выполнять всегда)

**Никогда не делай изменения "одним махом".** Проект сложный и важный.

**Обязательная последовательность для любой задачи:**

1. **Анализ** — полностью изучи текущий код, состояние и roadmap.
2. **План** — предложи подробный план (что, где, почему, какие риски).
3. **Подтверждение** — **жди явного одобрения** пользователя:
   - "одобряю"
   - "приступай"
   - "да, делай этот план"
   - "можно реализовывать"
4. **Реализация** — только после подтверждения.
5. **Тестирование** — обязательно после каждой завершённой задачи/подзадачи.
6. **Верификация** — проверь, что изменения соответствуют roadmap и не сломали существующее.
7. **Фиксация** — чистый коммит + обновление roadmap при необходимости.

**Для сложных задач (auth, payments, privacy, infrastructure) — Plan Mode обязателен.**

## 3. Текущие приоритеты (из раздела 10 roadmap)

Выполнять **строго по порядку**. Не перескакивать.

| Этап | Задача                                      | Приоритет     | Статус     | Примечание |
|------|---------------------------------------------|---------------|------------|----------|
| 0    | Опубликовать auth diagnostics               | —             | DONE       | `b643e35` на production; smoke test A/C/B PASS (2026-07-04) |
| 1    | Воспроизвести login incident + найти root cause | СЕЙЧАС    | IN PROGRESS | NOT REPRODUCED in controlled test (3/3); мониторинг реальных инцидентов |
| 2    | Исправить подтверждённую причину auth       | BLOCKER       | BLOCKER    | После этапа 1 |
| 3    | Password reset + auth rate limiting         | HIGH          | DONE       | 2026-07-05: forgot/reset, Resend, Upstash limits, 20/20 tests PASS |
| 4    | Account deletion + personal-data export     | BLOCKER       | DONE       | 4.1–4.4 DONE 2026-07-05: export, delete, UI polish, legal copy, runbook §13 |
| 5    | Backups + restore drill                     | BLOCKER       | DONE       | 2026-07-06: GitHub Actions → R2, drill PASS; R2 Lifecycle rule — вручную (roadmap §14) |
| 6    | Monitoring + global OpenAI budget           | HIGH          | PARTIAL    | Sentry + `/api/health` DONE; global OpenAI budget breaker — pending |
| 7    | Legal owner review                          | REVIEW        | -          | - |
| 8    | Paddle Live onboarding                      | BLOCKER       | BLOCKER    | Domain, keys, webhook |
| 9    | Controlled Live purchase + refund test      | BLOCKER       | BLOCKER    | Реальная проверка |
| 10   | Resources + branded UX                      | После blockers| -          | - |

**Текущий фокус сессии**: UX-полировка, onboarding, email-уведомления (см. §1.2). Auth incident — мониторинг (этап 1). Blockers Live — этапы 7–9.

## 4. Правила по ключевым областям

### Auth и immediate-login incident
- Мониторинг реальных инцидентов (этап 1); не блокирует UX-работу, но этап 2 — BLOCKER при подтверждённом root cause.
- Сначала опубликовать диагностику (staged файлы), потом воспроизводить баг в production.
- Никогда не добавлять `setTimeout`, искусственные retry или костыли вместо исправления настоящей причины.
- Возможные причины (проверять по логам): `database_error/P2024`, `user_not_found`, `bcrypt_mismatch`, JWT/session error.
- После любого изменения в auth — обязательное ручное тестирование сценария "register → logout → immediate login".

### Paddle и платежи
- Сейчас работаем только в **Sandbox**.
- **Cancel subscription** ≠ **Refund**. Это разные процессы.
- Перед переходом на Live обязательно:
  - Отдельные Live Product/Price/API keys/webhook
  - Реальный end-to-end тест покупки + возврата
- Никогда не смешивать Sandbox и Live значения в коде/конфигах.

### Privacy и операции (BLOCKER для Live)
- Account deletion и Personal data export — критичные задачи.
- Нужен проверяемый workflow + identity verification.
- Регулярные backups + restore drill — обязательно перед Live.
- Error monitoring и алерты без промпт-контента.

### Backup Pipeline (этап 5 — DONE 2026-07-06)

**Скрипты:** `scripts/backup/`
| Файл | Назначение |
|------|------------|
| `backup.sh` / `backup.ps1` | `pg_dump` → age encrypt → upload R2; `--prune-only` / `-PruneOnly` для fallback retention |
| `restore.sh` / `restore.ps1` | Скачать из R2, расшифровать, `pg_restore` |
| `drill.sh` / `drill.ps1` | Restore drill в локальный Docker PostgreSQL + проверка counts |
| `lib/common.sh` / `lib/common.ps1` | Shared helpers (R2, checksum, prune, docker psql) |

**GitHub Actions:** `.github/workflows/database-backup.yml`
- Cron: `0 3 * * *` UTC + `workflow_dispatch`
- Секреты: `BACKUP_DATABASE_URL`, `BACKUP_AGE_PUBLIC_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- При неудаче: job `notify-failure` создаёт GitHub Issue `[backup-failure] ...` — временный алерт до Sentry

**Хранение:**
- Бэкапы: Cloudflare R2, prefix `daily/YYYY/MM/DD/`, файлы `*.dump.age` + `.sha256`
- Retention 30 дней: **R2 Lifecycle rule** (основной, настроить вручную — `roadmap.md` §14) + скриптовый prune (fallback)
- **Приватный age-ключ:** только локально / оффлайн (password manager, USB). **Никогда** в git, Vercel, GitHub Secrets
- **Публичный age-ключ:** GitHub Secrets (`BACKUP_AGE_PUBLIC_KEY`) — только для шифрования в CI

**При ошибке бэкапа:**
1. Проверить failed workflow run в Actions
2. Проверить open Issue с префиксом `[backup-failure]`
3. Следовать `roadmap.md` §14 (*Что делать при ошибке backup*)
4. Экстренный ручной backup: `scripts/backup/backup.sh` с env vars
5. После fix — re-run workflow; при пропуске >24h — restore drill (`drill.ps1`)

**Restore drill (последний PASS 2026-07-06):** User 13, Generation 1, Subscription 4, `_prisma_migrations` 12. Предупреждения `supabase_vault` при локальном restore — норма.

### Генерации и лимиты
- Free: 5 генераций в UTC-день
- Pro: 100 генераций в UTC-месяц
- Учёт только при `status = completed` ИЛИ `startedAt IS NOT NULL`
- Ошибки до `startedAt` не должны тратить квоту.

### Общие технические правила
- TypeScript strict + ESLint — прогонять после любых изменений.
- Перед коммитом: `git diff --check`, `git diff --cached --check`.
- Не коммитить: `.env`, реальные ключи, `DATABASE_URL`, password hashes, session tokens, полные Paddle ID в публичных местах.
- Не коммитить backup-артефакты: `backup-key.txt`, `*.dump`, `*.dump.age`, `*.age`, `restore-work/`.
- После деплоя на Vercel — обязательный ручной smoke test.

## 5. Правила тестирования (обязательно после каждой задачи)

- После каждой завершённой подзадачи/задачи — **тестировать**.
- Для auth: ручное воспроизведение сценариев + проверка логов `[auth-diagnostic]`.
- Для Paddle: проверка webhook, created/activated с одинаковым timestamp, cancel subscription, update payment method.
- Для privacy: проверка workflows удаления и экспорта данных.
- Если есть regression-тесты — прогонять их.
- Фиксировать результаты тестирования в ответе.

## 6. Как работать с roadmap

- Всегда держи в голове актуальную версию `Creatornivo_Status_Roadmap_2026-07-04_v1.1.pdf`.
- При начале работы читай разделы: 3 (что уже реализовано), 7 (auth), 8 (что предстоит), 9 (инфраструктура), 10 (приоритетная roadmap), 11 (чек-листы).
- После значимых изменений предлагай обновить roadmap/journal.

## 7. Формат ответов

Когда предлагаешь план — используй структуру:

**План действий:**
- Что будет сделано
- Какие файлы затронуты
- Пошаговый порядок
- Риски / что может сломаться
- Что нужно проверить после реализации
- Запрос подтверждения: "Одобряешь этот план?"

Только после твоего "одобряю" переходить к реализации.

---

**Это живой документ.** При необходимости я буду обновлять его вместе с тобой по мере продвижения по roadmap.
<!-- END:nextjs-agent-rules -->
