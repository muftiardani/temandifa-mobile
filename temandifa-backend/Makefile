# Variables
BINARY_NAME=temandifa-backend
MAIN_FILE=cmd/server/main.go
DB_DSN?="host=localhost user=postgres password=postgres dbname=temandifa port=5432 sslmode=disable TimeZone=Asia/Jakarta"

# .PHONY rules
.PHONY: all build run test clean lint migrate-up migrate-down docker-build help

# Default target
all: build

# Build the application
build:
	@echo "Building..."
	@go build -o bin/$(BINARY_NAME) $(MAIN_FILE)

# Run the application
run:
	@echo "Running..."
	@go run $(MAIN_FILE)

# Run tests
test:
	@echo "Testing..."
	@go test -v ./...

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf bin/
	@go clean

# Run linter
lint:
	@echo "Linting..."
	@golangci-lint run

# Run database migrations up
migrate-up:
	@echo "Running migrations up..."
	@migrate -path migrations -database "$(DB_DSN)" -verbose up

# Run database migrations down
migrate-down:
	@echo "Running migrations down..."
	@migrate -path migrations -database "$(DB_DSN)" -verbose down

# Build docker image
docker-build:
	@echo "Building docker image..."
	@docker build -t $(BINARY_NAME) .

# Generate Swagger docs
swag:
	@echo "Generating Swagger docs..."
	@swag init -g $(MAIN_FILE) --parseDependency --parseInternal

# Help command
help:
	@echo "Available commands:"
	@echo "  make build         - Build binary"
	@echo "  make run           - Run application"
	@echo "  make test          - Run tests"
	@echo "  make clean         - Clean build artifacts"
	@echo "  make lint          - Run linter"
	@echo "  make migrate-up    - Run DB migrations up"
	@echo "  make migrate-down  - Run DB migrations down"
	@echo "  make docker-build  - Build Docker image"
	@echo "  make swag          - Generate Swagger documentation"
