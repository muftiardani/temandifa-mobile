package middleware

import (
	"github.com/gin-gonic/gin"
)

// API Version constants
const (
	APIVersionV1 = "v1"
	APIVersionV2 = "v2"
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

// GetAPIVersion extracts the API version from the gin context
func GetAPIVersion(c *gin.Context) string {
	if version, exists := c.Get(VersionKey); exists {
		return version.(string)
	}
	return DefaultAPIVersion
}

// IsVersion checks if the current request is for a specific API version
func IsVersion(c *gin.Context, version string) bool {
	return GetAPIVersion(c) == version
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

// RequireVersion creates middleware that only allows specific API versions
func RequireVersion(allowedVersions ...string) gin.HandlerFunc {
	versionSet := make(map[string]bool)
	for _, v := range allowedVersions {
		versionSet[v] = true
	}

	return func(c *gin.Context) {
		currentVersion := GetAPIVersion(c)
		if !versionSet[currentVersion] {
			c.AbortWithStatusJSON(400, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "UNSUPPORTED_VERSION",
					"message": "This endpoint does not support API version " + currentVersion,
				},
			})
			return
		}
		c.Next()
	}
}
