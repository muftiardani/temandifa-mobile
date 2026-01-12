package main

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"go.uber.org/fx"
	"go.uber.org/zap"
	"gorm.io/gorm"

	_ "temandifa-backend/docs"
	"temandifa-backend/internal/cache"
	"temandifa-backend/internal/clients"
	"temandifa-backend/internal/config"
	"temandifa-backend/internal/database"
	"temandifa-backend/internal/handlers"
	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/middleware"
	"temandifa-backend/internal/repositories"
	"temandifa-backend/internal/services"
)

//	@title			TemanDifa API
//	@version		1.0.0
//	@description	API for TemanDifa - Assistive AI Application for the Visually Impaired

//	@contact.name	TemanDifa Support
//	@contact.email	support@temandifa.com

//	@license.name	MIT
//	@license.url	https://opensource.org/licenses/MIT

//	@host		localhost:8080
//	@BasePath	/api/v1

//	@securityDefinitions.apikey	BearerAuth
//	@in							header
//	@name						Authorization
//	@description				JWT Authorization header using the Bearer scheme. Example: "Bearer {token}"

func main() {
	fx.New(
		// Provide basic infrastructure
		fx.Provide(
			// Config
			config.LoadConfig,
			// Logger (Already init in init() or similar, but good to have as dependency if wrapper exists)
			// For now we rely on global logger.InitFromEnv() called at start
		),

		// Infrastructure Layer
		database.Module,
		database.RedisModule,

		// Repository Layer
		repositories.Module,

		// Service Layer
		services.Module,

		// Handler Layer
		handlers.Module,

		// External Clients
		fx.Provide(func(lc fx.Lifecycle, cfg *config.Config) (*clients.AIClient, error) {
			client, cleanup, err := clients.NewAIClient(cfg.AIServiceGRPCAddr)
			if err != nil {
				logger.Warn("Failed to connect to AI Service via gRPC (Initial)", zap.Error(err))
				// Return nil, nil to allow app to start, circuit breaker will handle it
				return nil, nil
			}
			lc.Append(fx.Hook{
				OnStop: func(ctx context.Context) error {
					cleanup()
					return nil
				},
			})
			logger.Info("AI Service configured",
				zap.String("http_url", cfg.AIServiceURL),
				zap.String("grpc_addr", cfg.AIServiceGRPCAddr),
			)
			return client, nil
		}),

		// Specific Providers for values or simple structs
		fx.Provide(func(cfg *config.Config, db *gorm.DB, rdb *redis.Client) *handlers.HealthHandler {
			return handlers.NewHealthHandler(db, rdb, cfg.AIServiceURL)
		}),

		// HTTP Server (Gin)
		fx.Provide(NewHTTPServer),

		// Invocation (Entry Point)
		fx.Invoke(
			initInfrastructure,
			initCachePackages,
			registerRoutes,
			services.RegisterTokenCleanupJob, // Token cleanup background job
			startServer,
		),
	).Run()
}

// initInfrastructure handles global/static initializations
func initInfrastructure() {
	// Initialize structured logger
	logger.InitFromEnv()
	// defer logger.Sync() // Fx handles graceful shutdown
}

// initCachePackages initializes cache-related packages with the Redis client
func initCachePackages(rdb *redis.Client) {
	cache.InitCache(rdb)
	cache.InitUserCache(rdb)
	services.InitDefaultBlacklist(rdb)
}

func NewHTTPServer(cfg *config.Config) *gin.Engine {
	if cfg.GinMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Global middleware
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.MaxBodySize(cfg.MaxBodySize))
	r.Use(gzip.Gzip(gzip.DefaultCompression))
	r.Use(middleware.RequestID())
	r.Use(middleware.VersionMiddleware()) // API versioning
	r.Use(middleware.RequestLogger())
	r.Use(logger.GinRecovery())

	return r
}

func registerRoutes(
	r *gin.Engine,
	cfg *config.Config,
	rdb *redis.Client,
	userRepo repositories.UserRepository,
	userCache services.UserCacheService,
	health *handlers.HealthHandler,
	auth *handlers.AuthHandler,
	ai *handlers.AIProxyHandler,
	history *handlers.HistoryHandler,
	cacheH *handlers.CacheHandler,
) {
	// Routes
	api := r.Group("/api/v1")
	// Use sliding window rate limiter for more accurate rate limiting
	api.Use(middleware.SlidingWindowRateLimiter(rdb, cfg.RateLimitRequests, time.Duration(cfg.RateLimitWindow)*time.Second))
	{
		api.GET("/health", health.CheckHealth)
		api.POST("/register", auth.Register)
		api.POST("/login", auth.Login)
		api.POST("/refresh", auth.Refresh)
		api.POST("/logout", auth.Logout)
	}

	protected := api.Group("/")
	protected.Use(middleware.Auth(cfg.JWTSecret, userRepo, userCache))
	{
		// AI Routes with stricter rate limiting and per-operation timeouts
		aiRoutes := protected.Group("/")
		aiRoutes.Use(middleware.SlidingWindowRateLimiterByUser(rdb, cfg.AIRateLimitRequests, time.Duration(cfg.AIRateLimitWindow)*time.Second))
		{
			aiRoutes.POST("/detect", middleware.DetectTimeout(cfg), ai.DetectObjects)
			aiRoutes.POST("/ocr", middleware.OCRTimeout(cfg), ai.ExtractText)
			aiRoutes.POST("/transcribe", middleware.TranscribeTimeout(cfg), ai.TranscribeAudio)
			aiRoutes.POST("/ask", middleware.VQATimeout(cfg), ai.AskQuestion)
		}

		protected.GET("/history", history.GetUserHistory)
		protected.POST("/history", history.CreateHistory)
		protected.DELETE("/history/:id", history.DeleteHistory)
		protected.DELETE("/history", history.ClearUserHistory)

		cacheGroup := protected.Group("/cache")
		cacheGroup.Use(middleware.AdminOnly())
		{
			cacheGroup.GET("/stats", cacheH.GetCacheStats)
			cacheGroup.DELETE("/detection", cacheH.ClearDetectionCache)
			cacheGroup.DELETE("/ocr", cacheH.ClearOCRCache)
			cacheGroup.DELETE("/transcription", cacheH.ClearTranscriptionCache)
			cacheGroup.DELETE("/", cacheH.ClearAllCache)
		}
	}

	// Docs & Metrics
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "TemanDifa Backend Gateway is Online",
			"version": "1.0.0",
		})
	})
	r.GET("/metrics", gin.WrapH(promhttp.Handler()))
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
}

func startServer(lc fx.Lifecycle, r *gin.Engine, cfg *config.Config) {
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  120 * time.Second,
	}

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			logger.Info("Server starting",
				zap.String("port", cfg.Port),
				zap.String("mode", gin.Mode()),
			)
			// Start periodic health checker for database (every 30 seconds)
			database.StartHealthChecker(30 * time.Second)

			go func() {
				if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
					logger.Fatal("Failed to start server", zap.Error(err))
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			logger.Info("Shutting down server...")

			// Give outstanding requests 30 seconds to complete
			shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()

			// Wait for background cache operations
			cache.WaitForCompletion()

			// Shutdown HTTP server
			if err := srv.Shutdown(shutdownCtx); err != nil {
				logger.Error("Server forced to shutdown", zap.Error(err))
			}

			// Close database connections
			if err := database.Close(); err != nil {
				logger.Error("Error closing database connection", zap.Error(err))
			}

			logger.Info("Server exited gracefully")
			logger.Sync() // Ensure all buffered logs are written
			return nil
		},
	})
}
