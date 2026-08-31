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

**No external dependencies:** No PostgreSQL, Redis, message queues, S3, SMTP, or OAuth needed. Everything runs in one process.

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

## Quick Start (Development)

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

---

## Deployment Guide (Self-Hosted Server)

### Prerequisites

- A Linux server (Ubuntu 22.04+, Debian 12+, CentOS 9+, or similar)
- SSH access to the server
- A domain name (optional but recommended)

---

### Option A: Docker (Recommended)

The simplest way. One command to run.

#### 1. Install Docker on the server

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Log out and back in for group to take effect
```

#### 2. Clone the project

```bash
git clone https://github.com/pourebadi/Taski.git
cd Taski
```

#### 3. Configure environment

```bash
cp .env.example .env
nano .env
```

Fill in these values:

```env
NODE_ENV=production
PORT=3000
JWT_ACCESS_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<random-64-char-string>
ADMIN_USERNAME=admin
ADMIN_NAME=System Admin
ADMIN_PASSWORD=<strong-password>
TZ=Asia/Tehran
```

Generate random secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 4. Build and run

```bash
docker compose up -d --build
```

The app is now running on `http://your-server-ip:3000`.

#### 5. Useful Docker commands

```bash
docker compose logs -f          # View logs
docker compose restart          # Restart
docker compose down             # Stop
docker compose up -d --build    # Rebuild and restart (after git pull)
```

#### 6. Update to latest version

```bash
cd Taski
git pull
docker compose up -d --build
```

---

### Option B: Direct Install (No Docker)

If Docker is not available or you prefer running directly on the OS.

#### 1. Install Node.js 20

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # should show v20.x
npm -v
```

#### 2. Clone and configure

```bash
git clone https://github.com/pourebadi/Taski.git
cd Taski
cp .env.example .env
nano .env    # fill in the values (see Option A, step 3)
```

#### 3. Install, build, and migrate

```bash
npm install
npx prisma generate --schema=apps/api/prisma/schema.prisma
npm run build
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
npm run db:seed
```

#### 4. Run with PM2 (process manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the app
pm2 start npm --name taski -- start

# Auto-start on server boot
pm2 startup
pm2 save
```

#### 5. PM2 commands

```bash
pm2 status              # Check status
pm2 logs taski          # View logs
pm2 restart taski       # Restart
pm2 stop taski          # Stop
```

#### 6. Update to latest version

```bash
cd Taski
git pull
npm install
npm run build
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
pm2 restart taski
```

---

### Setting Up a Domain with HTTPS

After the app is running, set up Nginx as a reverse proxy with free SSL from Let's Encrypt.

#### 1. Install Nginx and Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

#### 2. Create Nginx config

```bash
sudo nano /etc/nginx/sites-available/taski
```

Paste this (replace `taski.yourdomain.com`):

```nginx
server {
    listen 80;
    server_name taski.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 3. Enable and get SSL

```bash
sudo ln -s /etc/nginx/sites-available/taski /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get free SSL certificate
sudo certbot --nginx -d taski.yourdomain.com
```

Done. The app is now live at `https://taski.yourdomain.com`.

---

### Backup

The database is a single SQLite file. Back it up regularly:

```bash
# Manual backup
cp apps/api/data/app.db "backups/app-$(date +%Y%m%d-%H%M%S).db"

# Or use the built-in command (from inside the project directory)
npm run backup:now

# Automated daily backup (cron)
crontab -e
# Add this line:
0 3 * * * cd /path/to/Taski && cp apps/api/data/app.db "/path/to/backups/app-$(date +\%Y\%m\%d).db"
```

For Docker deployments, the data lives in a Docker volume:

```bash
# Find volume location
docker volume inspect taski_taski_data

# Backup
docker compose exec taski cp /app/apps/api/data/app.db /app/apps/api/data/backup.db
docker compose cp taski:/app/apps/api/data/backup.db ./backup-$(date +%Y%m%d).db
```

---

### Firewall

Only ports 80 (HTTP), 443 (HTTPS), and 22 (SSH) need to be open:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

If not using Nginx, open port 3000 directly:

```bash
sudo ufw allow 3000
```

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite path, e.g. `file:./data/app.db` |
| `JWT_ACCESS_SECRET` | Yes | Signing secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | Signing secret for refresh tokens |
| `ADMIN_USERNAME` | Yes | Bootstrap admin username (first run) |
| `ADMIN_PASSWORD` | Yes | Bootstrap admin password (first run) |
| `ADMIN_NAME` | No | Bootstrap admin display name |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | `production` or `development` |
| `TZ` | No | Timezone (default: `Asia/Tehran`) |
| `UPLOAD_MAX_MB` | No | Max upload size (default: 10) |
| `STORAGE_QUOTA_GB` | No | Storage quota (default: 2) |

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

## Troubleshooting

| Problem | Solution |
|---|---|
| `EACCES` permission error | Run `sudo chown -R $USER:$USER /path/to/Taski` |
| Port 3000 already in use | Change `PORT` in `.env` or kill the process: `lsof -ti:3000 \| xargs kill` |
| Database locked error | Only one instance should run at a time |
| Blank page after deploy | Run `npm run build` — the frontend must be built |
| Migration error | Make sure `DATABASE_URL` is set correctly in `.env` |
| Can't login after deploy | Run `npm run db:seed` to create the admin account |
| Docker build fails | Make sure Docker has at least 2GB RAM available |

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
