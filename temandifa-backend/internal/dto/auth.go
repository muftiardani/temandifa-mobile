package dto

import "time"

// AuthRequest DTOs

// RegisterRequest represents the registration request payload
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email,max=255"`
	Password string `json:"password" binding:"required,min=8,max=72"`
	FullName string `json:"full_name" binding:"required,min=2,max=100"`
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email,max=255"`
	Password string `json:"password" binding:"required,max=72"`
}

// RefreshTokenRequest represents the token refresh request
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// AuthResponse DTOs

// TokenResponse represents the authentication token response
type TokenResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	TokenType    string    `json:"token_type"`
}

// LoginResponse represents the full login response with user info
type LoginResponse struct {
	TokenResponse
	User UserInfo `json:"user"`
}

// UserInfo represents public user information
type UserInfo struct {
	ID       uint   `json:"id"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Role     string `json:"role,omitempty"`
}

// UserResponse represents a user in API responses
type UserResponse struct {
	ID             uint      `json:"id"`
	Email          string    `json:"email"`
	FullName       string    `json:"full_name"`
	ProfilePicture string    `json:"profile_picture,omitempty"`
	Role           string    `json:"role"`
	CreatedAt      time.Time `json:"created_at"`
}
