package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/models"
)

// RateLimiter creates a rate limiting middleware using the provided Redis client.
// limit: max requests allowed
// window: time window in seconds
func RateLimiter(rdb *redis.Client, limit int, window int) gin.HandlerFunc {
	return func(c *gin.Context) {
		if rdb == nil {
			c.Next() // Redis not connected, skip rate limiting
			return
		}

		ip := c.ClientIP()
		key := fmt.Sprintf("rate_limit:%s", ip)

		pipeline := rdb.Pipeline()
		incr := pipeline.Incr(c, key)
		pipeline.Expire(c, key, time.Duration(window)*time.Second)
		_, err := pipeline.Exec(c)

		if err != nil {
			// On Redis error, allow request but log warning
			logger.Warn("Rate limit Redis error", zap.Error(err), zap.String("ip", ip))
			c.Next()
			return
		}

		count := incr.Val()
		if count > int64(limit) {
			logger.Warn("Rate limit exceeded",
				zap.String("ip", ip),
				zap.Int64("count", count),
				zap.Int("limit", limit),
			)

			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", window))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "RATE_LIMITED",
					"message": "Too many requests. Please try again later.",
				},
			})
			return
		}

		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", int64(limit)-count))
		c.Next()
	}
}

// RateLimiterByUser limits requests based on user ID (if authenticated) or IP address.
// This provides more granular rate limiting for authenticated users.
// limit: max requests allowed
// window: time window in seconds
func RateLimiterByUser(rdb *redis.Client, limit int, window int) gin.HandlerFunc {
	return func(c *gin.Context) {
		if rdb == nil {
			c.Next() // Redis not connected, skip rate limiting
			return
		}

		// Determine rate limit key: user ID if authenticated, else IP
		var key string
		var identifier string

		if user, exists := c.Get("user"); exists {
			u := user.(models.User)
			key = fmt.Sprintf("rate_limit:user:%d", u.ID)
			identifier = fmt.Sprintf("user:%d", u.ID)
		} else {
			ip := c.ClientIP()
			key = fmt.Sprintf("rate_limit:ip:%s", ip)
			identifier = fmt.Sprintf("ip:%s", ip)
		}

		pipeline := rdb.Pipeline()
		incr := pipeline.Incr(c, key)
		pipeline.Expire(c, key, time.Duration(window)*time.Second)
		_, err := pipeline.Exec(c)

		if err != nil {
			logger.Warn("Rate limit Redis error",
				zap.Error(err),
				zap.String("identifier", identifier))
			c.Next()
			return
		}

		count := incr.Val()
		if count > int64(limit) {
			logger.Warn("Rate limit exceeded",
				zap.String("identifier", identifier),
				zap.Int64("count", count),
				zap.Int("limit", limit),
			)

			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", window))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "RATE_LIMITED",
					"message": "Too many requests. Please try again later.",
				},
			})
			return
		}

		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", int64(limit)-count))
		c.Next()
	}
}
