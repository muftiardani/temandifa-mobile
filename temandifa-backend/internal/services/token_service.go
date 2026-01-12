package services

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"temandifa-backend/internal/config"
	apperrors "temandifa-backend/internal/errors"
	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/models"
)

// Token configuration
const (
	AccessTokenDuration  = 15 * time.Minute   // Short-lived access token
	RefreshTokenDuration = 7 * 24 * time.Hour // 7 days
	RefreshTokenLength   = 64                 // bytes
)

// TokenPair contains both access and refresh tokens
type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	TokenType    string    `json:"token_type"`
}

// TokenService handles JWT and refresh token operations
type TokenService interface {
	GenerateTokenPair(user *models.User, userAgent, ipAddress string) (*TokenPair, error)
	RefreshAccessToken(refreshTokenString, userAgent, ipAddress string) (*TokenPair, error)
	ValidateAccessToken(tokenString string) (uint, error)
	RevokeRefreshToken(tokenString string) error
	RevokeAllUserTokens(userID uint) error
	CleanupExpiredTokens() (int64, error)
}

type tokenService struct {
	db        *gorm.DB
	jwtSecret []byte
}

// NewTokenService creates a new token service
func NewTokenService(db *gorm.DB, cfg *config.Config) TokenService {
	if len(cfg.JWTSecret) < 32 {
		logger.Fatal("JWT_SECRET must be at least 32 characters")
	}
	return &tokenService{
		db:        db,
		jwtSecret: []byte(cfg.JWTSecret),
	}
}

// GenerateTokenPair creates a new access/refresh token pair
func (ts *tokenService) GenerateTokenPair(user *models.User, userAgent, ipAddress string) (*TokenPair, error) {
	// Generate access token (JWT)
	accessTokenExpiry := time.Now().Add(AccessTokenDuration)
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  user.ID,
		"exp":  accessTokenExpiry.Unix(),
		"iat":  time.Now().Unix(),
		"type": "access",
	})

	accessTokenString, err := accessToken.SignedString(ts.jwtSecret)
	if err != nil {
		logger.Error("Failed to sign access token", zap.Error(err))
		return nil, apperrors.Internal(err)
	}

	// Generate refresh token (random bytes)
	refreshTokenBytes := make([]byte, RefreshTokenLength)
	if _, err := rand.Read(refreshTokenBytes); err != nil {
		logger.Error("Failed to generate refresh token", zap.Error(err))
		return nil, apperrors.Internal(err)
	}
	refreshTokenString := base64.URLEncoding.EncodeToString(refreshTokenBytes)

	// Store refresh token in database
	refreshToken := models.RefreshToken{
		UserID:    user.ID,
		Token:     refreshTokenString,
		ExpiresAt: time.Now().Add(RefreshTokenDuration),
		UserAgent: userAgent,
		IPAddress: ipAddress,
	}

	if err := ts.db.Create(&refreshToken).Error; err != nil {
		logger.Error("Failed to store refresh token", zap.Error(err))
		return nil, apperrors.Database(err)
	}

	logger.Debug("Token pair generated",
		zap.Uint("user_id", user.ID),
		zap.Time("access_expires", accessTokenExpiry),
	)

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresAt:    accessTokenExpiry,
		TokenType:    "Bearer",
	}, nil
}

// RefreshAccessToken validates refresh token and generates new token pair
func (ts *tokenService) RefreshAccessToken(refreshTokenString, userAgent, ipAddress string) (*TokenPair, error) {
	// Find refresh token
	var refreshToken models.RefreshToken
	err := ts.db.Where("token = ?", refreshTokenString).
		Preload("User").
		First(&refreshToken).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			logger.Debug("Refresh token not found")
			return nil, apperrors.ErrTokenExpired
		}
		logger.Error("Database error finding refresh token", zap.Error(err))
		return nil, apperrors.Database(err)
	}

	// Validate token
	if !refreshToken.IsValid() {
		logger.Debug("Refresh token expired or revoked",
			zap.Uint("token_id", refreshToken.ID),
			zap.Bool("revoked", refreshToken.Revoked),
		)
		return nil, apperrors.ErrTokenRevoked
	}

	// Revoke old token (token rotation)
	refreshToken.Revoke()
	if err := ts.db.Save(&refreshToken).Error; err != nil {
		logger.Error("Failed to revoke old refresh token", zap.Error(err))
	}

	// Generate new token pair
	return ts.GenerateTokenPair(&refreshToken.User, userAgent, ipAddress)
}

// ValidateAccessToken validates an access token and returns user ID
func (ts *tokenService) ValidateAccessToken(tokenString string) (uint, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return ts.jwtSecret, nil
	})

	if err != nil {
		return 0, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {

		if tokenType, exists := claims["type"]; exists && tokenType != "access" {
			return 0, errors.New("invalid token type")
		}

		if userID, ok := claims["sub"].(float64); ok {
			return uint(userID), nil
		}
	}

	return 0, errors.New("invalid token claims")
}

// RevokeRefreshToken revokes a specific refresh token
func (ts *tokenService) RevokeRefreshToken(tokenString string) error {
	result := ts.db.Model(&models.RefreshToken{}).
		Where("token = ?", tokenString).
		Updates(map[string]interface{}{
			"revoked":    true,
			"revoked_at": time.Now(),
		})

	if result.RowsAffected == 0 {
		return errors.New("token not found")
	}
	return result.Error
}

// RevokeAllUserTokens revokes all refresh tokens for a user
func (ts *tokenService) RevokeAllUserTokens(userID uint) error {
	result := ts.db.Model(&models.RefreshToken{}).
		Where("user_id = ? AND revoked = ?", userID, false).
		Updates(map[string]interface{}{
			"revoked":    true,
			"revoked_at": time.Now(),
		})

	logger.Info("Revoked all user tokens",
		zap.Uint("user_id", userID),
		zap.Int64("count", result.RowsAffected),
	)
	return result.Error
}

// CleanupExpiredTokens removes old expired tokens from database
func (ts *tokenService) CleanupExpiredTokens() (int64, error) {
	// Delete tokens that expired more than 7 days ago
	cutoff := time.Now().Add(-7 * 24 * time.Hour)
	result := ts.db.Where("expires_at < ?", cutoff).Delete(&models.RefreshToken{})

	if result.Error != nil {
		logger.Error("Failed to cleanup expired tokens", zap.Error(result.Error))
		return 0, result.Error
	}

	if result.RowsAffected > 0 {
		logger.Info("Cleaned up expired tokens", zap.Int64("count", result.RowsAffected))
	}
	return result.RowsAffected, nil
}

