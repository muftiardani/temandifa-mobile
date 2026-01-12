package helpers

import (
	"context"
	"math"
	"math/rand"
	"time"

	"temandifa-backend/internal/logger"

	"go.uber.org/zap"
)

// RetryConfig holds configuration for retry logic
type RetryConfig struct {
	MaxRetries     int
	InitialBackoff time.Duration
	MaxBackoff     time.Duration
	Multiplier     float64
	Jitter         float64 // Jitter factor (0.0 to 1.0), e.g., 0.25 for 25% jitter
}

// DefaultRetryConfig returns sensible defaults for retry
var DefaultRetryConfig = RetryConfig{
	MaxRetries:     3,
	InitialBackoff: 100 * time.Millisecond,
	MaxBackoff:     5 * time.Second,
	Multiplier:     2.0,
	Jitter:         0.25, // 25% jitter to prevent thundering herd
}

// RetryableFunc is a function that can be retried
type RetryableFunc func() error

// WithRetry executes a function with exponential backoff retry
func WithRetry(ctx context.Context, config RetryConfig, operation string, fn RetryableFunc) error {
	var lastErr error
	backoff := config.InitialBackoff

	for attempt := 0; attempt <= config.MaxRetries; attempt++ {
		if attempt > 0 {
			logger.Debug("Retrying operation",
				zap.String("operation", operation),
				zap.Int("attempt", attempt),
				zap.Duration("backoff", backoff),
			)

			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(addJitter(backoff, config.Jitter)):
				// Continue with retry
			}

			// Calculate next backoff with exponential increase
			backoff = time.Duration(float64(backoff) * config.Multiplier)
			if backoff > config.MaxBackoff {
				backoff = config.MaxBackoff
			}
		}

		lastErr = fn()
		if lastErr == nil {
			if attempt > 0 {
				logger.Debug("Retry succeeded",
					zap.String("operation", operation),
					zap.Int("attempt", attempt),
				)
			}
			return nil
		}
	}

	logger.Error("All retries exhausted",
		zap.String("operation", operation),
		zap.Int("max_retries", config.MaxRetries),
		zap.Error(lastErr),
	)

	return lastErr
}

// CalculateBackoff calculates the backoff duration for a given attempt
func CalculateBackoff(attempt int, initial, max time.Duration, multiplier float64) time.Duration {
	backoff := time.Duration(float64(initial) * math.Pow(multiplier, float64(attempt)))
	if backoff > max {
		return max
	}
	return backoff
}

// addJitter adds random jitter to a duration to prevent thundering herd
func addJitter(d time.Duration, jitterFactor float64) time.Duration {
	if jitterFactor <= 0 {
		return d
	}
	// Add random jitter between -jitterFactor and +jitterFactor
	jitter := (rand.Float64()*2 - 1) * jitterFactor * float64(d)
	return d + time.Duration(jitter)
}
