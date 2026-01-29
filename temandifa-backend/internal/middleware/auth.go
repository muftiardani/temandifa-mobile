package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/models"
	"temandifa-backend/internal/repositories"
	"temandifa-backend/internal/services"
)

// Auth validates JWT token and attaches user to context.
// Uses dependency injection for userRepo, userCache, and tokenBlacklist.
func Auth(jwtSecret string, userRepo repositories.UserRepository, userCache services.UserCacheService, tokenBlacklist *services.TokenBlacklist) gin.HandlerFunc {
	secret := []byte(jwtSecret)
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			logger.Debug("Missing authorization header", zap.String("path", c.Request.URL.Path))
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Authorization header required",
				},
			})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		if tokenBlacklist != nil && tokenBlacklist.IsBlacklisted(c.Request.Context(), tokenString) {
			logger.Debug("Token is blacklisted", zap.String("path", c.Request.URL.Path))
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "TOKEN_REVOKED",
					"message": "Token has been revoked",
				},
			})
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return secret, nil
		})

		if err != nil || !token.Valid {
			logger.Debug("Invalid token", zap.Error(err))
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "TOKEN_INVALID",
					"message": "Invalid token",
				},
			})
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			userId := uint(claims["sub"].(float64))

			// Try to get user from cache first (using injected UserCacheService)
			if userCache != nil {
				cachedUser, err := userCache.GetCachedUser(c.Request.Context(), userId)
				if err == nil && cachedUser != nil {
					// Cache hit - create minimal user object
					user := models.User{
						Email:    cachedUser.Email,
						FullName: cachedUser.FullName,
						Role:     cachedUser.Role,
					}
					user.ID = cachedUser.ID
					c.Set("user", user)
					logger.Debug("User authenticated (cached)",
						zap.Uint("user_id", user.ID),
						zap.String("email", user.Email),
					)
					c.Next()
					return
				}

				// Log cache errors (except not found)
				if err != nil && err != redis.Nil {
					logger.Debug("User cache error", zap.Error(err))
				}
			}

			// Cache miss or no cache - fetch from database using repository
			user, err := userRepo.FindByID(userId)
			if err != nil || user == nil {
				logger.Debug("User not found from token", zap.Uint("user_id", userId))
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
					"success": false,
					"error": gin.H{
						"code":    "NOT_FOUND",
						"message": "User not found",
					},
				})
				return
			}

			// Cache the user for future requests (if cache available)
			if userCache != nil {
				if cacheErr := userCache.SetCachedUser(c.Request.Context(), user); cacheErr != nil {
					logger.Debug("Failed to cache user", zap.Error(cacheErr))
				}
			}

			// Attach user to context
			c.Set("user", *user)
			logger.Debug("User authenticated",
				zap.Uint("user_id", user.ID),
				zap.String("email", user.Email),
			)
			c.Next()
		} else {
			logger.Debug("Invalid token claims")
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "TOKEN_INVALID",
					"message": "Invalid token claims",
				},
			})
		}
	}
}
