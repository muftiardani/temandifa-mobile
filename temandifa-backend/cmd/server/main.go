package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"temandifa-backend/internal/database"
	"temandifa-backend/internal/handlers"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	} else {
        log.Println(".env file loaded successfully")
    }

	// 1. Connect to PostgreSQL
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		// Fallback for local dev if .env missing
		dsn = "host=localhost user=postgres password=postgres dbname=temandifa port=5432 sslmode=disable TimeZone=Asia/Jakarta"
	}
	database.Connect(dsn)
	
	// 2. Connect to Redis
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	redisPassword := os.Getenv("REDIS_PASSWORD")
	database.ConnectRedis(redisAddr, redisPassword)

	r := gin.Default()

	// Initialize Handlers
	aiServiceURL := os.Getenv("AI_SERVICE_URL")
	if aiServiceURL == "" {
		aiServiceURL = "http://localhost:8000"
	}
	aiHandler := handlers.NewAIProxyHandler(aiServiceURL)
	authHandler := &handlers.AuthHandler{}

	// Routes
	api := r.Group("/api/v1")
	api.Use(handlers.RateLimitMiddleware(60, 60)) // 60 requests per 60 seconds
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "healthy"})
		})
		
		// Auth Routes
		api.POST("/register", authHandler.Register)
		api.POST("/login", authHandler.Login)
		
		// AI Routes
		api.POST("/detect", aiHandler.DetectObjects)
		api.POST("/ocr", aiHandler.ExtractText)
		api.POST("/transcribe", aiHandler.TranscribeAudio)
	}

	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "TemanDifa Backend Gateway is Online",
			"version": "1.0.0",
		})
	})

	// Prometheus Metrics Endpoint
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// Placeholder configuration
	port := "8080"
	fmt.Printf("Server starting on port %s\n", port)
	r.Run(":" + port)
}
