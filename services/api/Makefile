.PHONY: run build test clean db-up db-down

# Run in development (in-memory)
run:
	PORT=8090 go run ./cmd/server

# Run with PostgreSQL
run-pg:
	PORT=8090 DATABASE_URL=postgres://vigooth:vigooth@localhost:5432/vigooth?sslmode=disable go run ./cmd/server

# Build binary
build:
	go build -o bin/server ./cmd/server

# Run tests
test:
	go test -v ./...

# Clean build artifacts
clean:
	rm -rf bin/

# Start PostgreSQL
db-up:
	docker compose up -d

# Stop PostgreSQL
db-down:
	docker compose down

# View PostgreSQL logs
db-logs:
	docker compose logs -f postgres
