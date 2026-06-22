# boltalka

Real-time WhatsApp-like chat application. Built with React 19 + Vite 6 on the frontend and Express 5 + Socket.IO on the backend. Data is persisted in PostgreSQL via Prisma ORM, with Redis used for the Socket.IO adapter and presence tracking. Authentication uses JWT tokens with bcryptjs password hashing.

## Quick start

```bash
make install    # Install all dependencies
make db         # Start PostgreSQL and Redis via Docker
make dev        # Start server and client concurrently
make seed       # Seed test users (alice, bob, charlie / password123)
```

## Commands

| Command         | Description                       |
|-----------------|-----------------------------------|
| `make install`  | Install all dependencies          |
| `make db`       | Start PostgreSQL + Redis (Docker) |
| `make dev`      | Start server + client concurrently|
| `make seed`     | Seed test users                   |
| `make lint`     | Run client ESLint                 |
| `make client`   | Start client only                 |
| `make server`   | Start server only                 |
