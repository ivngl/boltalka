FROM node:22-alpine
WORKDIR /app

COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN cd client && npm ci && cd ../server && npm ci

COPY . .
RUN cd client && npm run build
RUN cd server && npx prisma generate --schema=prisma/schema.prisma

EXPOSE 8080
CMD cd server && npx prisma migrate deploy && node src/index.js
