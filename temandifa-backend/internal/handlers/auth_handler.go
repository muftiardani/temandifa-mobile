package handlers

import (
	"errors"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"temandifa-backend/internal/dto"
	apperrors "temandifa-backend/internal/errors"
	"temandifa-backend/internal/helpers"
	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/models"
	"temandifa-backend/internal/response"
	"temandifa-backend/internal/services"
)

type AuthHandler struct {
	AuthService  services.AuthService
	TokenService services.TokenService
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(authService services.AuthService, tokenService services.TokenService) *AuthHandler {
	return &AuthHandler{
		AuthService:  authService,
		TokenService: tokenService,
	}
}

// Register godoc
//
//	@Summary		Register a new user
//	@Description	Create a new user account
//	@Tags			Auth
//	@Accept			json
//	@Produce		json
//	@Param			input	body		dto.RegisterRequest	true	"Registration data"
//	@Success		201		{object}	response.SuccessResponse{data=dto.UserResponse}
//	@Failure		400		{object}	response.ErrorResponse
//	@Failure		409		{object}	response.ErrorResponse
//	@Router			/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var input dto.RegisterRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := helpers.FormatValidationError(err)
		response.Error(c, 400, response.ErrCodeValidation, "Validation failed", validationErrors)
		return
	}

	user, err := h.AuthService.Register(input)
	if err != nil {
		if appErr, ok := apperrors.AsAppError(err); ok {
			if errors.Is(err, apperrors.AlreadyExists("email")) {
				logger.Warn("Registration failed - email may exist",
					zap.String("email", input.Email),
				)
			}
			apperrors.RespondError(c, appErr)
			return
		}
		logger.Error("Failed to register user", zap.Error(err))
		response.InternalError(c, "Failed to process registration")
		return
	}

	logger.Info("User registered successfully",
		zap.Uint("user_id", user.ID),
		zap.String("email", user.Email),
	)

	response.Created(c, user, "Registration successful")
}

// Login godoc
//
//	@Summary		Login user
//	@Description	Authenticate user and return access/refresh token pair
//	@Tags			Auth
//	@Accept			json
//	@Produce		json
//	@Param			input	body		dto.LoginRequest	true	"Login credentials"
//	@Success		200		{object}	response.SuccessResponse{data=dto.LoginResponse}
//	@Failure		400		{object}	response.ErrorResponse
//	@Failure		401		{object}	response.ErrorResponse
//	@Router			/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var input dto.LoginRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		validationErrors := helpers.FormatValidationError(err)
		response.Error(c, 400, response.ErrCodeValidation, "Validation failed", validationErrors)
		return
	}

	tokenResponse, err := h.AuthService.Login(input, c.GetHeader("User-Agent"), c.ClientIP())
	if err != nil {
		if appErr, ok := apperrors.AsAppError(err); ok {
			if errors.Is(err, apperrors.ErrInvalidCredentials) {
				logger.Debug("Login failed - invalid credentials", zap.String("email", input.Email))
			}
			apperrors.RespondError(c, appErr)
			return
		}
		logger.Error("Login failed", zap.Error(err))
		response.InternalError(c, "Login failed")
		return
	}

	logger.Info("User logged in successfully",
		zap.Uint("user_id", tokenResponse.User.ID),
		zap.String("email", tokenResponse.User.Email),
	)

	response.Success(c, tokenResponse)
}

// Refresh godoc
//
//	@Summary		Refresh access token
//	@Description	Exchange refresh token for new access/refresh token pair
//	@Tags			Auth
//	@Accept			json
//	@Produce		json
//	@Param			input	body		dto.RefreshTokenRequest	true	"Refresh token"
//	@Success		200		{object}	response.SuccessResponse{data=dto.TokenResponse}
//	@Failure		400		{object}	response.ErrorResponse
//	@Failure		401		{object}	response.ErrorResponse
//	@Router			/refresh [post]
func (h *AuthHandler) Refresh(c *gin.Context) {
	var input dto.RefreshTokenRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, 400, response.ErrCodeValidation, "Refresh token is required")
		return
	}

	tokenPair, err := h.TokenService.RefreshAccessToken(
		input.RefreshToken,
		c.GetHeader("User-Agent"),
		c.ClientIP(),
	)
	if err != nil {
		logger.Debug("Token refresh failed", zap.Error(err))
		if appErr, ok := apperrors.AsAppError(err); ok {
			apperrors.RespondError(c, appErr)
			return
		}
		response.Error(c, 401, response.ErrCodeTokenExpired, "Token refresh failed")
		return
	}

	// Get user info (TokenService already validated token)
	userID, _ := h.TokenService.ValidateAccessToken(tokenPair.AccessToken)
	
	logger.Debug("Token refreshed",
		zap.Uint("user_id", userID),
	)
	
	// Construct response
	
	response.Success(c, gin.H{
		"access_token":  tokenPair.AccessToken,
		"refresh_token": tokenPair.RefreshToken,
		"expires_at":    tokenPair.ExpiresAt,
		"token_type":    tokenPair.TokenType,
	})
}

// Logout godoc
//
//	@Summary		Logout user
//	@Description	Revoke the current refresh token and blacklist access token
//	@Tags			Auth
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			input	body		dto.RefreshTokenRequest	true	"Refresh token to revoke"
//	@Success		200		{object}	response.SuccessResponse
//	@Failure		400		{object}	response.ErrorResponse
//	@Router			/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	var input dto.RefreshTokenRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, 400, response.ErrCodeValidation, "Refresh token is required")
		return
	}

	// Revoke refresh token
	if err := h.TokenService.RevokeRefreshToken(input.RefreshToken); err != nil {
		logger.Debug("Logout failed - refresh token not found", zap.Error(err))
	}

	// Blacklist the access token to prevent reuse
	authHeader := c.GetHeader("Authorization")
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		accessToken := authHeader[7:]
		if err := services.BlacklistToken(c, accessToken, time.Hour); err != nil {
			logger.Warn("Failed to blacklist access token", zap.Error(err))
		}
	}

	logger.Debug("User logged out")
	response.Success(c, nil, "Logged out successfully")
}

// LogoutAll godoc
//
//	@Summary		Logout from all devices
//	@Description	Revoke all refresh tokens for the authenticated user
//	@Tags			Auth
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{object}	response.SuccessResponse
//	@Failure		401	{object}	response.ErrorResponse
//	@Router			/logout/all [post]
func (h *AuthHandler) LogoutAll(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	if err := h.TokenService.RevokeAllUserTokens(user.ID); err != nil {
		logger.Error("Failed to revoke all tokens", zap.Error(err))
		response.InternalError(c, "Failed to logout from all devices")
		return
	}

	logger.Info("User logged out from all devices",
		zap.Uint("user_id", user.ID),
	)

	response.Success(c, nil, "Logged out from all devices")
}
