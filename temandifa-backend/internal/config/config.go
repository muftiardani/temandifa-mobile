package config

import (
	"fmt"
	"time"

	"temandifa-backend/internal/logger"

	"github.com/fsnotify/fsnotify"
	"github.com/spf13/viper"
	"go.uber.org/zap"
)

// Config holds all configuration values
type Config struct {
	// Server
	Port         string
	GinMode      string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration

	// Database
	DatabaseDSN string

	// Database Connection Pool
	DBMaxOpenConns    int
	DBMaxIdleConns    int
	DBConnMaxLifetime time.Duration
	DBConnMaxIdleTime time.Duration

	// Redis
	RedisAddr     string
	RedisPassword string

	// JWT
	JWTSecret string

	// AI Service
	AIServiceURL      string
	AIServiceGRPCAddr string

	// Rate Limiting (General API)
	RateLimitRequests int
	RateLimitWindow   int

	// Rate Limiting (AI Endpoints - stricter)
	AIRateLimitRequests int
	AIRateLimitWindow   int

	// AI Operation Timeouts
	AIDetectTimeout     time.Duration
	AIOCRTimeout        time.Duration
	AITranscribeTimeout time.Duration
	AIVQATimeout        time.Duration

	// File Limits
	MaxBodySize int64 // in bytes
}

// LoadConfig loads and validates configuration using Viper
func LoadConfig() (*Config, error) {
	// 1. Set Defaults
	viper.SetDefault("PORT", "8080")
	viper.SetDefault("GIN_MODE", "debug")
	viper.SetDefault("READ_TIMEOUT", "30s")
	viper.SetDefault("WRITE_TIMEOUT", "60s")
	viper.SetDefault("REDIS_ADDR", "localhost:6379")
	viper.SetDefault("AI_SERVICE_URL", "http://localhost:8000")
	viper.SetDefault("AI_SERVICE_GRPC_ADDR", "localhost:50051")
	viper.SetDefault("RATE_LIMIT_REQUESTS", 60)
	viper.SetDefault("RATE_LIMIT_WINDOW", 60)
	viper.SetDefault("MAX_BODY_SIZE", 50*1024*1024)

	// Database Connection Pool defaults (optimized for production)
	viper.SetDefault("DB_MAX_OPEN_CONNS", 25)
	viper.SetDefault("DB_MAX_IDLE_CONNS", 25)
	viper.SetDefault("DB_CONN_MAX_LIFETIME", "5m")
	viper.SetDefault("DB_CONN_MAX_IDLE_TIME", "5m")

	// AI Rate Limiting (stricter for resource-intensive endpoints)
	viper.SetDefault("AI_RATE_LIMIT_REQUESTS", 10) // 10 requests per window
	viper.SetDefault("AI_RATE_LIMIT_WINDOW", 60)   // 60 seconds

	// AI Operation Timeouts (per operation type)
	viper.SetDefault("AI_DETECT_TIMEOUT", "30s")
	viper.SetDefault("AI_OCR_TIMEOUT", "45s")
	viper.SetDefault("AI_TRANSCRIBE_TIMEOUT", "60s")
	viper.SetDefault("AI_VQA_TIMEOUT", "90s")

	// 2. Load from .env file directly if exists
	viper.SetConfigFile(".env")
	viper.SetConfigType("env")

	// Try to read config file, ignore if not found (will rely on env vars)
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			logger.Info("No .env file found, relying on environment variables")
		}
	} else {
		logger.Info("Configuration loaded from .env file")

		// Enable config hot reload
		viper.WatchConfig()
		viper.OnConfigChange(func(e fsnotify.Event) {
			logger.Info("Config file changed, reloading...",
				zap.String("file", e.Name),
			)
			// Note: Most config changes require restart for full effect
			// But some values can be hot-reloaded
		})
	}

	// 3. Auto-read Environment Variables
	// This makes viper read variables directly from OS environment
	viper.AutomaticEnv()

	// 4. Bind values to struct
	cfg := &Config{
		// Server
		Port:         viper.GetString("PORT"),
		GinMode:      viper.GetString("GIN_MODE"),
		ReadTimeout:  viper.GetDuration("READ_TIMEOUT"),
		WriteTimeout: viper.GetDuration("WRITE_TIMEOUT"),

		// Database
		DatabaseDSN:       viper.GetString("DB_DSN"),
		DBMaxOpenConns:    viper.GetInt("DB_MAX_OPEN_CONNS"),
		DBMaxIdleConns:    viper.GetInt("DB_MAX_IDLE_CONNS"),
		DBConnMaxLifetime: viper.GetDuration("DB_CONN_MAX_LIFETIME"),
		DBConnMaxIdleTime: viper.GetDuration("DB_CONN_MAX_IDLE_TIME"),

		// Redis
		RedisAddr:     viper.GetString("REDIS_ADDR"),
		RedisPassword: viper.GetString("REDIS_PASSWORD"),

		// JWT
		JWTSecret: viper.GetString("JWT_SECRET"),

		// AI Service
		AIServiceURL:      viper.GetString("AI_SERVICE_URL"),
		AIServiceGRPCAddr: viper.GetString("AI_SERVICE_GRPC_ADDR"),

		// Rate Limiting
		RateLimitRequests:   viper.GetInt("RATE_LIMIT_REQUESTS"),
		RateLimitWindow:     viper.GetInt("RATE_LIMIT_WINDOW"),
		AIRateLimitRequests: viper.GetInt("AI_RATE_LIMIT_REQUESTS"),
		AIRateLimitWindow:   viper.GetInt("AI_RATE_LIMIT_WINDOW"),

		// AI Timeouts
		AIDetectTimeout:     viper.GetDuration("AI_DETECT_TIMEOUT"),
		AIOCRTimeout:        viper.GetDuration("AI_OCR_TIMEOUT"),
		AITranscribeTimeout: viper.GetDuration("AI_TRANSCRIBE_TIMEOUT"),
		AIVQATimeout:        viper.GetDuration("AI_VQA_TIMEOUT"),

		// File Limits
		MaxBodySize: viper.GetInt64("MAX_BODY_SIZE"),
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate checks required configuration
func (c *Config) Validate() error {
	// Database DSN is required
	if c.DatabaseDSN == "" {
		return fmt.Errorf("DB_DSN is required")
	}

	// JWT Secret validation
	if c.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET is required")
	} else if len(c.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET must be at least 32 characters for security")
	}

	logger.Info("Configuration loaded successfully",
		zap.String("port", c.Port),
		zap.String("mode", c.GinMode),
		zap.String("ai_service", c.AIServiceURL),
	)

	return nil
}
