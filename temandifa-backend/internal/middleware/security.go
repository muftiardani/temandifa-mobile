package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"temandifa-backend/internal/response"
)

// SecurityHeaders adds security-related HTTP headers
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")
		
		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")
		
		// XSS Protection
		c.Header("X-XSS-Protection", "1; mode=block")
		
		// Referrer policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		
		// Content Security Policy (basic)
		c.Header("Content-Security-Policy", "default-src 'self'")
		
		// Permissions Policy
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		// HSTS (HTTP Strict Transport Security) - only for production with HTTPS
		// This tells browsers to only use HTTPS for 1 year, including subdomains
		if gin.Mode() == gin.ReleaseMode {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}

		c.Next()
	}
}

// MaxBodySize limits the request body size
func MaxBodySize(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only apply to requests with body
		if c.Request.ContentLength > maxBytes {
			response.Error(c, http.StatusRequestEntityTooLarge, response.ErrCodeFileTooLarge, "Request body too large")
			c.Abort()
			return
		}

		// Also limit the reader to prevent slow loris attacks
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		
		c.Next()
	}
}

// CORS with configurable origins
func CORSCustom(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// Check if origin is allowed
		allowed := false
		for _, o := range allowedOrigins {
			if o == "*" || o == origin {
				allowed = true
				break
			}
		}
		
		if allowed && origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token, X-Request-ID")
		c.Header("Access-Control-Expose-Headers", "X-Request-ID")
		c.Header("Access-Control-Max-Age", "86400")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
