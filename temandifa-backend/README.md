# TemanDifa Backend Service

Go-based REST API and gRPC Gateway for TemanDifa application.

## 🛠️ Prerequisites

- **Go** 1.22+
- **PostgreSQL** (Database)
- **Redis** (Cache & Rate Limiting)
- **Protoc** (Protocol Buffer Compiler) - for gRPC
- **Swag CLI** (`go install github.com/swaggo/swag/cmd/swag@latest`)
- **Python 3.10+** (for AI Service gRPC generation)

---

## 🚀 Quick Start

1.  **Setup Environment**:
    Copy `.env.example` to `.env` (create one if missing) and set `DB_DSN`, `JWT_SECRET`, etc.

2.  **Run Server**:
    The server automatically runs database migrations on start.
    ```bash
    go run cmd/server/main.go
    # OR using Makefile
    make run
    ```

---

## ⚙️ Code Generation Tutorials

### 1. Generate Swagger Documentation (API Docs)

Update `docs/` whenever you change API Handlers or DTOs.

```bash
# Verify swag is installed
swag --version

# Generate Docs
swag init -g cmd/server/main.go --parseDependency --parseInternal

# Note: If you encounter parsing errors, check your comment syntax.
```

Access docs at: `http://localhost:8080/swagger/index.html`

### 2. Generate gRPC Code (Backend & AI Service)

Whenever you modify `proto/ai_service.proto`, you must regenerate stubs for both Go (Backend) and Python (AI Service).

**Step A: Generate Go Code (Backend)**
Run from project root `temandifa-backend` parent (workspace root):

```bash
# Ensure you are at: /path/to/TemanDifa/
protoc --go_out=. --go-grpc_out=. proto/ai_service.proto
```

_Output: `temandifa-backend/internal/grpc/aiservice/_.pb.go`\*

**Step B: Generate Python Code (AI Service)**
Run from workspace root:

```bash
# Install tools if needed
pip install grpcio-tools

# Generate
python -m grpc_tools.protoc -Iproto --python_out=temandifa-ai-service/app/grpc_generated --grpc_python_out=temandifa-ai-service/app/grpc_generated ai_service.proto
```

_Output: `temandifa-ai-service/app/grpc_generated/_\_pb2*.py`*

---

## 🧪 Testing

```bash
# Run Unit Tests
go test -v ./...
```
