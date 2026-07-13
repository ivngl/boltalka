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
- `docker compose logs -f [service]` — tail logs (app, nginx, postgres, redis)
- `docker compose exec [service] sh` — shell into a container

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

## Push Notifications / VAPID

Web Push uses VAPID keys. Dev keys are in `server/.env.example`. For production, generate fresh ones:

```
npx web-push generate-vapid-keys
```

Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in your `server/.env` and in a `.env` file in the project root (Docker Compose reads it automatically). Both must be present; push is silently disabled otherwise.

Base config runs on HTTP. Add `-f docker-compose.https.yml` for HTTPS mode:

| Mode  | Command |
|-------|---------|
| HTTP  | `docker compose up -d` |
| HTTPS | `docker compose -f docker-compose.yml -f docker-compose.https.yml up -d` |

HTTPS mode uses Let's Encrypt for trusted certificates. Get one for your sslip.io domain:

```
docker run --rm \
  -v $(pwd)/certbot-webroot:/var/www/html \
  -v /etc/letsencrypt:/etc/letsencrypt \
  certbot/certbot certonly --webroot -w /var/www/html -d <IP>.sslip.io
```

Then restart nginx: `docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --force-recreate nginx`

Auto-renew daily via cron: `0 3 * * * docker run --rm -v $(pwd)/certbot-webroot:/var/www/html -v /etc/letsencrypt:/etc/letsencrypt certbot/certbot renew && docker compose -f $(pwd)/docker-compose.yml -f $(pwd)/docker-compose.https.yml exec nginx nginx -s reload`

## Production Logs & Debugging

### Log levels
`LOG_LEVEL` env var: `trace`, `debug`, `info`, `warn`, `error`, `fatal` (default: `info`).
In Docker (non-TTY), Pino outputs newline-delimited JSON — pipe through `pino-pretty` for readability:

```
docker compose logs app | npx pino-pretty
```

### Viewing logs

| Command | What it shows |
|---|---|
| `docker compose logs -f` | Tail all services |
| `docker compose logs -f app` | Tail app only |
| `docker compose logs -f nginx` | Tail nginx only |
| `docker compose logs --tail=100 app` | Last 100 lines |
| `docker compose logs app 2>&1 \| grep -i error` | Filter errors |

### Debug mode
Set `LOG_LEVEL=debug` and recreate:

```
LOG_LEVEL=debug docker compose up -d
```

### Nginx logs (inside container)
Nginx logs aren't sent to stdout — access them via:

```
docker compose exec nginx tail -f /var/log/nginx/access.log
docker compose exec nginx tail -f /var/log/nginx/error.log
```

### Common debugging commands

| Action | Command |
|---|---|
| Check container health | `docker compose ps` |
| Exec into app container | `docker compose exec app sh` |
| Check PostgreSQL | `docker compose exec postgres psql -U boltalka -c "\dt"` |
| Check Redis | `docker compose exec redis redis-cli ping` |
| Check TURN server | `docker compose exec coturn ps aux` |
