package middleware

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"temandifa-backend/internal/logger"
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

// RequestID adds a unique request ID to each request for tracing
// The ID is added to the context and response headers
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if client provided a request ID
		requestID := c.GetHeader("X-Request-ID")

		// Generate new ID if not provided
		if requestID == "" {
			requestID = generateRequestID()
		}

		// Set request ID in context
		c.Set("request_id", requestID)

		// Add to response headers
		c.Header("X-Request-ID", requestID)

		// Add to logger context for this request
		logger.Debug("Request started",
			zap.String("request_id", requestID),
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.String("client_ip", c.ClientIP()),
		)

		c.Next()

		// Log request completion
		logger.Debug("Request completed",
			zap.String("request_id", requestID),
			zap.Int("status", c.Writer.Status()),
		)
	}
}

// generateRequestID creates a unique ID using timestamp and random suffix
func generateRequestID() string {
	return fmt.Sprintf("%d-%04x", time.Now().UnixNano(), rand.Intn(0xFFFF))
}

// GetRequestID retrieves the request ID from context
func GetRequestID(c *gin.Context) string {
	if requestID, exists := c.Get("request_id"); exists {
		return requestID.(string)
	}
	return ""
}
