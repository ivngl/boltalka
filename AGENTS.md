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

## TURN / WebRTC

- coturn runs in Docker with `static-auth-secret` (`TURN_SECRET` env var)
- Server endpoint `GET /api/turn-config` (auth required) returns time-limited TURN credentials (HMAC-SHA1, 24h expiry)
- Client fetches TURN config lazily from the server on first `RTCPeerConnection` creation
- Default `TURN_URL` in Docker is `turn:coturn:3478` (Docker service name)
- nginx proxies `/api/turn-config` — no special routing needed
- For production: set `TURN_SECRET` in `.env`, expose UDP 3478 + 40000-40999 on firewall, replace `TURN_URL` with public server hostname

## HTTP / HTTPS

Base config runs on HTTP. Add `-f docker-compose.https.yml` for HTTPS mode:

| Mode  | Command |
|-------|---------|
| HTTP  | `docker compose up -d` |
| HTTPS | `docker compose -f docker-compose.yml -f docker-compose.https.yml up -d` |

HTTPS mode requires self-signed certs at `/root/certs/bolt-talka.{crt,key}` on the host.
