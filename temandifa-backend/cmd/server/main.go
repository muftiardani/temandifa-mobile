package main

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"

	"temandifa-backend/internal/database"
	"temandifa-backend/internal/handlers"
	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/middleware"
)

func main() {
	// Initialize structured logger (zap)
	logger.InitFromEnv()
	defer logger.Sync()

	// Load .env file
	if err := godotenv.Load(); err != nil {
		logger.Warn("No .env file found, using system environment variables")
	} else {
		logger.Info(".env file loaded successfully")
	}

	// 1. Connect to PostgreSQL
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		// Fallback for local dev if .env missing
		dsn = "host=localhost user=postgres password=postgres dbname=temandifa port=5432 sslmode=disable TimeZone=Asia/Jakarta"
	}
	database.ConnectPostgres(dsn)

	// 2. Connect to Redis
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	redisPassword := os.Getenv("REDIS_PASSWORD")
	database.ConnectRedis(redisAddr, redisPassword)

	// Initialize Gin with custom logger
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Use custom structured logging middleware (zap)
	r.Use(logger.GinLogger())
	r.Use(logger.GinRecovery())

	// Initialize Handlers
	aiServiceURL := os.Getenv("AI_SERVICE_URL")
	if aiServiceURL == "" {
		aiServiceURL = "http://localhost:8000"
	}
	logger.Info("AI Service configured", zap.String("url", aiServiceURL))

	aiHandler := handlers.NewAIProxyHandler(aiServiceURL)
	authHandler := &handlers.AuthHandler{}
	historyHandler := &handlers.HistoryHandler{}
	cacheHandler := &handlers.CacheHandler{}

	// Routes
	api := r.Group("/api/v1")
	api.Use(middleware.RateLimiter(60, 60)) // 60 requests per 60 seconds
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "healthy"})
		})

		// Public Auth Routes (no authentication required)
		api.POST("/register", authHandler.Register)
		api.POST("/login", authHandler.Login)
	}

	// Protected Routes (require valid JWT token)
	protected := api.Group("/")
	protected.Use(middleware.Auth())
	{
		// AI Routes
		protected.POST("/detect", aiHandler.DetectObjects)
		protected.POST("/ocr", aiHandler.ExtractText)
		protected.POST("/transcribe", aiHandler.TranscribeAudio)

		// History Routes
		protected.GET("/history", historyHandler.GetUserHistory)
		protected.POST("/history", historyHandler.CreateHistory)
		protected.DELETE("/history/:id", historyHandler.DeleteHistory)
		protected.DELETE("/history", historyHandler.ClearUserHistory)

		// Cache Management Routes (admin)
		protected.GET("/cache/stats", cacheHandler.GetCacheStats)
		protected.DELETE("/cache/detection", cacheHandler.ClearDetectionCache)
		protected.DELETE("/cache/ocr", cacheHandler.ClearOCRCache)
		protected.DELETE("/cache/transcription", cacheHandler.ClearTranscriptionCache)
		protected.DELETE("/cache", cacheHandler.ClearAllCache)
	}

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "TemanDifa Backend Gateway is Online",
			"version": "1.0.0",
		})
	})

	// Prometheus Metrics Endpoint
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	logger.Info("Server starting",
		zap.String("port", port),
		zap.String("mode", gin.Mode()),
	)

	if err := r.Run(":" + port); err != nil {
		logger.Fatal("Failed to start server", zap.Error(err))
	}
}
