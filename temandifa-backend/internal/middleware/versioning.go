package middleware

import (
	"github.com/gin-gonic/gin"
)

// API Version constants
const (
	APIVersionV1      = "v1"
	APIVersionV2      = "v2"
	DefaultAPIVersion = APIVersionV1
)

// Version context key
const VersionKey = "api_version"

// VersionMiddleware extracts API version from Accept-Version header or URL path.
// Supports both header-based versioning (Accept-Version: v1) and URL-based (/api/v1/).
// The version is stored in the context for handlers to access.
func VersionMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		version := DefaultAPIVersion

		// Check Accept-Version header first (takes precedence)
		if headerVersion := c.GetHeader("Accept-Version"); headerVersion != "" {
			version = normalizeVersion(headerVersion)
		}

		// Store version in context
		c.Set(VersionKey, version)

		// Set response header to indicate the API version used
		c.Header("X-API-Version", version)

		c.Next()
	}
}

// normalizeVersion ensures version string is in expected format
func normalizeVersion(version string) string {
	switch version {
	case "v1", "1", "1.0":
		return APIVersionV1
	case "v2", "2", "2.0":
		return APIVersionV2
	default:
		return DefaultAPIVersion
	}
}
