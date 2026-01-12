package services

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"temandifa-backend/internal/logger"
)

// CacheService defines the interface for caching operations
type CacheService interface {
	Get(ctx context.Context, key string) ([]byte, bool)
	Set(ctx context.Context, key string, data []byte, ttl time.Duration) error
	SetAsync(ctx context.Context, key string, data []byte, ttl time.Duration)
	GetJSON(ctx context.Context, key string, dest interface{}) bool
	SetJSON(ctx context.Context, key string, data interface{}, ttl time.Duration) error
	Delete(ctx context.Context, key string) error
	ClearByPrefix(ctx context.Context, prefix string) (int64, error)
	GetStats(ctx context.Context) map[string]interface{}
	GenerateKey(prefix string, data []byte) string
	WaitForCompletion()
}

type redisCacheService struct {
	client *redis.Client
	wg     sync.WaitGroup
}

// NewCacheService creates a new Redis-based cache service
func NewCacheService(client *redis.Client) CacheService {
	return &redisCacheService{
		client: client,
	}
}

func (s *redisCacheService) GenerateKey(prefix string, data []byte) string {
	hash := sha256.Sum256(data)
	return prefix + ":" + hex.EncodeToString(hash[:16])
}

func (s *redisCacheService) Get(ctx context.Context, key string) ([]byte, bool) {
	if s.client == nil {
		return nil, false
	}

	data, err := s.client.Get(ctx, key).Bytes()
	if err != nil {
		return nil, false
	}

	logger.Debug("Cache hit", zap.String("key", key))
	return data, true
}

func (s *redisCacheService) Set(ctx context.Context, key string, data []byte, ttl time.Duration) error {
	if s.client == nil {
		return nil
	}

	err := s.client.Set(ctx, key, data, ttl).Err()
	if err != nil {
		logger.Warn("Failed to set cache", zap.String("key", key), zap.Error(err))
		return err
	}

	logger.Debug("Cache set", zap.String("key", key), zap.Duration("ttl", ttl))
	return nil
}

func (s *redisCacheService) SetAsync(ctx context.Context, key string, data []byte, ttl time.Duration) {
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		detachedCtx := context.WithoutCancel(ctx)
		_ = s.Set(detachedCtx, key, data, ttl)
	}()
}

func (s *redisCacheService) GetJSON(ctx context.Context, key string, dest interface{}) bool {
	data, found := s.Get(ctx, key)
	if !found {
		return false
	}

	err := json.Unmarshal(data, dest)
	if err != nil {
		logger.Warn("Failed to unmarshal cached data", zap.String("key", key), zap.Error(err))
		return false
	}
	return true
}

func (s *redisCacheService) SetJSON(ctx context.Context, key string, data interface{}, ttl time.Duration) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}
	return s.Set(ctx, key, jsonData, ttl)
}

func (s *redisCacheService) Delete(ctx context.Context, key string) error {
	if s.client == nil {
		return nil
	}
	return s.client.Del(ctx, key).Err()
}

func (s *redisCacheService) ClearByPrefix(ctx context.Context, prefix string) (int64, error) {
	if s.client == nil {
		return 0, nil
	}

	var cursor uint64
	var deleted int64

	for {
		keys, nextCursor, err := s.client.Scan(ctx, cursor, prefix+"*", 100).Result()
		if err != nil {
			return deleted, err
		}

		if len(keys) > 0 {
			n, err := s.client.Del(ctx, keys...).Result()
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
	return deleted, nil
}

func (s *redisCacheService) GetStats(ctx context.Context) map[string]interface{} {
	stats := map[string]interface{}{
		"connected": s.client != nil,
	}

	if s.client != nil {
		if dbSize, err := s.client.DBSize(ctx).Result(); err == nil {
			stats["key_count"] = dbSize
		}
		if info, err := s.client.Info(ctx, "memory").Result(); err == nil {
			stats["memory_info"] = info // Simplified
		}
	}
	return stats
}

func (s *redisCacheService) WaitForCompletion() {
	done := make(chan struct{})
	go func() {
		s.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		logger.Info("All cache operations completed")
	case <-time.After(5 * time.Second):
		logger.Warn("Timeout waiting for cache operations")
	}
}
