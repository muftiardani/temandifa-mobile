package cache

import (
	"time"
)

const (
	// UserCacheTTL is the time-to-live for cached user data
	UserCacheTTL = 5 * time.Minute
	// UserCachePrefix is the Redis key prefix for user cache
	UserCachePrefix = "user:"
)

// CachedUser contains the minimal user data needed for auth
type CachedUser struct {
	ID       uint   `json:"id"`
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
}
