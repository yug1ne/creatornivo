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

## 10. Приоритетная дорожная карта

| Этап | Задача                                              | Ожидаемый результат                                      | Статус          |
|------|-----------------------------------------------------|----------------------------------------------------------|-----------------|
| 0    | Опубликовать auth diagnostics                       | Commit, push, Vercel Ready, проверить отсутствие секретов | DONE (2026-07-04: `b643e35` на production, smoke test A/C/B функционально PASS) |
| 1    | Воспроизвести login incident                        | Получить reason/prismaCode/databaseFingerprint и доказать root cause | IN PROGRESS (NOT REPRODUCED in controlled test) |
| 2    | Исправить подтверждённую auth/DB/session причину    | Немедленный register → logout → login стабильно работает | BLOCKER         |
| 3    | Password reset + auth rate limiting                 | Восстановление доступа и brute-force protection          | DONE (2026-07-05: forgot/reset flow, Resend email, Upstash rate limits, 20/20 tests PASS, immediate-login не сломан) |
| 4    | Account deletion + personal-data export runbook     | Проверяемый DSR workflow и identity verification         | DONE (4.1–4.4, 2026-07-05: export, delete, UI polish, legal copy, runbook §13) |
| 5    | Backups + restore drill                             | Регулярные dumps и подтверждённое восстановление         | BLOCKER         |
| 6    | Monitoring + global OpenAI budget                   | Alerts и защита от неожиданных расходов                  | HIGH            |
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
| Database backups     | Есть разовый custom-format pg_dump          | BLOCKER     | Автоматический schedule, offsite copy, retention, restore drill |
| Supabase/Prisma pooler | Работает, но возможен transient incident  | IN PROGRESS | Auth diagnostics на production; transient incident в smoke test B не воспроизведён |
| Error monitoring     | Нет production alerting                     | HIGH        | Webhook/auth/5xx alerts без prompt content |
| Global OpenAI budget | Есть per-user quota                         | HIGH        | Daily/monthly global breaker и owner alert |
| Secrets              | Vercel env; раскрытый ключ ранее отозван    | REVIEW      | Rotation runbook, не показывать в screenshots |
| Support mailbox      | Создан                                      | HIGH        | Deliverability test |
| Legal review         | Тексты улучшены                             | REVIEW      | Governing law, withdrawal, liability, privacy timing, taxes |
| Paddle Live          | Не подтверждён                              | BLOCKER     | Domain approval, Live product/price/keys/webhook/default link |
| Live validation      | Не проводилась                              | BLOCKER     | Одна покупка + refund малыми деньгами |

Область,Состояние,Комментарий
Главная и Pricing,DONE,Публичный copy очищен
Регистрация / вход + Password Reset,DONE,Credentials + diagnostics + rate limiting + password reset (Этап 3)
Dashboard,DONE,План + usage
Templates + Generate,DONE,С квотами и streaming
Library,DONE частично,Нет удаления saved items
Settings + Privacy & Data,DONE,"Export + Delete аккаунта + UI polish + Legal обновления (Этап 4, 2026-07-05)"
Paddle Sandbox,DONE,Полный цикл checkout/webhook/portal
Legal pages,REVIEW,"Улучшены, но требуют юридического ревью"
Resources / Guides,NOT ADDED,Пока нет
Monitoring & Error Tracking,NOT STARTED,Один из следующих приоритетов
Backups + Disaster Recovery,NOT STARTED,BLOCKER перед Live
Admin Panel,NOT STARTED,—


Этап,Задача,Ожидаемый результат,Статус,Приоритет
3,Password reset + auth rate limiting,Восстановление доступа + brute-force protection,DONE (2026-07-05),—
4,Account deletion + personal-data export + legal,Self-service DSR + audit + legal обновления,DONE (2026-07-05),—
5,Backups + restore drill,Регулярные бэкапы + подтверждённое восстановление,BLOCKER,Высокий
6,Monitoring + Error Tracking + Budget alerts,Sentry + алерты на ошибки и превышение бюджета,HIGH,Высокий
7,Admin Panel / Moderation tools,"Просмотр пользователей, генераций, блокировка",HIGH,Средний
8,Paddle Live onboarding + Live validation,Domain approval + одна покупка + refund на малую сумму,BLOCKER,Высокий
9,Analytics (PostHog / аналог),Понимание поведения пользователей,HIGH,Средний
10,Billing reliability improvements,"Улучшение webhook, dunning, edge cases",Средний,Средний
11,Resources + Onboarding polish,База знаний + улучшение пустых состояний,Средний,Низкий
12,Legal owner review,Финальное юридическое ревью,REVIEW,Высокий

Что я рекомендую сделать следующим (топ-3)
Приоритет,Этап,Почему именно сейчас
1,Backups + Disaster Recovery,Без надёжных бэкапов и restore drill ты рискуешь данными пользователей. Это фундаментальный блокер перед Live.
2,Monitoring + Error Tracking (Sentry),Сейчас ты почти не видишь ошибки в production. Это критично для стабильности.
3,Admin Panel,"Позволит управлять пользователями, смотреть генерации и быстро реагировать на проблемы без SQL."