install:
	cd client && npm install && cd ../server && npm install

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
	@trap 'kill 0' EXIT; \
		make -s server & \
		make -s client & \
		wait

lint:
	cd client && npm run lint

migrate:
	cd server && npx prisma migrate dev

.PHONY: install client server db db-stop seed dev lint migrate
