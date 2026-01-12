package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"temandifa-backend/internal/logger"
)

// TokenBlacklist manages revoked access tokens in Redis
type TokenBlacklist struct {
	prefix string
	client *redis.Client
}

// NewTokenBlacklist creates a new token blacklist service
func NewTokenBlacklist(client *redis.Client) *TokenBlacklist {
	return &TokenBlacklist{
		prefix: "blacklist:",
		client: client,
	}
}

// Deprecated: DefaultBlacklist is kept for backward compatibility.
// Use *TokenBlacklist via dependency injection instead.
var DefaultBlacklist *TokenBlacklist

// Deprecated: InitDefaultBlacklist is kept for backward compatibility.
// Use NewTokenBlacklist with FX dependency injection instead.
func InitDefaultBlacklist(client *redis.Client) {
	DefaultBlacklist = NewTokenBlacklist(client)
}

// Add adds a token to the blacklist with TTL matching remaining expiry
func (tb *TokenBlacklist) Add(ctx context.Context, token string, expiry time.Duration) error {
	if tb.client == nil {
		logger.Warn("Token blacklist: Redis not available")
		return nil
	}

	// Hash the token for storage (don't store raw tokens)
	hash := sha256.Sum256([]byte(token))
	key := tb.prefix + hex.EncodeToString(hash[:])

	err := tb.client.Set(ctx, key, "1", expiry).Err()
	if err != nil {
		logger.Error("Failed to blacklist token",
			zap.String("key", key[:16]+"..."),
			zap.Error(err),
		)
		return err
	}

	logger.Debug("Token blacklisted",
		zap.String("key", key[:16]+"..."),
		zap.Duration("ttl", expiry),
	)
	return nil
}

// IsBlacklisted checks if a token is in the blacklist
func (tb *TokenBlacklist) IsBlacklisted(ctx context.Context, token string) bool {
	if tb.client == nil {
		return false
	}

	hash := sha256.Sum256([]byte(token))
	key := tb.prefix + hex.EncodeToString(hash[:])

	exists, err := tb.client.Exists(ctx, key).Result()
	if err != nil {
		logger.Warn("Failed to check token blacklist",
			zap.Error(err),
		)
		return false
	}

	return exists > 0
}

// Remove removes a token from the blacklist
func (tb *TokenBlacklist) Remove(ctx context.Context, token string) error {
	if tb.client == nil {
		return nil
	}

	hash := sha256.Sum256([]byte(token))
	key := tb.prefix + hex.EncodeToString(hash[:])

	return tb.client.Del(ctx, key).Err()
}

// Stats returns blacklist statistics
func (tb *TokenBlacklist) Stats(ctx context.Context) map[string]interface{} {
	stats := map[string]interface{}{
		"enabled": tb.client != nil,
	}

	if tb.client == nil {
		return stats
	}

	// Count blacklisted tokens
	keys, err := tb.client.Keys(ctx, tb.prefix+"*").Result()
	if err == nil {
		stats["count"] = len(keys)
	}

	return stats
}

// Deprecated: Use *TokenBlacklist.Add() with dependency injection instead.
func BlacklistToken(ctx context.Context, token string, expiry time.Duration) error {
	if DefaultBlacklist == nil {
		return nil
	}
	return DefaultBlacklist.Add(ctx, token, expiry)
}

// Deprecated: Use *TokenBlacklist.IsBlacklisted() with dependency injection instead.
func IsTokenBlacklisted(ctx context.Context, token string) bool {
	if DefaultBlacklist == nil {
		return false
	}
	return DefaultBlacklist.IsBlacklisted(ctx, token)
}
