package database

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"temandifa-backend/internal/config"
	"temandifa-backend/internal/logger"
)

// RDB is deprecated: Use dependency injection instead.
// This global variable is kept for backward compatibility during migration.
var RDB *redis.Client

// RedisModule exports Redis dependency for Uber FX
var RedisModule = fx.Options(
	fx.Provide(NewRedisConnection),
)

// NewRedisConnection creates a new Redis client with FX lifecycle management
func NewRedisConnection(lc fx.Lifecycle, cfg *config.Config) *redis.Client {
	client := redis.NewClient(&redis.Options{
		Addr:         cfg.RedisAddr,
		Password:     cfg.RedisPassword,
		DB:           0,
		PoolSize:     100,
		MinIdleConns: 10,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			_, err := client.Ping(ctx).Result()
			if err != nil {
				logger.Warn("Failed to connect to Redis - some features may be disabled",
					zap.Error(err),
					zap.String("addr", cfg.RedisAddr),
				)
				// Return nil to allow app to start without Redis
				return nil
			}
			logger.Info("Redis connection established",
				zap.String("addr", cfg.RedisAddr),
				zap.Int("pool_size", 100),
			)
			// Set global for backward compatibility (deprecated)
			RDB = client
			return nil
		},
		OnStop: func(ctx context.Context) error {
			logger.Info("Closing Redis connection...")
			if err := client.Close(); err != nil {
				logger.Error("Error closing Redis connection", zap.Error(err))
				return err
			}
			return nil
		},
	})

	return client
}

// ConnectRedis is deprecated: Use NewRedisConnection with FX instead.
// Kept for backward compatibility during migration.
func ConnectRedis(addr string, password string) {
	RDB = redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           0,
		PoolSize:     100,
		MinIdleConns: 10,
	})

	ctx := context.Background()
	_, err := RDB.Ping(ctx).Result()
	if err != nil {
		logger.Warn("Failed to connect to Redis - rate limiting disabled",
			zap.Error(err),
			zap.String("addr", addr),
		)
		RDB = nil
	} else {
		logger.Info("Redis connection established", zap.String("addr", addr))
	}
}
