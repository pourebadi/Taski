<div align="center">

# Taski

### Product & Project Execution System

**One team. One source of truth. Zero spreadsheets.**

[![NestJS](https://img.shields.io/badge/Backend-NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Lang-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![SQLite](https://img.shields.io/badge/DB-SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)

[![License](https://img.shields.io/badge/License-Private-lightgrey?style=flat-square)]()
[![Tests](https://img.shields.io/badge/Tests-337_passing-brightgreen?style=flat-square)]()
[![Locale](https://img.shields.io/badge/UI-Persian_%2F_RTL-blueviolet?style=flat-square)]()

</div>

---

## What is this?

Taski is a purpose-built execution system for small, high-velocity teams. It replaces spreadsheet-based project tracking with a system designed around three ideas most tools get wrong:

| The old way | The Taski way |
|---|---|
| Nobody knows what's in progress right now | A single live board with clear owners |
| New work sneaks in and pushes everything back | Work can't enter execution without passing **Intake** |
| Dates get announced, then quietly slip | Every ETA change is **logged with a mandatory reason** |
| Support work eats capacity invisibly | Work split into 4 visible **Streams**, tracked against real capacity |

---

## Features

- **Full Persian RTL UI** with Jalali/Shamsi calendar
- **Light & dark themes** with WCAG AA contrast compliance
- **Customizable board** — 4 presets (Full, Kanban, Minimal, Scrum) + per-column toggle, reorder, rename by admin
- **Username-based authentication** with JWT + cookie-based refresh tokens
- **Review/approval workflow** — reviewer can approve or send back with reason
- **Capacity management** — weekly hours per person, tracked against active commitments
- **ETA with confidence levels** — effort estimates auto-convert to delivery dates using the working calendar (Sat–Thu)
- **Bilingual labels** — Persian primary + English subtitle on board columns and badges
- **Command palette** (Ctrl+K) for quick navigation
- **Change audit trail** — priority, owner, assignee, and deadline changes require a logged reason

---

## Architecture

Single deployable, single database. Zero moving parts to babysit.

```
Browser → one URL → NestJS Runtime
                     ├── /api/v1/*  REST API
                     ├── /*         React (Vite) build
                     ├── SQLite     data/app.db
                     └── Files      data/uploads/
```

**Out of scope for MVP:** PostgreSQL, Redis, message queues, S3, SMTP, OAuth/SSO, Docker, Kubernetes, microservices, horizontal scaling.

---

## Tech Stack

| Backend | Frontend |
|---|---|
| NestJS + TypeScript | React 18 + Vite |
| Prisma ORM (SQLite) | Ant Design v5 (RTL) |
| Zod validation | Zustand (auth state) |
| JWT auth | recharts (data viz) |
| Vitest + Supertest | Vitest + jsdom |

---

## Quick Start

```bash
# 1. Clone & configure
git clone https://github.com/pourebadi/Taski.git
cd Taski
cp .env.example .env      # set ADMIN_* and JWT_* values

# 2. Install & prepare
npm install
npm run db:migrate
npm run db:seed

# 3. Run
npm run dev                # API on :3000, Web on :5173
```

**Production:**

```bash
npm run build && npm start
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path, e.g. `file:./data/app.db` |
| `JWT_ACCESS_SECRET` | Signing secret for access tokens |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens |
| `ADMIN_USERNAME` | Bootstrap admin username |
| `ADMIN_PASSWORD` | Bootstrap admin password |
| `ADMIN_NAME` | Bootstrap admin display name |
| `TZ` | Defaults to `Asia/Tehran` |

---

## Project Structure

```
apps/
├── api/              NestJS backend
│   ├── src/          Source (auth, users, work-items, organization, calendar)
│   ├── prisma/       Schema, migrations, seeds
│   └── test/         162 API tests
└── web/              React frontend
    ├── src/
    │   ├── components/   UI components (Board, Drawers, Modals, Badges)
    │   ├── pages/        Routes (MyWork, Board, WorkList, Insights, Admin, Login)
    │   ├── theme/        Design tokens, ThemeProvider (light/dark)
    │   ├── lib/          Utilities (terms, i18n, date, board-config, auth-store)
    │   └── locales/      fa.json (all Persian strings)
    └── test/             175 frontend tests
docs/                 Product docs, audit report, architecture decisions, changelog
```

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start API + Web in dev mode |
| `npm run build` | Production build |
| `npm run test` | Run all 337 tests |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Seed initial data (idempotent) |
| `npm run db:seed:pilot` | Seed pilot team (IranPeymex roster) |
| `npm run backup:now` | Backup database |
| `npm run admin:reset-password -- --username=<x>` | Reset a user's password |

---

## Non-Negotiable Rules

- Every permission check happens **server-side** from a centralized authorization module
- Every ETA change requires a **logged reason** — no silent overwrites
- All dates stored in **UTC**, displayed in **Jalali/Shamsi**
- No hardcoded Persian strings in components — everything through `locales/fa.json`
- `data/` directory is never committed
- Working days: Saturday through Thursday. Friday is off.

---

<div align="center">

Built for teams who are done managing execution in spreadsheets.

</div>
