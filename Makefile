.PHONY: all build test run clean lint dev

# Default target
all: build

# Build all components
build: build-backend build-frontend

build-backend:
	@echo "Building Go backend..."
	cd core && go build -o bin/server cmd/server/main.go

build-frontend:
	@echo "Building web frontend..."
	cd ui-web && npm run build

# Run development servers
dev: dev-backend dev-frontend

dev-backend:
	@echo "Starting Go backend in dev mode..."
	cd core && go run cmd/server/main.go

dev-frontend:
	@echo "Starting frontend dev server..."
	cd ui-web && npm run dev

# Run all tests
test: test-backend test-frontend

test-backend:
	@echo "Running Go tests..."
	cd core && go test -v -race -cover ./...

test-frontend:
	@echo "Running frontend tests..."
	cd ui-web && npm test

test-coverage:
	@echo "Running tests with coverage..."
	cd core && go test -v -race -coverprofile=coverage.out ./...
	cd ui-web && npm run test:coverage

# Linting
lint: lint-backend lint-frontend

lint-backend:
	@echo "Linting Go code..."
	cd core && golangci-lint run

lint-frontend:
	@echo "Linting TypeScript code..."
	cd ui-web && npm run lint

# Format code
fmt:
	@echo "Formatting Go code..."
	cd core && go fmt ./...
	@echo "Formatting TypeScript code..."
	cd ui-web && npm run lint:fix

# Type checking
type-check:
	@echo "Type checking TypeScript..."
	cd ui-web && npm run type-check

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf core/bin
	rm -rf ui-web/dist
	rm -rf ui-web/node_modules/.cache
	rm -rf ui-web/coverage
	rm -f core/coverage.out

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd core && go mod download
	@echo "Installing frontend dependencies..."
	cd ui-web && npm install

# Docker commands
docker-build:
	@echo "Building Docker image..."
	docker build -t mazechase:latest .

docker-run:
	@echo "Running Docker container..."
	docker run -p 11300:11300 mazechase:latest

docker-compose-up:
	@echo "Starting with docker-compose..."
	docker-compose up --build

docker-compose-down:
	@echo "Stopping docker-compose..."
	docker-compose down

# Database operations
db-reset:
	@echo "Resetting database..."
	rm -f core/appdata/*.db

# Generate protobuf
proto:
	@echo "Generating protobuf files..."
	cd core && buf generate

# Security scan
security:
	@echo "Running security scan..."
	cd core && gosec ./...
	cd ui-web && npm audit

# Help
help:
	@echo "Available targets:"
	@echo "  all          - Build everything (default)"
	@echo "  build        - Build backend and frontend"
	@echo "  dev          - Run development servers"
	@echo "  test         - Run all tests"
	@echo "  test-coverage - Run tests with coverage reports"
	@echo "  lint         - Run linters"
	@echo "  fmt          - Format code"
	@echo "  clean        - Remove build artifacts"
	@echo "  install      - Install dependencies"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run   - Run Docker container"
	@echo "  security     - Run security scans"
	@echo "  help         - Show this help"
