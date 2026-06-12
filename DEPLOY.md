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
| `JWT_SECRET` | Random string, at least 32 characters |
| `PORTAL_URL` | Your deployed URL, e.g. `https://your-app.vercel.app` |
| `NEXT_PUBLIC_PORTAL_URL` | Same as `PORTAL_URL` |
| `BLOB_STORE_ID` | Vercel Blob store (auto-set when Blob is linked) |
| `CLOUDCONVERT_API_KEY` | **Required for CDR uploads on Vercel** — get a key at [cloudconvert.com](https://cloudconvert.com) |

**CDR templates on Vercel:** ConvertAPI does not support CorelDRAW `.cdr` files. Set `CLOUDCONVERT_API_KEY`, redeploy, or upload a PNG/PDF export alongside the `.cdr`.

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
