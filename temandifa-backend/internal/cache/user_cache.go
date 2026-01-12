package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/models"
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

// Deprecated: userCacheClient is kept for backward compatibility.
// Use dependency injection for new code.
var userCacheClient *redis.Client

// Deprecated: InitUserCache is kept for backward compatibility.
// Use dependency injection for new code.
func InitUserCache(client *redis.Client) {
	userCacheClient = client
}

// GetCachedUser retrieves a user from cache by ID
func GetCachedUser(ctx context.Context, userID uint) (*CachedUser, error) {
	if userCacheClient == nil {
		return nil, fmt.Errorf("redis not available")
	}

	key := fmt.Sprintf("%s%d", UserCachePrefix, userID)
	data, err := userCacheClient.Get(ctx, key).Bytes()
	if err != nil {
		return nil, err // Could be redis.Nil if not found
	}

	var user CachedUser
	if err := json.Unmarshal(data, &user); err != nil {
		return nil, err
	}

	logger.Debug("User cache hit", zap.Uint("user_id", userID))
	return &user, nil
}

// SetCachedUser caches a user
func SetCachedUser(ctx context.Context, user *models.User) error {
	if userCacheClient == nil {
		return fmt.Errorf("redis not available")
	}

	cached := CachedUser{
		ID:       user.ID,
		Email:    user.Email,
		FullName: user.FullName,
		Role:     user.Role,
	}

	data, err := json.Marshal(cached)
	if err != nil {
		return err
	}

	key := fmt.Sprintf("%s%d", UserCachePrefix, user.ID)
	return userCacheClient.Set(ctx, key, data, UserCacheTTL).Err()
}

// InvalidateUserCache removes a user from cache
func InvalidateUserCache(ctx context.Context, userID uint) error {
	if userCacheClient == nil {
		return nil
	}

	key := fmt.Sprintf("%s%d", UserCachePrefix, userID)
	return userCacheClient.Del(ctx, key).Err()
}
