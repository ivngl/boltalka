FROM node:22-alpine
WORKDIR /app

COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN cd client && npm ci --omit=dev && cd ../server && npm ci --omit=dev

COPY . .
RUN cd client && npm run build
RUN cd server && npx prisma generate

EXPOSE 8080
CMD ["node", "server/src/index.js"]
