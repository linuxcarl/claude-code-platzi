.PHONY: start stop restart logs shell migrate seed test lint build

start:
	docker compose up -d

stop:
	docker compose down

restart:
	docker compose restart backend

build:
	docker compose build

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

shell:
	docker compose exec backend bash

migrate:
	docker compose exec backend alembic upgrade head

create-migration:
	docker compose exec backend alembic revision --autogenerate -m "$(name)"

seed:
	docker compose exec backend python -m app.seed

seed-fresh:
	docker compose exec backend alembic downgrade base
	docker compose exec backend alembic upgrade head
	docker compose exec backend python -m app.seed

test:
	docker compose exec backend pytest app/tests/ -v

lint:
	docker compose exec backend ruff check app/

format:
	docker compose exec backend ruff format app/

ps:
	docker compose ps

health:
	curl -s http://localhost:8000/api/v1/health | python3 -m json.tool
