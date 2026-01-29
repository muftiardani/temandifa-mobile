package errors

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Note: Error codes are defined in codes.go
// Import this package and use errors.ErrCodeXxx for error codes

// AppError represents a structured application error with support for error wrapping
type AppError struct {
	Code       ErrorCode `json:"code"`
	Message    string    `json:"message"`
	Details    any       `json:"details,omitempty"`
	StatusCode int       `json:"-"`
	Err        error     `json:"-"` // Wrapped error for error chain support
}

// Error implements the error interface
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// Unwrap returns the wrapped error for Go 1.13+ error handling
func (e *AppError) Unwrap() error {
	return e.Err
}

// Is reports whether the target error is an AppError with the same code
func (e *AppError) Is(target error) bool {
	t, ok := target.(*AppError)
	if !ok {
		return false
	}
	return e.Code == t.Code
}

// NewAppError creates a new AppError
func NewAppError(code ErrorCode, message string, statusCode int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

// WithDetails adds details to the error
func (e *AppError) WithDetails(details any) *AppError {
	e.Details = details
	return e
}

// Wrap wraps an underlying error, preserving the error chain
func (e *AppError) Wrap(err error) *AppError {
	return &AppError{
		Code:       e.Code,
		Message:    e.Message,
		Details:    e.Details,
		StatusCode: e.StatusCode,
		Err:        err,
	}
}

// WrapWithMessage wraps an error with a custom message
func (e *AppError) WrapWithMessage(err error, message string) *AppError {
	return &AppError{
		Code:       e.Code,
		Message:    message,
		Details:    e.Details,
		StatusCode: e.StatusCode,
		Err:        err,
	}
}

// Common predefined errors
var (
	ErrUnauthorized       = NewAppError(ErrCodeUnauthorized, "Authentication required", http.StatusUnauthorized)
	ErrInvalidCredentials = NewAppError(ErrCodeInvalidCredentials, "Invalid email or password", http.StatusUnauthorized)
	ErrTokenExpired       = NewAppError(ErrCodeTokenExpired, "Token has expired", http.StatusUnauthorized)
	ErrTokenRevoked       = NewAppError(ErrCodeTokenRevoked, "Token has been revoked", http.StatusUnauthorized)
	ErrForbidden          = NewAppError(ErrCodeForbidden, "Access denied", http.StatusForbidden)
	ErrNotFound           = NewAppError(ErrCodeNotFound, "Resource not found", http.StatusNotFound)
	ErrConflict           = NewAppError(ErrCodeConflict, "Resource conflict", http.StatusConflict)
	ErrInternal           = NewAppError(ErrCodeInternal, "Internal server error", http.StatusInternalServerError)
	ErrRateLimited        = NewAppError(ErrCodeRateLimited, "Too many requests", http.StatusTooManyRequests)
	ErrAIService          = NewAppError(ErrCodeAIServiceDown, "AI Service unavailable", http.StatusBadGateway)
	ErrDatabase           = NewAppError(ErrCodeDatabaseError, "Database error", http.StatusInternalServerError)
	ErrCache              = NewAppError(ErrCodeCacheError, "Cache error", http.StatusInternalServerError)
	ErrTimeout            = NewAppError(ErrCodeTimeout, "Request timeout", http.StatusGatewayTimeout)
)

// Helper functions for common error creation

// ValidationWithDetails creates a validation error with details
func ValidationWithDetails(message string, details any) *AppError {
	return NewAppError(ErrCodeValidation, message, http.StatusBadRequest).WithDetails(details)
}

// AlreadyExists creates an already exists error
func AlreadyExists(resource string) *AppError {
	return NewAppError(ErrCodeAlreadyExist, fmt.Sprintf("%s already exists", resource), http.StatusConflict)
}

// Internal creates an internal error wrapping the original error
func Internal(err error) *AppError {
	return ErrInternal.Wrap(err)
}

// Database creates a database error wrapping the original error
func Database(err error) *AppError {
	return ErrDatabase.Wrap(err)
}

// AsAppError attempts to convert an error to AppError
func AsAppError(err error) (*AppError, bool) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr, true
	}
	return nil, false
}

// RespondError sends an error response to the client
func RespondError(c *gin.Context, err *AppError) {
	c.JSON(err.StatusCode, gin.H{
		"success": false,
		"error": gin.H{
			"code":    err.Code,
			"message": err.Message,
			"details": err.Details,
		},
	})
}
