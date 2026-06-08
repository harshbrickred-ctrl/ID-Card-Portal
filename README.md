# ID Card Portal

Standalone SaaS for bulk CR-80 employee ID card printing. Integrates with Vetan HR and other products via SSO + employee sync API.

## Monorepo

```
apps/portal          Next.js app (port 3001)
packages/contracts     Integration v1 Zod schemas
packages/db            Prisma + PostgreSQL
packages/api-kit       Auth, SSO, API envelope
packages/card-engine   CR-80 PNG render + ZIP export
docs/integrations/v1.md
```

## Quick start

```bash
cp .env.example .env
# Set DATABASE_URL and JWT_SECRET (32+ chars)

npm install
npm run db:generate
npm run db:migrate
npm run db:seed

npm run dev
```

Open http://localhost:3001 — demo login: `demo@idcards.local` / `Demo@12345`

## Vetan integration

1. Set shared secret in both apps: `JWT_SECRETS={"vetan":"..."}` (portal) and `ID_CARD_PORTAL_JWT_SECRET` (Vetan).
2. Generate API key in Vetan Settings → Integrations.
3. Click **ID Cards** in Vetan sidebar or sync manually in portal Integrations page.

## Deploy

- Vercel root: `apps/portal`
- Domain: `cards.vetan.app`
- Env: `DATABASE_URL`, `JWT_SECRET`, `JWT_SECRETS`, `PORTAL_URL`, `NEXT_PUBLIC_PORTAL_URL`

## Plans

| Plan | Employees/batch | Batches/month |
|------|-----------------|---------------|
| FREE | 25              | 5             |
| PRO  | 500             | 100           |
