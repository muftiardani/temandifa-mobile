<p align="center">
  <img src="https://img.shields.io/badge/TemanDifa-AI%20Accessibility%20App-6366f1?style=for-the-badge&logo=react&logoColor=white" alt="TemanDifa"/>
</p>

<h1 align="center">👨‍🦯 TemanDifa</h1>

<p align="center">
  <strong>Aplikasi AI untuk Membantu Penyandang Disabilitas Netra</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat-square&logo=react" alt="React Native"/>
  <img src="https://img.shields.io/badge/Expo-SDK_54-000020?style=flat-square&logo=expo" alt="Expo"/>
  <img src="https://img.shields.io/badge/Go-1.25-00ADD8?style=flat-square&logo=go" alt="Go"/>
  <img src="https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-square&logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/gRPC-Protocol-244c5a?style=flat-square&logo=grpc" alt="gRPC"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/YOLOv8-Object_Detection-FF6F00?style=flat-square" alt="YOLOv8"/>
  <img src="https://img.shields.io/badge/PaddleOCR-Text_Recognition-0052CC?style=flat-square" alt="PaddleOCR"/>
  <img src="https://img.shields.io/badge/Whisper-Transcription-74aa9c?style=flat-square" alt="Whisper"/>
  <img src="https://img.shields.io/badge/Gemini_1.5-VQA-4285F4?style=flat-square&logo=google" alt="Gemini"/>
</p>

<p align="center">
  <a href="#-fitur-utama">Fitur</a> •
  <a href="#-arsitektur">Arsitektur</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-api-documentation">API Docs</a>
</p>

---

## 📖 Tentang TemanDifa

**TemanDifa** adalah aplikasi mobile berbasis AI yang dirancang khusus untuk membantu penyandang disabilitas netra dalam aktivitas sehari-hari. Dengan memanfaatkan teknologi _Computer Vision_, _Speech Recognition_, dan _Generative AI_, TemanDifa menjadi **"teman"** yang selalu siap membantu.

### 🎯 Misi Kami

> _"Membuat teknologi AI dapat diakses oleh semua orang, tanpa terkecuali."_

- 👁️ Membantu identifikasi objek di sekitar pengguna
- 📄 Membacakan teks dari dokumen/gambar
- 🎤 Mengkonversi suara menjadi teks
- 🧠 Menjawab pertanyaan tentang gambar dengan AI
- ♿ Menyediakan antarmuka yang sepenuhnya aksesibel

---

## ✨ Fitur Utama

<table>
<tr>
<td width="50%">

### 📷 Deteksi Objek

Identifikasi objek di sekitar menggunakan **YOLOv8 + ONNX Runtime**.

- ✅ 80+ jenis objek COCO terdeteksi
- ✅ Optimized inference dengan ONNX
- ✅ Real-time hasil dengan confidence score
- ✅ Feedback audio otomatis (TTS)

</td>
<td width="50%">

### 🧠 Smart Mode (VQA)

Tanyakan apa saja tentang gambar dengan **Google Gemini 1.5 Flash**.

- ✅ Visual Question Answering
- ✅ Deskripsi detail untuk tunanetra
- ✅ Natural language responses
- ✅ Contextual understanding

</td>
</tr>
<tr>
<td width="50%">

### 📄 Pemindai Dokumen (OCR)

Ekstraksi teks dari gambar dengan **PaddleOCR**.

- ✅ Multi-bahasa (ID, EN, CH)
- ✅ Baca dokumen, menu, tanda
- ✅ Smart GPU fallback
- ✅ Pembacaan teks-ke-suara

</td>
<td width="50%">

### 🎤 Transkripsi Suara

Ubah suara menjadi teks dengan **Faster-Whisper**.

- ✅ CTranslate2 optimized
- ✅ Deteksi bahasa otomatis
- ✅ Akurasi tinggi
- ✅ Multiple audio formats

</td>
</tr>
<tr>
<td width="50%">

### 🔐 Keamanan & Aksesibilitas

- ✅ Login biometrik (Fingerprint/Face ID)
- ✅ Mode tamu tanpa registrasi
- ✅ JWT dengan token rotation
- ✅ Haptic feedback

</td>
<td width="50%">

### 📴 Offline-First

- ✅ Queue requests saat offline
- ✅ Auto-sync ketika online
- ✅ Persistent cache
- ✅ Network status indicator

</td>
</tr>
</table>

---

## 🏗 Arsitektur

### System Architecture

```mermaid
flowchart TB
    subgraph Mobile["📱 Mobile App"]
        direction TB
        RN["React Native 0.81<br/>Expo SDK 54"]
        subgraph Screens["Screens"]
            CAM["📷 Camera<br/>+ Smart Mode"]
            DOC["📄 Document<br/>Scanner"]
            MIC["🎤 Voice<br/>Input"]
            HIST["📋 History"]
        end
        subgraph State["State Management"]
            ZUS["🔄 Zustand"]
            RQ["� React Query"]
            OQ["📴 Offline Queue"]
        end
    end

    subgraph Backend["🔧 Backend Gateway - Go/Gin"]
        direction TB
        subgraph Middleware["Middleware Stack"]
            AUTH["🔐 Auth"]
            RATE["⏱️ Rate Limiter"]
            CB["🔌 Circuit Breaker"]
            LOG["📝 Request Logger"]
        end
        subgraph Handlers["Handlers"]
            AH["Auth Handler"]
            AIH["AI Proxy Handler"]
            HH["History Handler"]
        end
    end

    subgraph AI["🤖 AI Service - Python/FastAPI"]
        direction TB
        subgraph Worker["gRPC Worker Process"]
            YOLO["🎯 YOLOv8<br/>ONNX Runtime"]
            OCR["📝 PaddleOCR<br/>Multi-language"]
            WHISPER["🗣️ Faster-Whisper<br/>CTranslate2"]
            VQA["🧠 Gemini 1.5<br/>Flash VQA"]
        end
    end

    subgraph Storage["💾 Data Layer"]
        PG[("🗄️ PostgreSQL<br/>User Data")]
        REDIS[("⚡ Redis<br/>Cache")]
        PROM["📊 Prometheus<br/>Metrics"]
    end

    Mobile -->|"REST API<br/>:8080"| Backend
    Backend -->|"gRPC<br/>:50051"| AI
    Backend --> PG
    Backend --> REDIS
    AI --> REDIS
    Backend -.-> PROM
    AI -.-> PROM

    style Mobile fill:#e1f5fe
    style Backend fill:#fff3e0
    style AI fill:#f3e5f5
    style Storage fill:#e8f5e9
```

### Data Flow - Object Detection

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 User
    participant M as 📱 Mobile App
    participant B as 🔧 Go Backend
    participant R as 💾 Redis Cache
    participant A as 🤖 AI Service
    participant Y as 🎯 YOLOv8

    U->>M: 📷 Ambil foto objek
    M->>M: Optimize image (resize, compress)
    M->>B: POST /api/v1/detect

    Note over B: Validate JWT Token
    Note over B: Check Rate Limit

    B->>R: 🔍 Cek cache (SHA256 hash)

    alt ✅ Cache HIT
        R-->>B: Return cached result
        B-->>M: X-Cache: HIT
    else ❌ Cache MISS
        B->>A: gRPC DetectObjects()
        A->>Y: Run ONNX inference
        Y-->>A: Detection results
        A-->>B: DetectionResponse
        B->>R: 💾 Cache (1 hour TTL)
    end

    B-->>M: JSON Response
    M->>M: 🔊 Text-to-Speech
    M-->>U: "Terdeteksi: Kursi, Meja, Laptop"
```

### Data Flow - Visual Question Answering (VQA)

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 User
    participant M as 📱 Mobile App
    participant B as 🔧 Go Backend
    participant R as 💾 Redis Cache
    participant A as 🤖 AI Service
    participant G as 🧠 Gemini API

    U->>M: 📷 Foto + Toggle Smart Mode
    M->>B: POST /api/v1/ai/ask
    Note right of M: question: "Apa yang ada di depan saya?"

    B->>R: � Cek cache (image + question hash)

    alt ✅ Cache HIT
        R-->>B: Return cached answer
    else ❌ Cache MISS
        B->>A: gRPC VisualQuestionAnswering()
        A->>G: 🌐 Gemini 1.5 Flash API
        Note over G: Multimodal Analysis
        G-->>A: AI-generated answer
        A-->>B: VQAResponse
        B->>R: 💾 Cache (24 hour TTL)
    end

    B-->>M: {"answer": "Di depan Anda..."}
    M->>M: 🔊 Text-to-Speech
    M-->>U: Deskripsi detail dari AI
```

### Component Architecture

```mermaid
graph TB
    subgraph Frontend["📱 Frontend Layer"]
        direction LR
        RN["React Native<br/>0.81.5"]
        EXPO["Expo SDK 54"]
        TS["TypeScript 5.9"]
        ZUS["Zustand 5.0"]
        RQ["React Query 5.90"]
        ZOD["Zod 4.3"]
        I18N["i18next"]
        MOTI["Moti Animations"]
    end

    subgraph Backend["🔧 Backend Layer"]
        direction LR
        GIN["Gin 1.11"]
        GORM["GORM 1.31"]
        GRPC_C["gRPC Client"]
        JWT["JWT v5"]
        ZAP["Zap Logger"]
        VIPER["Viper Config"]
    end

    subgraph AI_Layer["🤖 AI Layer"]
        direction LR
        FAPI["FastAPI 0.109"]
        GRPC_S["gRPC Server"]
        ONNX["ONNX Runtime"]
        PADDLE["PaddleOCR"]
        WHISP["Faster-Whisper"]
        GEMINI["Gemini API"]
    end

    RN --> RQ
    RQ --> GIN
    GIN --> GRPC_C
    GRPC_C --> GRPC_S
    GRPC_S --> ONNX
    GRPC_S --> PADDLE
    GRPC_S --> WHISP
    GRPC_S --> GEMINI

    style Frontend fill:#e3f2fd
    style Backend fill:#fff8e1
    style AI_Layer fill:#fce4ec
```

### Circuit Breaker Pattern

```mermaid
stateDiagram-v2
    [*] --> Closed

    Closed --> Open: 5 failures reached
    Closed --> Closed: Success (reset counter)

    Open --> HalfOpen: After 30s timeout
    Open --> Open: Reject all requests

    HalfOpen --> Closed: Test request succeeds
    HalfOpen --> Open: Test request fails

    note right of Closed: Normal operation<br/>Tracking failures
    note right of Open: Rejecting requests<br/>Protecting system
    note right of HalfOpen: Testing recovery<br/>Max 3 trial requests
```

### Caching Strategy

```mermaid
flowchart LR
    subgraph Request["📥 Incoming Request"]
        IMG["Image/Audio Data"]
    end

    subgraph Hash["🔐 Key Generation"]
        SHA["SHA256(data + params)"]
    end

    subgraph Cache["⚡ Redis Cache"]
        DET["detect:*<br/>TTL: 1 hour"]
        OCR_C["ocr:*<br/>TTL: 2 hours"]
        TRANS["transcribe:*<br/>TTL: 30 min"]
        VQA_C["vqa:*<br/>TTL: 24 hours"]
    end

    subgraph Result["📤 Response"]
        HIT["✅ Cache HIT<br/>X-Cache: HIT"]
        MISS["❌ Cache MISS<br/>→ AI Inference"]
    end

    IMG --> SHA
    SHA --> Cache
    Cache --> HIT
    Cache --> MISS
```

### Docker Compose Services

```mermaid
flowchart TB
    subgraph Docker["🐳 Docker Compose Network"]
        subgraph Services["Application Services"]
            BE["🔧 backend<br/>:8080"]
            AI["🤖 ai-service<br/>:8000 / :50051"]
        end

        subgraph Data["Data Services"]
            PG["🗄️ postgres<br/>:5432"]
            RD["⚡ redis<br/>:6379"]
        end

        subgraph Monitor["Monitoring"]
            PR["📊 prometheus<br/>:9090"]
            GR["📈 grafana<br/>:3000"]
        end
    end

    BE -->|depends_on| PG
    BE -->|depends_on| RD
    BE -->|depends_on| AI
    AI -->|cache| RD
    PR -->|scrape| BE
    PR -->|scrape| AI
    GR -->|datasource| PR

    style Docker fill:#e8eaf6
    style Services fill:#c5cae9
    style Data fill:#b2dfdb
    style Monitor fill:#ffe0b2
```

---

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js](https://nodejs.org/) 18+ (untuk frontend)
- [Expo CLI](https://expo.dev/) (`npm install -g expo-cli`)
- **Google Gemini API Key** (untuk fitur VQA)

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/temandifa.git
cd temandifa
```

### 2️⃣ Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit dan tambahkan:
# - JWT_SECRET (min 32 karakter)
# - GEMINI_API_KEY (untuk VQA)
nano .env
```

### 3️⃣ Jalankan Backend Services

```bash
# Start semua services dengan Docker Compose
docker-compose up -d

# Cek status
docker-compose ps

# Lihat logs
docker-compose logs -f backend ai-service
```

### Services yang Berjalan:

| Service         | Port  | URL                   | Deskripsi           |
| --------------- | ----- | --------------------- | ------------------- |
| **Backend API** | 8080  | http://localhost:8080 | Go API Gateway      |
| **AI Service**  | 8000  | http://localhost:8000 | Python AI Inference |
| **gRPC**        | 50051 | -                     | AI Service gRPC     |
| **PostgreSQL**  | 5432  | -                     | Database            |
| **Redis**       | 6379  | -                     | Cache & Rate Limit  |
| **Prometheus**  | 9090  | http://localhost:9090 | Metrics             |
| **Grafana**     | 3000  | http://localhost:3000 | Dashboard           |

### 4️⃣ (Opsional) Mengaktifkan GPU Support

Untuk performa inferensi AI yang lebih cepat (NVIDIA GPU required):

1. Pastikan **NVIDIA Container Toolkit** sudah terinstall.
2. Edit `docker-compose.yml`:
   ```yaml
   ai-service:
     build:
       dockerfile: Dockerfile.gpu # Ubah dari Dockerfile ke Dockerfile.gpu
     deploy:
       resources:
         reservations:
           devices:
             - driver: nvidia
               count: 1
               capabilities: [gpu]
   ```
3. Rebuild service: `docker-compose up -d --build ai-service`

### 5️⃣ Jalankan Mobile App

```bash
cd temandifa-frontend

# Install dependencies
npm install

# Start Expo development server
npx expo start
```

Scan QR code dengan **Expo Go** app di smartphone Anda.

---

## 📱 Tech Stack Detail

### Frontend (Mobile)

| Technology   | Version | Purpose                |
| ------------ | ------- | ---------------------- |
| React Native | 0.81.5  | Mobile framework       |
| Expo SDK     | 54      | Development platform   |
| TypeScript   | 5.9     | Type safety            |
| Zustand      | 5.0     | State management       |
| React Query  | 5.90    | Server state & caching |
| Zod          | 4.3     | Runtime validation     |
| i18next      | 25.7    | Internationalization   |
| Moti         | 0.30    | Animations             |
| Sentry       | 7.2     | Error tracking         |

### Backend (API Gateway)

| Technology | Version | Purpose                  |
| ---------- | ------- | ------------------------ |
| Go         | 1.25    | Programming language     |
| Gin        | 1.11    | HTTP framework           |
| Uber Fx    | 1.20    | Dependency Injection     |
| GORM       | 1.31    | ORM for PostgreSQL       |
| JWT v5     | 5.3     | Authentication           |
| gRPC       | 1.78    | AI service communication |
| Zap        | 1.27    | Structured logging       |
| Viper      | 1.21    | Configuration            |
| Prometheus | 1.23    | Metrics                  |

### AI Service

| Technology     | Version   | Purpose               |
| -------------- | --------- | --------------------- |
| Python         | 3.x       | Programming language  |
| FastAPI        | 0.109     | HTTP API              |
| gRPC           | latest    | Backend communication |
| ONNX Runtime   | 1.17      | YOLOv8 inference      |
| PaddleOCR      | 2.7       | Text extraction       |
| Faster-Whisper | 1.0       | Audio transcription   |
| Gemini API     | 1.5 Flash | Visual QA             |

---

## 📚 API Documentation

### Authentication

| Method | Endpoint           | Description           |
| ------ | ------------------ | --------------------- |
| `POST` | `/api/v1/register` | Register new user     |
| `POST` | `/api/v1/login`    | Login & get tokens    |
| `POST` | `/api/v1/refresh`  | Refresh access token  |
| `POST` | `/api/v1/logout`   | Logout & revoke token |

### AI Features

| Method | Endpoint             | Description                   |
| ------ | -------------------- | ----------------------------- |
| `POST` | `/api/v1/detect`     | Object detection (YOLOv8)     |
| `POST` | `/api/v1/ocr`        | Text extraction (PaddleOCR)   |
| `POST` | `/api/v1/transcribe` | Audio transcription (Whisper) |
| `POST` | `/api/v1/ai/ask`     | VQA (Gemini)                  |

### History

| Method   | Endpoint              | Description         |
| -------- | --------------------- | ------------------- |
| `GET`    | `/api/v1/history`     | Get user history    |
| `POST`   | `/api/v1/history`     | Save to history     |
| `DELETE` | `/api/v1/history/:id` | Delete history item |
| `DELETE` | `/api/v1/history`     | Clear all history   |

📖 **Swagger UI**: http://localhost:8080/swagger/index.html

---

## 🔧 Environment Variables

### Root `.env`

```env
# Database
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=temandifa

# JWT (WAJIB min 32 karakter untuk production!)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars

# Gemini API (WAJIB untuk fitur VQA/Smart Mode)
GEMINI_API_KEY=your-gemini-api-key
```

### Frontend `.env`

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1
```

---

## 📁 Project Structure

```
temandifa/
├── 📱 temandifa-frontend/          # React Native mobile app
│   ├── App.tsx                     # Entry point
│   └── src/
│       ├── components/             # UI components (Atomic Design)
│       │   ├── atoms/              # ThemedText, ThemedView
│       │   ├── molecules/          # FeatureCard, LoadingOverlay
│       │   └── organisms/          # ErrorBoundary
│       ├── screens/                # 11 App screens
│       ├── services/               # 11 API services
│       ├── stores/                 # Zustand (auth, theme)
│       ├── hooks/                  # Custom hooks
│       ├── schemas/                # Zod validation
│       └── i18n/                   # Localization
│
├── 🔧 temandifa-backend/           # Go API gateway
│   ├── cmd/server/main.go          # Entry point
│   └── internal/
│       ├── handlers/               # HTTP handlers (5)
│       ├── middleware/             # Auth, rate limit, etc. (6)
│       ├── services/               # Business logic (6)
│       ├── models/                 # GORM models (6)
│       └── clients/                # gRPC client
│
├── 🤖 temandifa-ai-service/        # Python AI service
│   ├── Dockerfile                  # CPU Dockerfile
│   ├── Dockerfile.gpu              # GPU Dockerfile (CUDA 12.1)
│   └── app/
│       ├── main.py                 # FastAPI + gRPC process spawn
│       ├── worker.py               # gRPC server with models
│       ├── services/               # YOLO, OCR, Whisper, VQA
│       └── core/                   # Config, middleware, metrics
│
├── 📋 proto/                       # gRPC Protobuf definitions
├── 📊 prometheus/                  # Monitoring config
├── 🐳 docker-compose.yml           # Container orchestration
└── 📖 README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. Create feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open a **Pull Request**

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

<table>
<tr>
<td align="center">
  <strong>TemanDifa Development Team</strong><br>
  <em>Building technology for accessibility</em>
</td>
</tr>
</table>

---

<p align="center">
  Made with ❤️ for accessibility
</p>

<p align="center">
  <strong>**TemanDifa** - Teman Setia Penyandang Disabilitas Netra</strong>
</p>

<p align="center">
  <a href="#-temandifa">Back to top ⬆️</a>
</p>
