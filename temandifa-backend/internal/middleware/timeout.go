package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"temandifa-backend/internal/config"
)

// Timeout creates a middleware that adds a timeout to the request context
func Timeout(timeout time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Create a context with timeout
		ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
		defer cancel()

		// Replace request with new context
		c.Request = c.Request.WithContext(ctx)

		// Create channel to track completion
		done := make(chan struct{})

		go func() {
			c.Next()
			close(done)
		}()

		select {
		case <-done:
			// Request completed normally
			return
		case <-ctx.Done():
			// Timeout occurred
			c.AbortWithStatusJSON(http.StatusGatewayTimeout, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "TIMEOUT",
					"message": "The request took too long to process",
				},
			})
			return
		}
	}
}

// ---- Per-Operation AI Timeouts (Configurable) ----

// DetectTimeout returns a timeout middleware for object detection operations
func DetectTimeout(cfg *config.Config) gin.HandlerFunc {
	return Timeout(cfg.AIDetectTimeout)
}

// OCRTimeout returns a timeout middleware for OCR/text extraction operations
func OCRTimeout(cfg *config.Config) gin.HandlerFunc {
	return Timeout(cfg.AIOCRTimeout)
}

// TranscribeTimeout returns a timeout middleware for audio transcription operations
func TranscribeTimeout(cfg *config.Config) gin.HandlerFunc {
	return Timeout(cfg.AITranscribeTimeout)
}

// VQATimeout returns a timeout middleware for Visual Question Answering operations
func VQATimeout(cfg *config.Config) gin.HandlerFunc {
	return Timeout(cfg.AIVQATimeout)
}
