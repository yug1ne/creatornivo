## 3. Что уже реализовано

| Область                    | Состояние          | Комментарий |
|----------------------------|--------------------|-----------|
| Главная и Pricing          | DONE               | Публичный copy очищен от fake scarcity и недоказуемых claims. |
| Регистрация / вход         | DONE с оговоркой   | Credentials auth, bcrypt, auth diagnostics (`b643e35`), password reset и auth rate limiting (этап 3, 2026-07-05); этап 1 IN PROGRESS — мониторинг реальных инцидентов. |
| Dashboard                  | DONE               | Показывает текущий план и серверный usage. |
| Templates                  | DONE               | 15 templates, 8 доступны Free. |
| Generate                   | DONE               | Серверные квоты, idempotency, streaming; без OpenAI key — безопасный 503 generation_disabled. |
| Library                    | DONE частично      | Сохранение, поиск, просмотр и экспорт работают; удаления saved items пока нет. |
| Settings                   | DONE               | Тема, профиль, подписка, Customer Portal; Privacy & Data: export + delete + UI polish (4.1–4.3, 2026-07-05). |
| Onboarding и mobile header | DONE               | Burger, guest/auth меню, responsive, focus, backdrop, System theme. |
| Paddle Sandbox             | DONE               | Checkout, receipt, webhook, Pro, portal, update payment method, cancel at period end. |
| Refund/chargeback logic    | DONE технически    | Существующие handlers сохраняются и проходят regression suite; Live E2E ещё не выполнен. |
| Legal pages                | REVIEW             | Фактически улучшены, но не являются юридическим заключением. |
| Resources / Guides         | NOT ADDED          | Архитектура и список тем есть, страницы ещё не созданы. |
| Backups + Disaster Recovery | DONE (2026-07-06) | GitHub Actions → R2 (age-encrypted); restore drill PASS; R2 Lifecycle rule — настроить вручную (§14). |
| Sentry (error monitoring)  | DONE               | Server/edge/client SDK; tunnel route в middleware; без prompt content в событиях. |
| Health Check               | DONE               | `GET /api/health` — DB probe, version, без auth; для uptime-мониторов. |
| Система лимитов генераций  | DONE               | `UserUsage` counters, `getUserUsageSnapshot`, серверные квоты Free/Pro, UI usage banner. |
| Logout (Sign out)          | DONE (2026-07-07)  | Кнопка в сайдбаре protected-зоны; `signOut({ redirectTo: "/" })` + confirm. |
| Домен на главной           | DONE (2026-07-07)  | Mockup-иллюстрации: `creatornivo.com` вместо `app.creatornivo.com`; правило в AGENTS.md §1.1. |

## Текущие приоритеты (Июль 2026)

> **Сдвиг фокуса:** технический фундамент (бэкапы, мониторинг, квоты, privacy, auth hardening) в основном закрыт. Основной приоритет — **пользовательский опыт** и подготовка к запуску, а не массовое добавление нового функционала.

| Приоритет | Задача | Ожидаемый результат |
|-----------|--------|----------------------|
| **1** | Полировка UX и текстов | Единый тон copy, понятные empty/error states, микро-улучшения Dashboard/Generate/Library/Settings, убрать development banner перед launch. |
| **2** | Onboarding новых пользователей | Доработать существующий tour: первый визит → template → generate → save; снизить drop-off после регистрации. |
| **3** | Базовые email-уведомления | Resend: welcome после регистрации, подтверждение покупки Pro, предупреждение при исчерпании лимита (80%/100%). |

**Параллельно (blockers для Live, без перескакивания):** этапы 1–2 auth incident (мониторинг), Paddle Live onboarding (8), controlled purchase/refund test (9), legal review (7).

## Backlog / Будущие идеи

| Идея | Статус | Комментарий |
|------|--------|-------------|
| Кастомные шаблоны пользователей | Backlog | Создание и сохранение собственных templates. |
| Статьи + кастомные промпты | Backlog | Resources/Guides + генерация промптов на основе статей. |
| Докупка генераций (one-time purchase) | Backlog | Разовая покупка доп. квоты без смены плана. |
| Аналитика, Cookies, SEO | Backlog | Product analytics, cookie consent, meta/OG/sitemap. |
| Глубокое тестирование системы генераций | **Отложено** | Stress/load/idempotency/regression suite на production-like данных — **риск для продакшена** (расход OpenAI, нагрузка на DB). Вернуться после Live launch и стабилизации UX. |

## 10. Приоритетная дорожная карта

| Этап | Задача                                              | Ожидаемый результат                                      | Статус          |
|------|-----------------------------------------------------|----------------------------------------------------------|-----------------|
| 0    | Опубликовать auth diagnostics                       | Commit, push, Vercel Ready, проверить отсутствие секретов | DONE (2026-07-04: `b643e35` на production, smoke test A/C/B функционально PASS) |
| 1    | Воспроизвести login incident                        | Получить reason/prismaCode/databaseFingerprint и доказать root cause | IN PROGRESS (NOT REPRODUCED in controlled test) |
| 2    | Исправить подтверждённую auth/DB/session причину    | Немедленный register → logout → login стабильно работает | BLOCKER         |
| 3    | Password reset + auth rate limiting                 | Восстановление доступа и brute-force protection          | DONE (2026-07-05: forgot/reset flow, Resend email, Upstash rate limits, 20/20 tests PASS, immediate-login не сломан) |
| 4    | Account deletion + personal-data export runbook     | Проверяемый DSR workflow и identity verification         | DONE (4.1–4.4, 2026-07-05: export, delete, UI polish, legal copy, runbook §13) |
| 5    | Backups + restore drill                             | Регулярные dumps и подтверждённое восстановление         | DONE (2026-07-06) |
| 6    | Monitoring + global OpenAI budget                   | Alerts и защита от неожиданных расходов                  | PARTIAL (Sentry + health DONE; global budget — pending) |
| 7    | Legal owner review                                  | Решения по governing law, withdrawal, liability, privacy, taxes | REVIEW     |
| 8    | Paddle Live onboarding                              | Domain approval, Live products/prices/keys/webhook/default link | BLOCKER    |
| 9    | Controlled Live purchase/refund test                | End-to-end validation на малой сумме                     | BLOCKER         |
| 10   | Resources + branded UX                              | 3-5 статей, branded error/loading/404, polish            | После BLOCKERS  |

**Заметка (этап 1, 2026-07-04):** Immediate login не воспроизвёлся в 3/3 попытках после нормализации email. Требуется мониторинг реальных инцидентов. Возможные transient-причины: pooler timeout (`P2024`), replication lag.

**Заметка (этап 3, 2026-07-05):** Password reset + auth rate limiting реализованы и протестированы.
- Forgot/reset password: `PasswordResetToken` (SHA-256 hash, TTL 60 мин), инвалидация старых токенов, `passwordChangedAt`.
- API: `/api/auth/forgot-password` (единый ответ, без enumeration), `/api/auth/reset-password`.
- UI: `/forgot-password`, `/reset-password`, ссылка на login.
- Email: Resend с graceful fallback без ключа; в production email не логируется (только `emailHash`).
- Rate limiting (Upstash): login, register, forgot-password (IP + emailHash), reset-password (IP).
- Тесты: `auth-password-reset`, `auth-rate-limit`, `auth-credentials` — 20/20 PASS; build OK.
- Production env (обязательно на Vercel): `RESEND_API_KEY`, `EMAIL_FROM`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `AUTH_URL` (или `NEXTAUTH_URL`).

**Заметка (этап 4.1, 2026-07-05):** Personal Data Export реализован и протестирован.
- API: `POST /api/account/export-data` (password re-auth, rate limit `export_data`).
- UI: Settings → Privacy & Data → Download my data (JSON v1).
- Экспорт: account, subscription, billing history, library, generations, usage/reservations.
- Лимит: 5000 записей на категорию (`truncated` + `totalCount`); без password hash и OAuth secrets.
- Тесты: `account-data-export` + `auth-credentials` regression — 15/15 PASS; build OK.

**Заметка (этап 4.2, 2026-07-05):** Account Deletion реализован и протестирован.
- API: `POST /api/account/delete` (password + `DELETE` confirmation, rate limit `delete_account`).
- UI: Settings → Privacy & Data → Delete account (в той же секции, что export).
- Блокировка при активной подписке (409) + кнопка Cancel subscription / portal.
- Audit: `AccountDeletionRequest` (без FK, `emailHash`, status blocked/completed/failed).
- Удаление: cascade User + manual `GenerationReservation`/`VerificationToken`; `PaddleAdjustment.userId` → null.
- Тесты: `account-deletion` + export/credentials regression — 23/23 PASS; build OK.
- Миграция: `20260712100000_account_deletion_requests`.
**Заметка (этап 4.3, 2026-07-05):** Privacy & Data UI polish + rate limiting review.
- Settings: Subscription выше Privacy; якорь `#subscription`.
- Proactive info-блок при блокировке удаления (активная подписка) до submit.
- Delete: inline confirm (`Type DELETE`), disabled button до exact match, destructive styling.
- 429 mapping в UI; cross-disable loading между export/delete.
- Home banner `/?accountDeleted=1` (аналог `?reset=success`).
- Rate limit tests: `export_data` + `delete_account` IP/account buckets.

**Заметка (этап 4.4, 2026-07-05):** Legal copy + support runbook.
- Privacy Policy и Terms of Service: self-service export/delete в Settings → Privacy & Data; подписка до удаления; retention exceptions; support fallback.
- Runbook: раздел 13 (`roadmap.md`).
- Тесты: `legal-copy` обновлены; Legal pages остаются **REVIEW** (не юридическое заключение).

**Заметка (2026-07-06):** Временный development banner.
- Компонент `src/components/layout/development-banner.tsx` (amber/warning стиль).
- Показывается на главной (`/`) и в dashboard (`/dashboard`) после авторизации.
- Удалить после полноценного запуска: компонент + импорты (см. `// TODO: Удалить после запуска`).

## 12. Deploy checklist: этап 3 (password reset + rate limiting)

### Перед деплоем (Vercel → Settings → Environment Variables)

| Переменная | Production | Зачем |
|------------|------------|-------|
| `RESEND_API_KEY` | Обязательно | Отправка reset-писем |
| `EMAIL_FROM` | Рекомендуется | Verified sender в Resend |
| `UPSTASH_REDIS_REST_URL` | Обязательно | Auth rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Обязательно | Auth rate limiting |
| `AUTH_URL` | Обязательно | Reset-ссылки и Auth.js (`https://www.creatornivo.com`) |

### Миграция БД

```bash
npx prisma migrate deploy
```

Миграция: `20260711100000_password_reset_tokens` (`PasswordResetToken`, `User.passwordChangedAt`).

### Smoke test после деплоя

1. **Forgot password:** `/forgot-password` → единый ответ «If an account exists…» (200).
2. **Email:** письмо приходит (или проверить Resend dashboard).
3. **Reset:** ссылка из письма → `/reset-password?token=…` → новый пароль → redirect на `/login?reset=success`.
4. **Старый пароль:** login со старым паролем → отказ.
5. **Новый пароль:** login с новым → успех.
6. **Immediate-login:** register → logout → login (0 сек) → успех.
7. **Rate limit (опционально):** 6-й forgot-password с одного IP за час → 429.

### Deploy checklist: этап 4 (privacy export + account deletion)

#### Миграция БД

```bash
npx prisma migrate deploy
```

Миграция: `20260712100000_account_deletion_requests` (`AccountDeletionRequest` audit table).

#### Smoke test после деплоя (этап 4)

1. **Export:** Settings → Privacy & Data → Download my data → password → JSON download.
2. **Delete block (Pro):** при активной подписке → 409 + ссылка на Subscription.
3. **Delete success:** cancel subscription → password + `DELETE` → redirect `/?accountDeleted=1`.
4. **Rate limit (опционально):** 4-й export за час с одного account → 429.

## 13. Runbook: Privacy & Data (export + delete)

### Self-service: экспорт данных

1. Пользователь: Settings → Privacy & Data → **Download my data**.
2. Вводит пароль → `POST /api/account/export-data`.
3. Rate limit: `export_data` — 3/hour per account, 10/hour per IP (Upstash).
4. Ответ: JSON v1 (`DATA_EXPORT_VERSION`), категории account/subscription/billing/library/generations/usage.
5. Лимит: 5000 записей на категорию; при превышении — `truncated: true` + `totalCount`.
6. Не включается: password hash, OAuth secrets.

### Self-service: удаление аккаунта

1. Пользователь: Settings → Privacy & Data → **Delete account**.
2. Проверки до submit:
   - Активная подписка Paddle/Stripe → блок UI + 409 `subscription_active` / `subscription_requires_action`.
   - Generation in progress (`reserved`/`started`, не истёк) → 409 `generation_in_progress`.
   - Admin role → 409 `admin_account`.
3. Submit: password + exact `DELETE` → `POST /api/account/delete`.
4. Rate limit: `delete_account` — 3/hour per account, 5/hour per IP.
5. Успех: cascade User data; `PaddleAdjustment.userId` → null; audit `completed`; session invalid; redirect `/?accountDeleted=1`.
6. Необратимо: восстановление только через support при доказанной ошибке (редкий edge case).

### Manual support fallback (DSR)

Когда направлять в support:
- `password_not_supported` (нет credentials auth).
- Пользователь не может войти и нужен export/delete.
- Запрос относится к данным вне self-service (rectification, restriction, objection).
- Подозрение на fraud / duplicate accounts / chargeback dispute.

Процесс:
1. Запрос на `support@creatornivo.com` с темой «Privacy request» / «Account deletion».
2. **Identity verification:** подтвердить владение email (ответ с того же адреса) + дополнительный фактор при сомнении (дата регистрации, последний template, fragment billing ID без полного PAN).
3. SLA: ответ в течение **30 дней** (GDPR); срочные security — приоритет.
4. Export вручную: тот же JSON v1 через admin/script или воспроизведение API после verified session.
5. Delete вручную: только после verification; проверить подписку в Paddle dashboard; записать audit `AccountDeletionRequest` со status `completed` и `emailHash` (без PII в публичных логах).

### Audit: `AccountDeletionRequest` (без PII в логах)

| Поле | Назначение |
|------|------------|
| `emailHash` | Корреляция без хранения email |
| `status` | `requested` / `blocked` / `completed` / `failed` |
| `blockReason` | `subscription_active`, `generation_in_progress`, `admin_account`, … |
| `ipHash` | Rate-limit / abuse correlation |
| `failureReason` | Truncated error (max 200 chars), без stack в UI |

**Не логировать публично:** email, password, export JSON content, полные Paddle IDs в support tickets.

### Retention после удаления

- User и связанные записи (generations, library, sessions) — удаляются.
- `PaddleAdjustment` — `userId` обнуляется; billing metadata остаётся для compliance.
- Support переписка — по политике хранения почты Namecheap.
- Audit `AccountDeletionRequest` — сохраняется без FK на User.

## 11. Runbook: мониторинг immediate-login incident (этап 1)

### Когда пользователь жалуется (register → logout → immediate login fail)

1. Зафиксировать **UTC timestamp** жалобы и сценарий (register / auto-login / manual login после logout).
2. Vercel → **Runtime Logs** → фильтр `[auth-diagnostic]` → окно ±5 мин от времени инцидента.
3. Найти запись `event: credentials_authorize` с `outcome: denied` или `error`.
4. Скопировать только безопасные поля (см. ниже) в incident journal.
5. Попросить пользователя повторить login через 30 сек — transient или стабильный fail.
6. При `reason: database_error` + `P2024` — проверить Supabase/Prisma pooler и connection limits.
7. При `reason: user_not_found` сразу после register — проверить replication lag / read-after-write.
8. Этап 2 начинать только после ≥1 подтверждённого `reason` с evidence.

### Обязательные поля из `[auth-diagnostic]` (без PII)

| Поле | Зачем |
|------|-------|
| `timestamp` | Корреляция с жалобой |
| `event` | `credentials_authorize` или `session_refresh` |
| `outcome` | `success` / `denied` / `error` |
| `reason` | Root cause candidate |
| `databaseErrorCode` | Prisma (`P2024` и др.) |
| `databaseFingerprint` | Тот же pool/DB endpoint? |
| `requestId` | Корреляция с Vercel request |
| `userFound` | User exists at query time? |
| `passwordHashPresent` | Password persisted? |
| `environment` / `instance` | Production region/deployment |

**Не фиксировать:** `emailHash`, `userId`, email, пароли, полный raw JSON в публичных местах.

### Быстрая проверка `databaseFingerprint` и `databaseErrorCode`

- **`databaseFingerprint`:** стабильный `sha256:...` для одного `DATABASE_URL`. Сравнить register-login пары в одном инциденте — должен совпадать. Смена между инцидентами = другой env/deployment (маловероятно на production).
- **`databaseErrorCode`:**
  - `P2024` → connection pool timeout (transient, retry может помочь)
  - `P1001` / `P1017` → connection/server unreachable
  - отсутствует при `reason: user_not_found` или `bcrypt_mismatch` → DB query завершился, проблема в данных/пароле
- **Связка:** `outcome: error` + `reason: database_error` + `P2024` = приоритет pooler investigation.

## 9. Инфраструктура и подготовка к Paddle Live

| Область              | Сейчас                                      | Приоритет   | Минимум перед Live |
|----------------------|---------------------------------------------|-------------|--------------------|
| Database backups     | GitHub Actions daily + R2 (age); drill PASS   | DONE        | Настроить R2 Lifecycle rule (§14); мониторить failed workflow |
| Supabase/Prisma pooler | Работает, но возможен transient incident  | IN PROGRESS | Auth diagnostics на production; transient incident в smoke test B не воспроизведён |
| Error monitoring     | Sentry SDK на production (DSN в Vercel)     | DONE        | Настроить алерты owner (5xx, webhook failures); без prompt content |
| Health check         | `GET /api/health`                           | DONE        | Подключить внешний uptime monitor |
| Global OpenAI budget | Есть per-user quota                         | HIGH        | Daily/monthly global breaker и owner alert |
| Secrets              | Vercel env; раскрытый ключ ранее отозван    | REVIEW      | Rotation runbook, не показывать в screenshots |
| Support mailbox      | Создан                                      | HIGH        | Deliverability test |
| Legal review         | Тексты улучшены                             | REVIEW      | Governing law, withdrawal, liability, privacy timing, taxes |
| Paddle Live          | Не подтверждён                              | BLOCKER     | Domain approval, Live product/price/keys/webhook/default link |
| Live validation      | Не проводилась                              | BLOCKER     | Одна покупка + refund малыми деньгами |


**Заметка (этап 5, 2026-07-06):** Backups + restore drill.
- Pipeline: `pg_dump` (custom format) → age encryption → upload Cloudflare R2 (`daily/YYYY/MM/DD/`).
- GitHub Actions: `.github/workflows/database-backup.yml` — cron `0 3 * * *` UTC + `workflow_dispatch`.
- Retention: 30 дней — R2 Lifecycle rule (§14) + запасной prune в скриптах.
- Restore drill PASS (Windows, `drill.ps1`): User 13, Generation 1, Subscription 4, `_prisma_migrations` 12.
- Предупреждения `supabase_vault` при локальном restore — ожидаемы и игнорируются.
- Осталось вручную: R2 Lifecycle rule в Cloudflare dashboard (§14).

## 14. Runbook: Backup & Restore

### Архитектура

| Компонент | Где | Назначение |
|-----------|-----|------------|
| Скрипты | `scripts/backup/` | backup, restore, drill (+ `lib/common.sh` / `lib/common.ps1`) |
| CI | `.github/workflows/database-backup.yml` | Ежедневный encrypted backup в R2 |
| Хранилище | Cloudflare R2 bucket | Prefix `daily/`, файлы `*.dump.age` + `*.sha256` |
| Шифрование | [age](https://github.com/FiloSottile/age) | Публичный ключ в GitHub Secrets; приватный — **только локально / оффлайн** |
| Секреты CI | GitHub → Settings → Secrets | `BACKUP_DATABASE_URL`, `BACKUP_AGE_PUBLIC_KEY`, `R2_*` |

**Никогда не коммитить:** приватный age-ключ, `*.dump`, `*.age`, `backup-key.txt`.

### GitHub Actions: ежедневный backup

1. Workflow запускается в **03:00 UTC** или вручную (**Actions → Database Backup → Run workflow**).
2. Runner: Ubuntu, PostgreSQL 17 client, age, AWS CLI.
3. `scripts/backup/backup.sh`: `pg_dump` → encrypt → upload R2 → prune старых объектов (fallback).
4. При **неудаче** workflow создаёт GitHub Issue с префиксом `[backup-failure]` (временный алерт до Sentry).

**Проверка после первого успешного run:**
```bash
aws s3 ls s3://$R2_BUCKET_NAME/daily/ --recursive --endpoint-url https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com
```

### R2 Lifecycle rule (рекомендуется — основной retention)

Настрой один раз в Cloudflare Dashboard. Скриптовый prune (§ ниже) — запасной вариант.

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** → выбери bucket бэкапов.
2. **Settings** → **Lifecycle rules** → **Add rule**.
3. Параметры:
   - **Rule name:** `daily-backup-retention-30d`
   - **Prefix:** `daily/`
   - **Action:** **Delete uploaded objects**
   - **Days after upload:** `30`
4. **Save**. Правило применяется ко всем объектам под `daily/` (включая `.sha256` sidecars).
5. Проверка: через 30+ дней объект должен исчезнуть из bucket; до этого — виден в **Objects** с датой upload.

> Lifecycle и скриптовый prune могут работать параллельно — это безопасно (удаление идемпотентно).

### Запасной prune (скрипт)

Если Lifecycle rule ещё не настроен или нужна ручная очистка:

```bash
# Linux / CI (только удаление объектов старше 30 дней)
BACKUP_RETENTION_DAYS=30 \
R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET_NAME=... \
  scripts/backup/backup.sh --prune-only
```

```powershell
# Windows
$env:R2_ACCOUNT_ID = "..."
$env:R2_ACCESS_KEY_ID = "..."
$env:R2_SECRET_ACCESS_KEY = "..."
$env:R2_BUCKET_NAME = "..."
.\scripts\backup\backup.ps1 -PruneOnly -RetentionDays 30
```

Полный backup локально (без upload, для теста):
```bash
SKIP_UPLOAD=1 scripts/backup/backup.sh
```

### Restore (ручной)

**Требуется:** приватный age-ключ (файл, не в репозитории), R2 credentials.

```powershell
# Windows: скачать latest, расшифровать, restore в целевую БД
.\scripts\backup\restore.ps1 -Latest -AgeKeyFile "C:\secure\backup-key.txt" `
  -TargetDatabaseUrl $env:RESTORE_DATABASE_URL
```

```bash
# Linux/macOS
./scripts/backup/restore.sh --latest --age-key-file /secure/backup-key.txt \
  --target-database-url "$RESTORE_DATABASE_URL"
```

Только скачать и расшифровать (без restore в БД):
```powershell
.\scripts\backup\restore.ps1 -Latest -AgeKeyFile "..." -DecryptOnly -OutputDir ./restore-work
```

### Restore drill (обязательно раз в квартал / после изменений pipeline)

Проверяет, что latest backup реально восстанавливается и содержит данные.

```powershell
.\scripts\backup\drill.ps1 -AgeKeyFile "C:\secure\backup-key.txt"
```

```bash
./scripts/backup/drill.sh --age-key-file /secure/backup-key.txt
```

**Ожидаемый результат:** `=== DRILL PASS ===`

#### Restore Drill — 2026-07-06

| Поле | Значение |
|------|----------|
| Статус | **DRILL PASS** |
| Бэкап | `creatornivo-2026-07-06-155308.dump.age` |
| Размер (decrypted) | ~249 KB |
| Время restore | ~1.3s |
| User | 13 |
| Generation | 1 |
| Subscription | 4 |
| `_prisma_migrations` | 12 |
| Примечание | Предупреждения `supabase_vault` — норма для локального PostgreSQL |

### Что делать при ошибке backup

1. **GitHub Actions:** открыть failed run → лог шага *Run encrypted backup upload*.
2. **Авто-алерт:** проверить open Issue с префиксом `[backup-failure]` в репозитории.
3. **Типичные причины:**
   - `BACKUP_DATABASE_URL` недоступен (Supabase maintenance, pooler timeout)
   - Неверный / истёкший R2 API token
   - `pg_dump` version mismatch (workflow использует PG 17)
   - Нехватка места / timeout runner (20 min)
4. **Ручной backup (экстренный):**
   ```bash
   export BACKUP_DATABASE_URL="..."
   export BACKUP_AGE_PUBLIC_KEY="age1..."
   export R2_ACCOUNT_ID=... # остальные R2_*
   scripts/backup/backup.sh
   ```
5. **После исправления:** re-run workflow; убедиться, что объект появился в R2; закрыть Issue.
6. **Если backup пропущен >24h:** после восстановления pipeline — restore drill (§ выше).

### Секреты и ключи

| Секрет | Где хранить | Комментарий |
|--------|-------------|-------------|
| `BACKUP_AGE_PUBLIC_KEY` | GitHub Secrets | Только шифрование в CI |
| Приватный age-ключ | Оффлайн + password manager / USB | Для restore; **не** в Vercel, **не** в git |
| `BACKUP_DATABASE_URL` | GitHub Secrets | Read-only connection string к production DB |
| `R2_*` | GitHub Secrets + локально для drill | S3-compatible API keys |

### Чеклист перед Live

- [x] Ежедневный automated backup в offsite (R2)
- [x] Restore drill PASS с реальными counts
- [ ] R2 Lifecycle rule `daily/` → delete after 30 days
- [ ] Подтверждён алерт при failed backup (GitHub Issue)
- [ ] Приватный age-ключ сохранён в двух независимых местах