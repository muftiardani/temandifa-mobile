package helpers

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"

	"github.com/go-playground/validator/v10"
)

// Password validation regex patterns
var (
	hasUpperCase   = regexp.MustCompile(`[A-Z]`)
	hasLowerCase   = regexp.MustCompile(`[a-z]`)
	hasDigit       = regexp.MustCompile(`[0-9]`)
	hasSpecialChar = regexp.MustCompile(`[!@#$%^&*(),.?":{}|<>]`)
)

// FormatValidationError formats validation errors into a user-friendly slice of strings
func FormatValidationError(err error) []string {
	var errors []string

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, e := range validationErrors {
			errors = append(errors, formatFieldError(e))
		}
	} else {
		// If it's a JSON marshalling error or other type
		if strings.Contains(err.Error(), "json") {
			errors = append(errors, "Invalid JSON format")
		} else {
			errors = append(errors, err.Error())
		}
	}

	return errors
}

// formatFieldError creates a user-friendly error message for a single field
func formatFieldError(e validator.FieldError) string {
	field := e.Field()
	
	switch e.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", field)
	case "email":
		return fmt.Sprintf("%s must be a valid email address", field)
	case "min":
		return fmt.Sprintf("%s must be at least %s characters long", field, e.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s characters long", field, e.Param())
	case "eqfield":
		return fmt.Sprintf("%s must match %s", field, e.Param())
	case "containsany":
		return fmt.Sprintf("%s must contain at least one special character (%s)", field, e.Param())
	case "alphanum":
		return fmt.Sprintf("%s must contain only alphanumeric characters", field)
	case "numeric":
		return fmt.Sprintf("%s must be a number", field)
	case "url":
		return fmt.Sprintf("%s must be a valid URL", field)
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", field, e.Param())
	case "gte":
		return fmt.Sprintf("%s must be greater than or equal to %s", field, e.Param())
	case "lte":
		return fmt.Sprintf("%s must be less than or equal to %s", field, e.Param())
	default:
		return fmt.Sprintf("%s is invalid", field)
	}
}

// ValidatePasswordStrength checks password meets security requirements
// Returns a slice of issues found, empty if password is strong enough
func ValidatePasswordStrength(password string) []string {
	var issues []string

	if len(password) < 8 {
		issues = append(issues, "Password must be at least 8 characters")
	}
	if len(password) > 72 {
		issues = append(issues, "Password must be at most 72 characters (bcrypt limit)")
	}
	if !hasUpperCase.MatchString(password) {
		issues = append(issues, "Password must contain at least one uppercase letter")
	}
	if !hasLowerCase.MatchString(password) {
		issues = append(issues, "Password must contain at least one lowercase letter")
	}
	if !hasDigit.MatchString(password) {
		issues = append(issues, "Password must contain at least one digit")
	}
	if !hasSpecialChar.MatchString(password) {
		issues = append(issues, "Password must contain at least one special character")
	}

	return issues
}

// SanitizeString removes potentially dangerous characters from input
func SanitizeString(input string) string {
	// Trim whitespace
	sanitized := strings.TrimSpace(input)
	
	// Remove null bytes
	sanitized = strings.ReplaceAll(sanitized, "\x00", "")
	
	return sanitized
}

// SanitizeEmail normalizes an email address
func SanitizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// IsValidEmail provides a more thorough email validation
func IsValidEmail(email string) bool {
	// Basic check - must contain @ and have parts before and after
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}
	
	local, domain := parts[0], parts[1]
	
	// Local part checks
	if len(local) == 0 || len(local) > 64 {
		return false
	}
	
	// Domain checks
	if len(domain) == 0 || len(domain) > 255 {
		return false
	}
	if !strings.Contains(domain, ".") {
		return false
	}
	
	return true
}

// ContainsOnlyPrintable checks if string contains only printable characters
func ContainsOnlyPrintable(s string) bool {
	for _, r := range s {
		if !unicode.IsPrint(r) {
			return false
		}
	}
	return true
}
