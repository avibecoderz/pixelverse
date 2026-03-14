# PixelStudio — Project Overview

## What This Is

PixelStudio is a Nigerian photography studio management SaaS. It has two roles:
- **Admin** — full access: manage staff, clients, galleries, payments, settings
- **Staff** — limited access: view/manage assigned clients and galleries

---

## Monorepo Structure

```text
artifacts/
├── pixelstudio/           # React + Vite + Tailwind CSS v4 + shadcn/ui frontend
│   └── src/
│       ├── lib/api.ts         # All API functions + getImageUrl() helper
│       ├── hooks/use-data.ts  # React Query hooks + data adapters
│       └── pages/             # login, dashboard, manage-staff, manage-clients,
│                              #   gallery-management, payment-tracking,
│                              #   admin-settings, staff-profile, client-gallery
├── pixelstudio-api/       # Node.js + Express + Prisma + PostgreSQL backend (CommonJS)
│   ├── src/
│   │   ├── server.js          # Entry point, loads dotenv, starts Express
│   │   ├── app.js             # Express app, CORS, routes mounted at /api
│   │   ├── routes/            # auth, staff, clients, galleries, payments
│   │   ├── controllers/       # Business logic per entity
│   │   ├── middlewares/       # authMiddleware.js, errorMiddleware.js
│   │   └── utils/seed.js      # Seed script: creates Admin account
│   └── prisma/schema.prisma   # PostgreSQL schema
└── api-server/            # Placeholder legacy server (DO NOT USE for PixelStudio)
```

---

## Running the App

Both servers must run together:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/pixelstudio: web` | `pnpm --filter @workspace/pixelstudio run dev` | auto (env PORT) |
| `artifacts/pixelstudio-api: PixelStudio API` | `pnpm --filter pixelstudio-api run dev` | 3000 |

The Vite dev server proxies `/api/*` and `/uploads/*` requests to `http://localhost:3000`.
No `VITE_API_URL` is needed in development — leave it empty in `.env.local`.

---

## Database

- **Provider**: Replit built-in PostgreSQL (auto-provisioned, `DATABASE_URL` injected by Replit)
- **ORM**: Prisma (CommonJS)
- **Schema**: `artifacts/pixelstudio-api/prisma/schema.prisma`
- **Push schema**: `pnpm --filter pixelstudio-api run db:push`
- **Seed**: `pnpm --filter pixelstudio-api run db:seed`

### Models
- `Staff` — has roles ADMIN/STAFF, email + passwordHash
- `Client` — belongs to a photographer (staff), has phone/email/notes
- `Gallery` — belongs to Client, has token (32-char hex), status (DRAFT/READY/ARCHIVED)
- `Photo` — belongs to Gallery, stored locally via Multer under `/uploads/`
- `Payment` — belongs to Client, tracks amount/status (PENDING/PARTIAL/PAID)/method

---

## Authentication

- **JWT** stored in `localStorage` under key `ps_token`
- Other localStorage keys: `role` (admin|staff), `user_name`, `user_id`
- Login endpoint: `POST /api/auth/login` — email + password
- Role from backend is UPPERCASE (`ADMIN`/`STAFF`); `api.ts` normalises to lowercase

---

## Demo Credentials

After running the seed script:

| Role | Email | Password |
|---|---|---|
| Admin | admin@pixelstudio.com | admin123 |
| Staff | (create via Admin → Manage Staff) | (set via Admin → Manage Staff) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, shadcn/ui, React Query (TanStack) |
| Backend | Node.js 24, Express 5, Prisma ORM, CommonJS |
| Database | PostgreSQL (Replit built-in) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| File storage | Multer — local disk at `artifacts/pixelstudio-api/uploads/` |
| Monorepo | pnpm workspaces |

---

## Key Files

- `artifacts/pixelstudio/src/lib/api.ts` — all API calls, `getImageUrl()` helper
- `artifacts/pixelstudio/src/hooks/use-data.ts` — React Query hooks, data normalization
- `artifacts/pixelstudio-api/src/app.js` — Express app setup, CORS config
- `artifacts/pixelstudio-api/src/middlewares/errorMiddleware.js` — error handling
- `artifacts/pixelstudio-api/.env` — backend env vars (PORT, JWT_SECRET, etc.)
- `artifacts/pixelstudio/.env.local` — frontend env vars (VITE_API_URL="")

---

## Enum Values

Backend enums are UPPERCASE; the frontend normalises them:

| Backend | Frontend |
|---|---|
| `ADMIN` / `STAFF` | `admin` / `staff` |
| `DRAFT` / `READY` / `ARCHIVED` | `draft` / `ready` / `archived` |
| `PENDING` / `PARTIAL` / `PAID` | `pending` / `partial` / `paid` |
| `CASH` / `TRANSFER` / `POS` | `cash` / `transfer` / `pos` |

---

## Gallery Public Access

Clients access their gallery via `/gallery/:token` (no login required).
The backend validates the 32-char hex token and returns photos only if status is `READY`.
A `403` response means the gallery is not ready yet — the frontend shows a friendly message.
