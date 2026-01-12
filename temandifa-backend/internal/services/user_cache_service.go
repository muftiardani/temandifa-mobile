package services

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

// UserCacheService handles user caching operations
type UserCacheService interface {
	GetCachedUser(ctx context.Context, userID uint) (*CachedUser, error)
	SetCachedUser(ctx context.Context, user *models.User) error
	InvalidateUserCache(ctx context.Context, userID uint) error
}

type userCacheService struct {
	client *redis.Client
}

// NewUserCacheService creates a new UserCacheService with Redis client
func NewUserCacheService(client *redis.Client) UserCacheService {
	return &userCacheService{client: client}
}

// GetCachedUser retrieves a user from cache by ID
func (s *userCacheService) GetCachedUser(ctx context.Context, userID uint) (*CachedUser, error) {
	if s.client == nil {
		return nil, fmt.Errorf("redis not available")
	}

	key := fmt.Sprintf("%s%d", UserCachePrefix, userID)
	data, err := s.client.Get(ctx, key).Bytes()
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
func (s *userCacheService) SetCachedUser(ctx context.Context, user *models.User) error {
	if s.client == nil {
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
	return s.client.Set(ctx, key, data, UserCacheTTL).Err()
}

// InvalidateUserCache removes a user from cache
func (s *userCacheService) InvalidateUserCache(ctx context.Context, userID uint) error {
	if s.client == nil {
		return nil
	}

	key := fmt.Sprintf("%s%d", UserCachePrefix, userID)
	return s.client.Del(ctx, key).Err()
}
