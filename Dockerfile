FROM node:22-alpine
WORKDIR /app

COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci --prefix server && npm ci --prefix client

COPY . .

RUN npm run build --prefix client
RUN npx --prefix server prisma generate --schema=server/prisma/schema.prisma

EXPOSE ${PORT:-8080}

CMD npm run build --prefix client && echo "Waiting for PostgreSQL..." && while ! nc -z postgres 5432 2>/dev/null; do sleep 1; done && echo "PostgreSQL is ready!" && npx --prefix server prisma db push --schema=server/prisma/schema.prisma && node server/src/index.js
