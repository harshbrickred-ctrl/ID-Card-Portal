# Deploy School ID Card Portal

## Vercel

1. Import [harshbrickred-ctrl/ID-Card-Portal](https://github.com/harshbrickred-ctrl/ID-Card-Portal)
2. **Root Directory:** `apps/portal`
3. Install / build commands are set in `apps/portal/vercel.json`

### Required environment variables

Add these in **Vercel → Project → Settings → Environment Variables** for **Production**, **Preview**, and **Development**:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon Postgres **pooled** connection string (`?sslmode=require`) |
| `PORTAL_URL` | Your deployed URL, e.g. `https://your-app.vercel.app` |
| `NEXT_PUBLIC_PORTAL_URL` | Same as `PORTAL_URL` |
| `BLOB_STORE_ID` | Vercel Blob store (auto-set when Blob is linked) |

**PDF templates:** Upload a PDF exported at **85.6×53.98 mm** (CR-80, 300 DPI). The server converts page 1 to **1011×638 px** automatically — works on Vercel with no extra software. PNG and JPG are also accepted.

**Important:** If `DATABASE_URL` is missing, sign-in will fail with a Prisma error. After adding or changing env vars, **redeploy** the project.

### Database setup (run once from your machine)

```bash
# packages/db/.env — set DATABASE_URL to your Neon connection string
npm run db:migrate
npm run db:seed
```

### Neon on Vercel

1. In Vercel, go to **Storage** or connect Neon from the Marketplace
2. Link the database to your project — this can auto-set `DATABASE_URL`
3. Or copy the **pooled** connection string from Neon dashboard and paste it manually
