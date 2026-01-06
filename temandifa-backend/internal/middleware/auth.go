package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"

	"temandifa-backend/internal/database"
	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/models"
)

// getJwtSecret retrieves JWT secret from environment
func getJwtSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		if os.Getenv("GIN_MODE") == "release" {
			logger.Fatal("JWT_SECRET environment variable is required in production")
		}
		logger.Warn("Using default JWT secret. Set JWT_SECRET in production!")
		return []byte("dev-secret-change-in-production")
	}
	if len(secret) < 32 {
		logger.Fatal("JWT_SECRET must be at least 32 characters for security")
	}
	return []byte(secret)
}

// Auth validates JWT token and attaches user to context
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			logger.Debug("Missing authorization header", zap.String("path", c.Request.URL.Path))
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return getJwtSecret(), nil
		})

		if err != nil || !token.Valid {
			logger.Debug("Invalid token", zap.Error(err))
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			// Check if user exists
			userId := uint(claims["sub"].(float64))
			var user models.User
			if result := database.DB.First(&user, userId); result.Error != nil {
				logger.Debug("User not found from token", zap.Uint("user_id", userId))
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
				return
			}

			// Attach user to context
			c.Set("user", user)
			logger.Debug("User authenticated",
				zap.Uint("user_id", user.ID),
				zap.String("email", user.Email),
			)
			c.Next()
		} else {
			logger.Debug("Invalid token claims")
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
		}
	}
}
