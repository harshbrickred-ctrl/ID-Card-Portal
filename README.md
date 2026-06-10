# School ID Card Portal

Simple MVP for school student ID card printing.

## Features

- **Login** — credential-based admin access
- **Dashboard** — schools, students, and print analytics
- **Templates** — upload per-school ID card background images
- **Students** — import from Excel, edit records, upload photos
- **Print** — filter by enroll ID / name / class / section, preview cards, download ZIP for printing

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

Open http://localhost:3001

After `db:seed`, an **Admin** account is created for day-to-day use (add/update only). A separate **Super Admin** account is also seeded for delete operations — credentials are not shown in the app; check your seed output or database directly.

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
packages/card-engine CR-80 card render + ZIP export
packages/contracts   Zod schemas
packages/api-kit     Auth + API envelope
```
