package logger

import (
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// GinLogger returns a Gin middleware for request logging using zap
func GinLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Calculate latency
		latency := time.Since(start)

		// Get status code
		status := c.Writer.Status()

		// Get client IP
		clientIP := c.ClientIP()

		// Build log fields
		fields := []zap.Field{
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.Int("status", status),
			zap.Duration("latency", latency),
			zap.String("client_ip", clientIP),
			zap.Int("body_size", c.Writer.Size()),
		}

		if query != "" {
			fields = append(fields, zap.String("query", query))
		}

		if requestID := c.GetHeader("X-Request-ID"); requestID != "" {
			fields = append(fields, zap.String("request_id", requestID))
		}

		if userAgent := c.Request.UserAgent(); userAgent != "" {
			fields = append(fields, zap.String("user_agent", userAgent))
		}

		// Add error if exists
		if len(c.Errors) > 0 {
			fields = append(fields, zap.String("errors", c.Errors.String()))
		}

		// Log based on status code
		if status >= 500 {
			Log.Error("HTTP Request", fields...)
		} else if status >= 400 {
			Log.Warn("HTTP Request", fields...)
		} else {
			Log.Info("HTTP Request", fields...)
		}
	}
}

// GinRecovery returns a Gin middleware for panic recovery with logging
func GinRecovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				Log.Error("Panic recovered",
					zap.Any("error", err),
					zap.String("path", c.Request.URL.Path),
					zap.String("method", c.Request.Method),
				)

				c.AbortWithStatusJSON(500, gin.H{
					"success": false,
					"error": gin.H{
						"code":    "INTERNAL_ERROR",
						"message": "Internal server error",
					},
				})
			}
		}()

		c.Next()
	}
}
