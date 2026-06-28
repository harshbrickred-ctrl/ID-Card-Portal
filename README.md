# School ID Card Portal

Production-ready portal for school student ID card printing.

## Features

- **Login** — credential-based admin access
- **Dashboard** — setup checklist per school, analytics, print activity
- **Templates** — upload per-school ID card designs (PNG/JPG), quality check on upload, visual layout editor
- **Students** — import from Excel, edit records, upload photos (required for print)
- **Print** — filter by enroll ID / name / class / section, preview front **and** back, download PDF print sheet (A4) or ZIP of PNGs

## Workflow

1. Create a school and import students with photos
2. Upload the ID card template (PNG/JPG at CR-80 size: **1011×638 px @ 300 DPI**)
3. Open **Edit layout** — drag photo, signature, and text fields into place, then **Save**
4. Go to **Print IDs** — select students, preview both sides, download PDF or ZIP

## Quick start

```bash
cp .env.example .env
# Set DATABASE_URL

npm install
npm run db:generate
npm run db:migrate
npm run db:seed

npm run dev
```

Open http://localhost:3001

After `db:seed`, an **Admin** account is created for day-to-day use (add/update only). A separate **Super Admin** account is also seeded for delete operations — credentials are not shown in the app; check your seed output or database directly.

## Template export guide

| Tool | Export settings |
|------|-----------------|
| CorelDRAW / Canva | PNG or JPG, 300 DPI, 85.6×53.98 mm (CR-80) |
| Photoshop | 1011×638 px document, PNG export |
| PDF from designer | Re-export as PNG/JPG — PDF upload is not supported for new templates |

## Excel import columns

| Column | Required |
|--------|----------|
| Name | Yes |
| Enroll ID | Yes |
| Class | Yes |
| Section | Yes |
| DOB | No |
| Phone Number | No |
| Address | No |

## Monorepo

```
apps/portal          Next.js app (port 3001)
packages/db          Prisma + PostgreSQL
packages/card-engine CR-80 card render, PDF sheets, ZIP export
packages/contracts   Zod schemas
packages/api-kit     Auth + API envelope
```
