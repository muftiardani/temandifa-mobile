# ==============================================================================
# TemanDifa Backend - Optimized Multi-stage Dockerfile
# ==============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build with optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.Version=${VERSION:-dev}" \
    -o /app/server ./cmd/server/main.go

# -----------------------------------------------------------------------------
# Stage 2: Runtime - Minimal image
# -----------------------------------------------------------------------------
FROM alpine:3.19 AS runtime

# Labels
LABEL maintainer="TemanDifa Team" \
      version="1.0.0" \
      description="TemanDifa Backend API Service"

WORKDIR /app

# Install minimal runtime dependencies
RUN apk --no-cache add ca-certificates tzdata && \
    # Create non-root user
    addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy binary from builder
COPY --from=builder /app/server .

# Copy config files
COPY --from=builder /app/.env.example .env.example

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/v1/health || exit 1

# Run the binary
CMD ["./server"]
