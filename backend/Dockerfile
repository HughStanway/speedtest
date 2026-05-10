# Stage 1: Build the React frontend
FROM node:24-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Go backend
FROM golang:latest AS backend-builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
# Copy the built frontend into the backend directory for embedding
COPY --from=frontend-builder /app/dist ./internal/api/dist
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server/main.go

# Stage 3: Final runtime image
FROM debian:bullseye-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    gnupg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=backend-builder /app/server .

# Copy entrypoint script
COPY backend/entrypoint.sh .
RUN chmod +x entrypoint.sh

# Create data directory
RUN mkdir -p /app/data

# Environment variables
ENV PORT=8080
ENV DB_PATH=/app/data/speedtest.db
ENV SPEEDTEST_BINARY=speedtest
ENV GIN_MODE=release

EXPOSE 8080

ENTRYPOINT ["./entrypoint.sh"]
CMD ["./server"]
