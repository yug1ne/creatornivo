## 3. Что уже реализовано

| Область                    | Состояние          | Комментарий |
|----------------------------|--------------------|-----------|
| Главная и Pricing          | DONE               | Публичный copy очищен от fake scarcity и недоказуемых claims. |
| Регистрация / вход         | DONE с оговоркой   | Credentials auth, bcrypt, auth diagnostics (`b643e35`), password reset и auth rate limiting (этап 3, 2026-07-05); этап 1 IN PROGRESS — мониторинг реальных инцидентов. |
| Dashboard                  | DONE               | Показывает текущий план и серверный usage. |
| Templates                  | DONE               | 15 templates, 8 доступны Free. |
| Generate                   | DONE               | Серверные квоты, idempotency, streaming; без OpenAI key — безопасный 503 generation_disabled. |
| Library                    | DONE частично      | Сохранение, поиск, просмотр и экспорт работают; удаления saved items пока нет. |
| Settings                   | DONE               | Тема, профиль, статус подписки, Customer Portal; self-service data export JSON (этап 4.1, 2026-07-05). |
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
| 4    | Account deletion + personal-data export runbook     | Проверяемый DSR workflow и identity verification         | IN PROGRESS (4.1 DONE 2026-07-05; 4.2 account deletion — pending) |
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

