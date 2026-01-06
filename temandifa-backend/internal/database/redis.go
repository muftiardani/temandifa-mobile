package database

import (
	"context"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"temandifa-backend/internal/logger"
)

var RDB *redis.Client

// ConnectRedis initializes Redis connection
// Addr: "localhost:6379" by default
func ConnectRedis(addr string, password string) {
	RDB = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password, // no password set
		DB:       0,        // use default DB
	})

	ctx := context.Background()
	_, err := RDB.Ping(ctx).Result()
	if err != nil {
		logger.Warn("Failed to connect to Redis - rate limiting disabled",
			zap.Error(err),
			zap.String("addr", addr),
		)
		RDB = nil // Set to nil so rate limiting middleware knows to skip
	} else {
		logger.Info("Redis connection established", zap.String("addr", addr))
	}
}
