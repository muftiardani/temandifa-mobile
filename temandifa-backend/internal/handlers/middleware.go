package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"

	"temandifa-backend/internal/database"
	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/models"
)

func AuthMiddleware() gin.HandlerFunc {
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

// RateLimitMiddleware limits requests based on IP address
// limit: max requests
// window: time window in seconds
func RateLimitMiddleware(limit int, window int) gin.HandlerFunc {
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
