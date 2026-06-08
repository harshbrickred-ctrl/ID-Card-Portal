# Deploy ID Card Portal

## Vercel

1. Create project from `harshbrickred-ctrl/id-card-portal` (or your repo).
2. Root directory: `apps/portal`
3. Install command: `cd ../.. && npm install`
4. Build command: `cd ../.. && npm run db:generate && npm run build --workspace=@idportal/portal`

### Environment variables

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `JWT_SECRET` | 32+ char random string |
| `JWT_SECRETS` | `{"vetan":"<same as Vetan ID_CARD_PORTAL_JWT_SECRET>"}` |
| `PORTAL_URL` | `https://cards.vetan.app` |
| `NEXT_PUBLIC_PORTAL_URL` | `https://cards.vetan.app` |

## Vetan (sangam)

Add to Vercel env for `apps/web`:

| Variable | Example |
|----------|---------|
| `ID_CARD_PORTAL_URL` | `https://cards.vetan.app` |
| `ID_CARD_PORTAL_JWT_SECRET` | shared secret |

Run `npm run db:seed` on Vetan to add `id-cards:*` permissions to ADMIN roles.

## Local E2E

1. Portal: `cd id-card-portal && npm install && cp .env.example .env` — set `JWT_SECRET` and `JWT_SECRETS`
2. Vetan: set `ID_CARD_PORTAL_URL=http://localhost:3001` and matching `ID_CARD_PORTAL_JWT_SECRET`
3. Start portal on 3001, Vetan on 3000
4. Vetan → Settings → Integrations → Generate API key
5. Sidebar → ID Cards (SSO) → Integrations → Sync → New batch → Export ZIP
