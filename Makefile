# Variables
BINARY_NAME=speedtest-backend
BACKEND_DIR=backend
DOCKER_COMPOSE=docker-compose.yml

.PHONY: all compile run test clean fmt tidy build up down logs

all: build

# Local Development (Docker-based)

compile:
	cd $(BACKEND_DIR) && go build -o $(BINARY_NAME) ./cmd/server

test:
	cd $(BACKEND_DIR) && go test ./...

fmt:
	cd $(BACKEND_DIR) && go fmt ./...

tidy:
	cd $(BACKEND_DIR) && go mod tidy

clean:
	rm -f $(BACKEND_DIR)/$(BINARY_NAME) 
	rm -rf $(BACKEND_DIR)/data/

## Frontend

frontend-install:
	cd frontend && npm install

frontend-dev: frontend-install	
	cd frontend && npm run dev

frontend-build: frontend-install
	cd frontend && npm run build

## Docker Commands

build:
	docker compose build

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

## Help
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Local Development Targets:"
	@echo "  build         Build the Go backend binary"
	@echo "  run           Build and run the Go backend locally"
	@echo "  test          Run Go tests"
	@echo "  fmt           Format Go code"
	@echo "  tidy          Tidy Go modules"
	@echo "  clean         Remove build artifacts and local data"
	@echo ""
	@echo "Docker Targets:"
	@echo "  docker-build  Build Docker images"
	@echo "  docker-up     Start the stack using Docker Compose"
	@echo "  docker-down   Stop the stack"
	@echo "  logs          Tail Docker logs"
