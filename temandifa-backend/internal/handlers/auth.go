package handlers

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"temandifa-backend/internal/database"
	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/models"
)

type AuthHandler struct{}

type RegisterInput struct {
	FullName string `json:"full_name" binding:"required,min=2,max=100"`
	Email    string `json:"email" binding:"required,email,max=255"`
	Password string `json:"password" binding:"required,min=8,max=72"` // bcrypt max is 72 bytes
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email,max=255"`
	Password string `json:"password" binding:"required,min=1,max=72"`
}

func getJwtSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Only allow default secret in development mode
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

func (h *AuthHandler) Register(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logger.Debug("Register validation failed",
			zap.Error(err),
			zap.String("email", input.Email),
		)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		logger.Error("Failed to hash password", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user := models.User{
		FullName: input.FullName,
		Email:    input.Email,
		Password: string(hashedPassword),
	}

	if result := database.DB.Create(&user); result.Error != nil {
		logger.Warn("Registration failed - email may exist",
			zap.Error(result.Error),
			zap.String("email", input.Email),
		)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email already registered or DB error"})
		return
	}

	logger.Info("User registered successfully",
		zap.Uint("user_id", user.ID),
		zap.String("email", user.Email),
	)

	c.JSON(http.StatusCreated, gin.H{"message": "Registration successful", "user": user})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logger.Debug("Login validation failed", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		logger.Debug("Login failed - user not found", zap.String("email", input.Email))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		logger.Debug("Login failed - invalid password", zap.String("email", input.Email))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// Generate Token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": user.ID,
		"exp": time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
	})

	tokenString, err := token.SignedString(getJwtSecret())
	if err != nil {
		logger.Error("Failed to generate token",
			zap.Error(err),
			zap.Uint("user_id", user.ID),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	logger.Info("User logged in successfully",
		zap.Uint("user_id", user.ID),
		zap.String("email", user.Email),
	)

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":        user.ID,
			"full_name": user.FullName,
			"email":     user.Email,
		},
	})
}
