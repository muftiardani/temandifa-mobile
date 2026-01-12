package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/goccy/go-json"

	apperrors "temandifa-backend/internal/errors"
)

// ErrorCode is an alias to the centralized error code type
type ErrorCode = apperrors.ErrorCode

// Re-export error codes for backward compatibility
// New code should import from errors package directly
const (
	// Authentication errors
	ErrCodeUnauthorized       = apperrors.ErrCodeUnauthorized
	ErrCodeInvalidToken       = apperrors.ErrCodeTokenInvalid
	ErrCodeTokenExpired       = apperrors.ErrCodeTokenExpired
	ErrCodeInvalidCredentials = apperrors.ErrCodeInvalidCredentials

	// Validation errors
	ErrCodeValidation   = apperrors.ErrCodeValidation
	ErrCodeInvalidInput = apperrors.ErrCodeInvalidInput
	ErrCodeMissingField = apperrors.ErrCodeMissingField

	// Resource errors
	ErrCodeNotFound      = apperrors.ErrCodeNotFound
	ErrCodeAlreadyExists = apperrors.ErrCodeAlreadyExist
	ErrCodeConflict      = apperrors.ErrCodeConflict

	// Rate limiting
	ErrCodeRateLimited = apperrors.ErrCodeRateLimited

	// Server errors
	ErrCodeInternal           = apperrors.ErrCodeInternal
	ErrCodeServiceUnavailable = apperrors.ErrCodeServiceUnavailable
	ErrCodeDatabaseError      = apperrors.ErrCodeDatabaseError
	ErrCodeAIServiceError     = apperrors.ErrCodeAIServiceError

	// File errors
	ErrCodeFileTooLarge    = apperrors.ErrCodeFileTooLarge
	ErrCodeInvalidFileType = apperrors.ErrCodeInvalidFileType
)

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Success   bool      `json:"success"`
	Error     ErrorInfo `json:"error"`
	RequestID string    `json:"request_id,omitempty"`
}

// ErrorInfo contains error details
type ErrorInfo struct {
	Code    ErrorCode `json:"code"`
	Message string    `json:"message"`
	Details any       `json:"details,omitempty"`
}

// SuccessResponse represents a standardized success response
type SuccessResponse struct {
	Success   bool   `json:"success"`
	Data      any    `json:"data,omitempty"`
	Message   string `json:"message,omitempty"`
	Meta      any    `json:"meta,omitempty"`
	RequestID string `json:"request_id,omitempty"`
}

// getRequestID retrieves request ID from context
func getRequestID(c *gin.Context) string {
	if id, exists := c.Get("request_id"); exists {
		return id.(string)
	}
	return ""
}

// Internal helper for fast JSON rendering
func renderJSON(c *gin.Context, status int, data any) {
	c.Header("Content-Type", "application/json; charset=utf-8")
	
	// Use goccy/go-json for performance
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		// Fallback to standard Gin JSON if marshaling fails (unlikely)
		c.JSON(status, data)
		return
	}
	
	c.Data(status, "application/json; charset=utf-8", jsonBytes)
}

// Error sends a standardized error response
func Error(c *gin.Context, status int, code ErrorCode, message string, details ...any) {
	response := ErrorResponse{
		Success:   false,
		RequestID: getRequestID(c),
		Error: ErrorInfo{
			Code:    code,
			Message: message,
		},
	}

	if len(details) > 0 {
		response.Error.Details = details[0]
	}

	renderJSON(c, status, response)
}

// Success sends a standardized success response
func Success(c *gin.Context, data any, message ...string) {
	response := SuccessResponse{
		Success:   true,
		Data:      data,
		RequestID: getRequestID(c),
	}

	if len(message) > 0 {
		response.Message = message[0]
	}

	renderJSON(c, http.StatusOK, response)
}

// SuccessWithMeta sends a success response with metadata (for pagination)
func SuccessWithMeta(c *gin.Context, data any, meta any) {
	response := SuccessResponse{
		Success:   true,
		Data:      data,
		Meta:      meta,
		RequestID: getRequestID(c),
	}

	renderJSON(c, http.StatusOK, response)
}

// Created sends a 201 response for resource creation
func Created(c *gin.Context, data any, message string) {
	response := SuccessResponse{
		Success:   true,
		Data:      data,
		Message:   message,
		RequestID: getRequestID(c),
	}

	renderJSON(c, http.StatusCreated, response)
}

// NoContent sends a 204 response
func NoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

// --- Convenience error functions ---

// BadRequest sends a 400 error
func BadRequest(c *gin.Context, message string, details ...any) {
	Error(c, http.StatusBadRequest, ErrCodeValidation, message, details...)
}

// Unauthorized sends a 401 error
func Unauthorized(c *gin.Context, message string) {
	Error(c, http.StatusUnauthorized, ErrCodeUnauthorized, message)
}

// Forbidden sends a 403 error
func Forbidden(c *gin.Context, message string) {
	Error(c, http.StatusForbidden, ErrCodeUnauthorized, message)
}

// NotFound sends a 404 error
func NotFound(c *gin.Context, resource string) {
	Error(c, http.StatusNotFound, ErrCodeNotFound, resource+" not found")
}

// Conflict sends a 409 error
func Conflict(c *gin.Context, message string) {
	Error(c, http.StatusConflict, ErrCodeAlreadyExists, message)
}

// TooManyRequests sends a 429 error
func TooManyRequests(c *gin.Context, message string) {
	Error(c, http.StatusTooManyRequests, ErrCodeRateLimited, message)
}

// InternalError sends a 500 error
func InternalError(c *gin.Context, message string) {
	Error(c, http.StatusInternalServerError, ErrCodeInternal, message)
}

// ServiceUnavailable sends a 503 error
func ServiceUnavailable(c *gin.Context, service string) {
	Error(c, http.StatusServiceUnavailable, ErrCodeServiceUnavailable, service+" is temporarily unavailable")
}
