install:
	npm install && cd client && npm install && cd ../server && npm install

client:
	cd client && npm run dev

server:
	cd server && npm run dev

db:
	docker compose up -d

db-stop:
	docker compose down

seed:
	cd server && npm run db:seed

dev:
	@echo "Starting server and client..."
	@npm run dev

dev-sqlite:
	@echo "Starting server (SQLite) and client..."
	@npm run dev:sqlite

lint:
	cd client && npm run lint

migrate:
	cd server && npx prisma migrate dev

db-deploy:
	cd server && npx prisma migrate deploy

build:
	cd client && npm run build

prod: build
	cd server && npm run start

.PHONY: install client server db db-stop seed dev lint migrate db-deploy build prod
