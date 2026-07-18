<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# CreatorNivo — Agent / contributor conventions (AGENTS.md)

## 1. Product philosophy

CreatorNivo is an honest Early Access product.

Trust is built on **working code**, transparent limits, real support, and clear Beta / Early Access status.

**Strictly forbidden in product or marketing copy:**

- Fake testimonials, fake ratings, fake counters, or fake scarcity
- Undefendable claims about speed, conversion, or time saved

### Product positioning (public-facing)

- **AI-assisted text content SaaS** / template-based drafting workspace
- Structured **business drafts** from **predefined templates**
- Users must **review, edit, and verify** outputs before use
- Do **not** market as open-ended “generate anything” creative generative AI
- Do **not** hide that the product uses AI for text drafting

### Domain convention

> Canonical site: **`www.creatornivo.com`** (brand domain: `creatornivo.com`).

When generating examples, URLs, mockups, screenshots, or address bars, always use `creatornivo.com`.

**Do not** invent subdomains such as `app.creatornivo.com` or `staging.creatornivo.com` in user-facing content.

Before committing marketing/UI content: `rg "app\.creatornivo" src/` must return **0** matches.

## 2. Safe change workflow

Do not ship large risky changes in one shot.

1. **Analyze** current code and docs.
2. **Plan** what changes, where, why, and risks.
3. **Confirm** with the project owner when the task is complex (auth, payments, privacy, infrastructure).
4. **Implement** only after agreement on those areas.
5. **Test** after each completed task.
6. **Verify** nothing unrelated broke.
7. **Commit** cleanly when asked.

For auth, payments, privacy, and infrastructure work, prefer plan mode and explicit approval.

## 3. Technical rules

- TypeScript strict + ESLint after meaningful changes.
- Before commit: `git diff --check`, `git diff --cached --check`.
- **Never commit:** `.env`, real API keys, `DATABASE_URL` passwords, password hashes, session tokens, webhook secrets, live payment credentials, or full production price IDs in public docs.
- **Never commit backup artifacts:** `backup-key.txt`, `*.dump`, `*.dump.age`, `*.age`, `restore-work/`.
- Prefer placeholders in `.env.example` only.
- Do not mix Sandbox and Live billing configuration in code or env examples.

## 4. Generations and quotas (product truth)

- Free: limited completed generations per UTC day (currently 5 in product config).
- Pro: limited completed generations per UTC month (currently 100 in product config).
- User-facing quota counts **successful completed** generations only.
- In-flight reservations may count toward concurrency capacity.
- Failed / validation-failed / refusal / timeout / expired-without-complete must **not** permanently consume quota.

## 5. Template form and Help rules

When working on CreatorNivo templates, the finished main prompt is the source of truth.

1. Before changing a template form or Help article, read the full prompt in `prisma/template-prompts/<slug>.txt`.
2. Do not rewrite, shorten, improve, restructure, or add requirements to an existing finished prompt while creating form fields or Help content.
3. Every `{{variable}}` used by the prompt must be represented by a form field.
4. Do not add form fields that are not used in the prompt unless the task explicitly asks for it and the reason is documented.
5. Do not remove prompt parameters.
6. Do not change template IDs or slugs unless the task explicitly requires a migration plan.
7. Every field needs a label, supported field type, required/optional setting, realistic placeholder, and short helper text.
8. Every migrated template needs a Help article.
9. The Help article must explain every field: what it is, why it matters, what to write, an example good value, and what to avoid.
10. The Help button or `?` link must route to the Help article for the current template slug.
11. Work in batches of no more than 3–5 templates.
12. Template form and Help tasks must not change Prisma, auth, billing, checkout, webhooks, prices, environment variables, or database migrations.

Detailed standard: `docs/template-form-standard.md`.  
Migration status: `docs/template-migration-status.md`.

## 6. Response format for plans

When proposing a plan:

- What will be done
- Files affected
- Step order
- Risks
- What to verify after
- Explicit confirmation request for complex work

<!-- END:nextjs-agent-rules -->
