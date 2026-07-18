# CreatorNivo

**AI-assisted text content SaaS** for structured business drafts from predefined templates.

**Website:** [https://www.creatornivo.com](https://www.creatornivo.com)

CreatorNivo helps marketers, founders, and indie makers draft professional text in a **template-based drafting workspace**. You pick a business template, fill structured fields, and get an **AI-assisted draft** to **review, edit, and verify** before use. Save drafts to a personal library. Free and Pro plans use transparent generation limits.

## What it is

- AI-assisted **text** drafting (not image, video, voice, or deepfake tools)
- Predefined **business and marketing templates**
- Subscription SaaS with Free and Pro limits
- Early Access product with honest limits and no fake social proof

## What it is not

- Not an open-ended “generate anything” creative studio
- Not legal, medical, or financial advice
- Outputs are **drafts** — users remain responsible for review and compliance

## Legal & responsible use

- [Responsible Use](https://www.creatornivo.com/responsible-use)
- [Terms of Service](https://www.creatornivo.com/terms)
- [Privacy Policy](https://www.creatornivo.com/privacy)
- [Refund Policy](https://www.creatornivo.com/refund-policy)

## Stack

- Next.js (App Router)
- TypeScript
- Prisma + PostgreSQL
- Auth.js
- Resend (transactional email)
- Billing providers configured via environment (see `.env.example`)

## Local development

```bash
npm install
cp .env.example .env
# Fill required placeholders: DATABASE_URL, AUTH_SECRET, AUTH_URL, OPENAI_API_KEY, etc.
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Prisma migrate (dev) |
| `npm run db:seed` | Seed data |

## Configuration

- **`.env.example`** documents all supported variables with **placeholder values only**.
- Copy it to `.env` or `.env.local` for local work. Never commit real credentials.

## Security

- **Never commit** `.env`, `.env.local`, API keys, webhook secrets, database passwords, session secrets, or backup private keys.
- Do not commit backup artifacts (`*.dump`, `*.age`, `backup-key*.txt`, `restore-work/`).
- Production secrets belong only in your host’s secret store (for example Vercel / GitHub Actions secrets), not in the repository.

## Agent / contributor notes

Coding conventions for automated agents live in `AGENTS.md` (and `CLAUDE.md`, which points there). Template form standards live under `docs/`.

## License

**Private / proprietary.** All rights reserved unless the owner states otherwise.
