package middleware

import (
	"github.com/gin-gonic/gin"

	"temandifa-backend/internal/models"
	"temandifa-backend/internal/response"
)

// Role constants
const (
	RoleUser  = "user"
	RoleAdmin = "admin"
)

// RequireRole creates a middleware that requires a specific role
func RequireRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user from context (set by Auth middleware)
		userInterface, exists := c.Get("user")
		if !exists {
			response.Unauthorized(c, "Authentication required")
			c.Abort()
			return
		}

		user, ok := userInterface.(models.User)
		if !ok {
			response.InternalError(c, "Invalid user context")
			c.Abort()
			return
		}

		if user.Role != role {
			response.Forbidden(c, "Insufficient permissions")
			c.Abort()
			return
		}

		c.Next()
	}
}

// AdminOnly is a convenience middleware for admin-only routes
func AdminOnly() gin.HandlerFunc {
	return RequireRole(RoleAdmin)
}
