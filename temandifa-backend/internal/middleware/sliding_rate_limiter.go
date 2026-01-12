package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"temandifa-backend/internal/logger"
)

// SlidingWindowRateLimiter implements a sliding window rate limiter using Redis sorted sets.
// This provides more accurate rate limiting compared to fixed window by tracking
// exact request timestamps within the window period.
// limit: max requests allowed within the window
// window: time window duration
func SlidingWindowRateLimiter(rdb *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if rdb == nil {
			c.Next() // Redis not connected, skip rate limiting
			return
		}

		ip := c.ClientIP()
		key := fmt.Sprintf("sliding_rate:%s", ip)
		now := time.Now()
		windowStart := now.Add(-window)

		// Use a pipeline for atomic operations
		pipe := rdb.Pipeline()

		// Remove old entries outside the window
		pipe.ZRemRangeByScore(c, key, "0", fmt.Sprintf("%d", windowStart.UnixNano()))

		// Add current request with current timestamp as score
		pipe.ZAdd(c, key, redis.Z{
			Score:  float64(now.UnixNano()),
			Member: fmt.Sprintf("%d", now.UnixNano()),
		})

		// Count requests in current window
		countCmd := pipe.ZCard(c, key)

		// Set expiry on the key to auto-cleanup
		pipe.Expire(c, key, window+time.Second)

		_, err := pipe.Exec(c)
		if err != nil {
			logger.Warn("Sliding rate limit Redis error", zap.Error(err), zap.String("ip", ip))
			c.Next()
			return
		}

		count := countCmd.Val()
		remaining := int64(limit) - count
		if remaining < 0 {
			remaining = 0
		}

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", now.Add(window).Unix()))

		if count > int64(limit) {
			logger.Warn("Sliding rate limit exceeded",
				zap.String("ip", ip),
				zap.Int64("count", count),
				zap.Int("limit", limit),
			)

			retryAfter := int(window.Seconds())
			c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "RATE_LIMITED",
					"message": "Too many requests. Please try again later.",
				},
			})
			return
		}

		c.Next()
	}
}

// SlidingWindowRateLimiterByUser implements sliding window rate limiting by user ID or IP.
// Authenticated users get their own quota, while unauthenticated users share IP-based limits.
func SlidingWindowRateLimiterByUser(rdb *redis.Client, limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if rdb == nil {
			c.Next()
			return
		}

		// Determine key based on authentication
		var key string
		var identifier string

		if userID, exists := c.Get("user_id"); exists {
			id := userID.(uint)
			key = fmt.Sprintf("sliding_rate:user:%d", id)
			identifier = fmt.Sprintf("user:%d", id)
		} else {
			ip := c.ClientIP()
			key = fmt.Sprintf("sliding_rate:ip:%s", ip)
			identifier = fmt.Sprintf("ip:%s", ip)
		}

		now := time.Now()
		windowStart := now.Add(-window)

		pipe := rdb.Pipeline()
		pipe.ZRemRangeByScore(c, key, "0", fmt.Sprintf("%d", windowStart.UnixNano()))
		pipe.ZAdd(c, key, redis.Z{
			Score:  float64(now.UnixNano()),
			Member: fmt.Sprintf("%d", now.UnixNano()),
		})
		countCmd := pipe.ZCard(c, key)
		pipe.Expire(c, key, window+time.Second)

		_, err := pipe.Exec(c)
		if err != nil {
			logger.Warn("Sliding rate limit Redis error",
				zap.Error(err),
				zap.String("identifier", identifier))
			c.Next()
			return
		}

		count := countCmd.Val()
		remaining := int64(limit) - count
		if remaining < 0 {
			remaining = 0
		}

		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", now.Add(window).Unix()))

		if count > int64(limit) {
			logger.Warn("Sliding rate limit exceeded",
				zap.String("identifier", identifier),
				zap.Int64("count", count),
				zap.Int("limit", limit),
			)

			c.Header("Retry-After", fmt.Sprintf("%d", int(window.Seconds())))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "RATE_LIMITED",
					"message": "Too many requests. Please try again later.",
				},
			})
			return
		}

		c.Next()
	}
}
