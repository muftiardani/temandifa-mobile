# Build Stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/server/main.go

# Final Stage
FROM alpine:latest

WORKDIR /app

# Install runtime dependencies (check for certificates)
RUN apk --no-cache add ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/main .

# Copy environment file example (user should mount real .env)
COPY .env.example .env.example

# Expose port
EXPOSE 8080

# Command to run
CMD ["./main"]
