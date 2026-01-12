// Package errors provides standardized error codes and error handling utilities
// for the TemanDifa backend API.
package errors

// ErrorCode represents standardized API error codes
// These codes are used across the application for consistent error responses.
type ErrorCode string

const (
	// Authentication & Authorization errors
	ErrCodeUnauthorized       ErrorCode = "UNAUTHORIZED"
	ErrCodeInvalidCredentials ErrorCode = "INVALID_CREDENTIALS"
	ErrCodeTokenExpired       ErrorCode = "TOKEN_EXPIRED"
	ErrCodeTokenInvalid       ErrorCode = "TOKEN_INVALID"
	ErrCodeTokenRevoked       ErrorCode = "TOKEN_REVOKED"
	ErrCodeForbidden          ErrorCode = "FORBIDDEN"

	// Validation errors
	ErrCodeValidation    ErrorCode = "VALIDATION_ERROR"
	ErrCodeInvalidInput  ErrorCode = "INVALID_INPUT"
	ErrCodeMissingField  ErrorCode = "MISSING_FIELD"
	ErrCodeInvalidFormat ErrorCode = "INVALID_FORMAT"

	// Resource errors
	ErrCodeNotFound     ErrorCode = "NOT_FOUND"
	ErrCodeConflict     ErrorCode = "CONFLICT"
	ErrCodeAlreadyExist ErrorCode = "ALREADY_EXISTS"

	// Rate Limiting
	ErrCodeRateLimited ErrorCode = "RATE_LIMITED"

	// External Services
	ErrCodeAIServiceDown   ErrorCode = "AI_SERVICE_UNAVAILABLE"
	ErrCodeAIServiceError  ErrorCode = "AI_SERVICE_ERROR"
	ErrCodeDatabaseError   ErrorCode = "DATABASE_ERROR"
	ErrCodeCacheError      ErrorCode = "CACHE_ERROR"
	ErrCodeExternalService ErrorCode = "EXTERNAL_SERVICE_ERROR"

	// Server errors
	ErrCodeInternal           ErrorCode = "INTERNAL_ERROR"
	ErrCodeTimeout            ErrorCode = "TIMEOUT"
	ErrCodeServiceUnavailable ErrorCode = "SERVICE_UNAVAILABLE"

	// File errors
	ErrCodeFileTooLarge    ErrorCode = "FILE_TOO_LARGE"
	ErrCodeInvalidFileType ErrorCode = "INVALID_FILE_TYPE"
)
