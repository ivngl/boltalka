FROM node:22-alpine
WORKDIR /app

COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci --prefix server && npm ci --prefix client

COPY . .

RUN npm run build --prefix client
RUN npx prisma generate --schema=server/prisma/schema.prisma

EXPOSE ${PORT:-8080}

CMD npx prisma migrate deploy --schema=server/prisma/schema.prisma && node server/src/index.js
