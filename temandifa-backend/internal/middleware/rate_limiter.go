package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"temandifa-backend/internal/database"
	"temandifa-backend/internal/logger"
)

// RateLimiter limits requests based on IP address using Redis
// limit: max requests allowed
// window: time window in seconds
func RateLimiter(limit int, window int) gin.HandlerFunc {
	return func(c *gin.Context) {
		if database.RDB == nil {
			c.Next() // Redis not connected, skip rate limiting
			return
		}

		ip := c.ClientIP()
		key := fmt.Sprintf("rate_limit:%s", ip)

		pipeline := database.RDB.Pipeline()
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
				"error": "Too many requests. Please try again later.",
			})
			return
		}

		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", int64(limit)-count))
		c.Next()
	}
}
