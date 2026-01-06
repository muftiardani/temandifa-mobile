package cache

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"time"

	"go.uber.org/zap"

	"temandifa-backend/internal/database"
	"temandifa-backend/internal/logger"
)

// CacheConfig holds cache configuration
type CacheConfig struct {
	DetectionTTL    time.Duration
	OCRTTL          time.Duration
	TranscriptionTTL time.Duration
}

// DefaultCacheConfig returns default cache TTL values
func DefaultCacheConfig() CacheConfig {
	return CacheConfig{
		DetectionTTL:    1 * time.Hour,    // Detection results cached for 1 hour
		OCRTTL:          2 * time.Hour,    // OCR results cached for 2 hours
		TranscriptionTTL: 30 * time.Minute, // Transcription cached for 30 minutes
	}
}

var Config = DefaultCacheConfig()

// GenerateKey creates a cache key from file content hash
func GenerateKey(prefix string, data []byte) string {
	hash := sha256.Sum256(data)
	return prefix + ":" + hex.EncodeToString(hash[:16]) // Use first 16 bytes (32 hex chars)
}

// CacheResult represents a cached AI response
type CacheResult struct {
	Hit      bool
	Data     []byte
	CachedAt time.Time
}

// Get retrieves data from cache
func Get(ctx context.Context, key string) CacheResult {
	if database.RDB == nil {
		return CacheResult{Hit: false}
	}

	data, err := database.RDB.Get(ctx, key).Bytes()
	if err != nil {
		// Cache miss or error
		return CacheResult{Hit: false}
	}

	logger.Debug("Cache hit", zap.String("key", key))
	return CacheResult{
		Hit:  true,
		Data: data,
	}
}

// Set stores data in cache with TTL
func Set(ctx context.Context, key string, data []byte, ttl time.Duration) error {
	if database.RDB == nil {
		return nil // Silently skip if Redis not available
	}

	err := database.RDB.Set(ctx, key, data, ttl).Err()
	if err != nil {
		logger.Warn("Failed to set cache",
			zap.String("key", key),
			zap.Error(err),
		)
		return err
	}

	logger.Debug("Cache set",
		zap.String("key", key),
		zap.Duration("ttl", ttl),
	)
	return nil
}

// SetJSON stores JSON data in cache
func SetJSON(ctx context.Context, key string, data interface{}, ttl time.Duration) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return Set(ctx, key, jsonData, ttl)
}

// GetJSON retrieves and unmarshals JSON data from cache
func GetJSON(ctx context.Context, key string, dest interface{}) bool {
	result := Get(ctx, key)
	if !result.Hit {
		return false
	}

	err := json.Unmarshal(result.Data, dest)
	if err != nil {
		logger.Warn("Failed to unmarshal cached data",
			zap.String("key", key),
			zap.Error(err),
		)
		return false
	}
	return true
}

// Delete removes a key from cache
func Delete(ctx context.Context, key string) error {
	if database.RDB == nil {
		return nil
	}
	return database.RDB.Del(ctx, key).Err()
}

// ClearByPrefix removes all keys with a specific prefix
func ClearByPrefix(ctx context.Context, prefix string) (int64, error) {
	if database.RDB == nil {
		return 0, nil
	}

	var cursor uint64
	var deleted int64

	for {
		keys, nextCursor, err := database.RDB.Scan(ctx, cursor, prefix+"*", 100).Result()
		if err != nil {
			return deleted, err
		}

		if len(keys) > 0 {
			n, err := database.RDB.Del(ctx, keys...).Result()
			if err != nil {
				return deleted, err
			}
			deleted += n
		}

		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	logger.Info("Cache cleared by prefix",
		zap.String("prefix", prefix),
		zap.Int64("deleted", deleted),
	)
	return deleted, nil
}

// Stats returns cache statistics
type CacheStats struct {
	Connected    bool   `json:"connected"`
	KeyCount     int64  `json:"key_count"`
	UsedMemory   string `json:"used_memory"`
}

func GetStats(ctx context.Context) CacheStats {
	stats := CacheStats{Connected: database.RDB != nil}
	
	if database.RDB == nil {
		return stats
	}

	// Get key count
	dbSize, err := database.RDB.DBSize(ctx).Result()
	if err == nil {
		stats.KeyCount = dbSize
	}

	// Get memory info
	info, err := database.RDB.Info(ctx, "memory").Result()
	if err == nil {
		// Parse used_memory from info string (simplified)
		stats.UsedMemory = "available"
		_ = info
	}

	return stats
}
