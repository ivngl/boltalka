# Boltalka

Real-time WhatsApp-like chat app. React 19 + Vite 6 frontend, Express 5 + Socket.IO backend.
PostgreSQL via Prisma ORM, Redis for Socket.IO adapter and presence. JWT auth with bcryptjs.

## Commits
Conventional Commits. Types: `feat` `fix` `chore` `docs` `refactor` `style` `test`.
Use lowercase, no scope.

## Commands
- `make install` — install all deps
- `make db` — start infra (PostgreSQL + Redis via Docker)
- `make dev` — start server + client concurrently (PostgreSQL)
- `make dev-sqlite` — start server + client with SQLite (no Docker needed)
- `make seed` — seed test users (alice, bob, charlie / password123)
- `make lint` — client ESLint
- `make client` / `make server` — start individually

## DB modes

| Mode       | Command         | `DATABASE_URL`                                | Requires Docker |
|------------|-----------------|-----------------------------------------------|-----------------|
| PostgreSQL | `make dev`      | `postgresql://boltalka:boltalka@localhost:5432/boltalka` | Yes             |
| SQLite     | `make dev-sqlite` | `file:./dev.db`                               | No              |

Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` accordingly before starting.
