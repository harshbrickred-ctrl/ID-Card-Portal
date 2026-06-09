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

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Admin | `admin@schoolcards.local` | `Admin@12345` | Add, create, update |
| Super Admin | `superadmin@schoolcards.local` | `SuperAdmin@12345` | Full access including delete |

## Excel import columns

| Column | Required |
|--------|----------|
| Enroll ID | Yes |
| Name | Yes |
| Class | Yes |
| Section | Yes |
| Father Name | No |
| DOB | No |
| Blood Group | No |

## Monorepo

```
apps/portal          Next.js app (port 3001)
packages/db          Prisma + PostgreSQL
packages/card-engine CR-80 card render + ZIP export
packages/contracts   Zod schemas
packages/api-kit     Auth + API envelope
```
