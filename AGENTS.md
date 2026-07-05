<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
# Creatornivo — Правила работы Grok Build (AGENTS.md)

## 1. Главная цель и философия проекта
Creatornivo — честный Early Access продукт.  
Доверие строится на **рабочем коде**, прозрачных лимитах, реальной поддержке и честном описании статуса Beta/Early Access.  
**Строго запрещено**: fake testimonials, fake ratings, fake counters, fake scarcity, недоказуемые обещания скорости/конверсии/экономии времени.

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
| 4    | Account deletion + personal-data export     | BLOCKER       | IN PROGRESS | 4.1+4.2 DONE 2026-07-05; 4.3+4.4 pending |
| 5    | Backups + restore drill                     | BLOCKER       | BLOCKER    | Infrastructure |
| 6    | Monitoring + global OpenAI budget           | HIGH          | -          | - |
| 7    | Legal owner review                          | REVIEW        | -          | - |
| 8    | Paddle Live onboarding                      | BLOCKER       | BLOCKER    | Domain, keys, webhook |
| 9    | Controlled Live purchase + refund test      | BLOCKER       | BLOCKER    | Реальная проверка |
| 10   | Resources + branded UX                      | После blockers| -          | - |

**Текущий фокус сессии**: Этап 1 (воспроизведение immediate-login incident + root cause evidence).

## 4. Правила по ключевым областям

### Auth и immediate-login incident
- Самая приоритетная проблема сейчас.
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

### Генерации и лимиты
- Free: 5 генераций в UTC-день
- Pro: 100 генераций в UTC-месяц
- Учёт только при `status = completed` ИЛИ `startedAt IS NOT NULL`
- Ошибки до `startedAt` не должны тратить квоту.

### Общие технические правила
- TypeScript strict + ESLint — прогонять после любых изменений.
- Перед коммитом: `git diff --check`, `git diff --cached --check`.
- Не коммитить: `.env`, реальные ключи, `DATABASE_URL`, password hashes, session tokens, полные Paddle ID в публичных местах.
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
