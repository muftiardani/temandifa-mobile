package services

import (
	"golang.org/x/crypto/bcrypt"

	"temandifa-backend/internal/dto"
	apperrors "temandifa-backend/internal/errors"
	"temandifa-backend/internal/helpers"
	"temandifa-backend/internal/models"
	"temandifa-backend/internal/repositories"
)

// AuthService handles authentication logic
type AuthService interface {
	Register(input dto.RegisterRequest) (*models.User, error)
	Login(input dto.LoginRequest, userAgent, ipAddress string) (*dto.LoginResponse, error)
}

type authService struct {
	userRepo     repositories.UserRepository
	tokenService TokenService
}

// NewAuthService creates a new AuthService
func NewAuthService(userRepo repositories.UserRepository, tokenService TokenService) AuthService {
	return &authService{
		userRepo:     userRepo,
		tokenService: tokenService,
	}
}

// Register creates a new user account
func (s *authService) Register(input dto.RegisterRequest) (*models.User, error) {
	// Validate password strength
	if issues := helpers.ValidatePasswordStrength(input.Password); len(issues) > 0 {
		return nil, apperrors.ValidationWithDetails("Password does not meet security requirements", issues)
	}

	// Check if user exists
	existingUser, err := s.userRepo.FindByEmail(input.Email)
	if err != nil {
		return nil, apperrors.Database(err)
	}
	if existingUser != nil {
		return nil, apperrors.AlreadyExists("email")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, apperrors.Internal(err)
	}

	user := &models.User{
		FullName: input.FullName,
		Email:    input.Email,
		Password: string(hashedPassword),
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, apperrors.Database(err)
	}

	// Clear password for response
	user.Password = ""
	return user, nil
}

// Login authenticates a user and returns tokens
func (s *authService) Login(input dto.LoginRequest, userAgent, ipAddress string) (*dto.LoginResponse, error) {
	user, err := s.userRepo.FindByEmail(input.Email)
	if err != nil {
		return nil, apperrors.Database(err)
	}
	if user == nil {
		return nil, apperrors.ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		return nil, apperrors.ErrInvalidCredentials
	}

	tokenPair, err := s.tokenService.GenerateTokenPair(user, userAgent, ipAddress)
	if err != nil {
		return nil, err
	}

	return &dto.LoginResponse{
		TokenResponse: dto.TokenResponse{
			AccessToken:  tokenPair.AccessToken,
			RefreshToken: tokenPair.RefreshToken,
			ExpiresAt:    tokenPair.ExpiresAt,
			TokenType:    tokenPair.TokenType,
		},
		User: dto.UserInfo{
			ID:       user.ID,
			FullName: user.FullName,
			Email:    user.Email,
		},
	}, nil
}
