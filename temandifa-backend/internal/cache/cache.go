package cache

import (
	"sync"
	"temandifa-backend/internal/logger"
	"time"
)

// Global WaitGroup for background cache operations
var wg sync.WaitGroup

// WaitForCompletion waits for all background cache operations to finish
func WaitForCompletion() {
	logger.Info("Waiting for background cache operations to complete...")
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		logger.Info("All cache operations completed")
	case <-time.After(5 * time.Second):
		logger.Warn("Timeout waiting for cache operations")
	}
}

// CacheConfig holds cache configuration
type CacheConfig struct {
	DetectionTTL     time.Duration
	OCRTTL           time.Duration
	TranscriptionTTL time.Duration
	VQATTL           time.Duration
}

// DefaultCacheConfig returns default cache TTL values
func DefaultCacheConfig() CacheConfig {
	return CacheConfig{
		DetectionTTL:     1 * time.Hour,    // Detection results cached for 1 hour
		OCRTTL:           2 * time.Hour,    // OCR results cached for 2 hours
		TranscriptionTTL: 30 * time.Minute, // Transcription cached for 30 minutes
		VQATTL:           24 * time.Hour,   // VQA results cached for 24 hours (could be long)
	}
}

var Config = DefaultCacheConfig()

// CacheResult represents a cached AI response
type CacheResult struct {
	Hit      bool
	Data     []byte
	CachedAt time.Time
}
