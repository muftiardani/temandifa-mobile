package services

import (
	"context"
	"time"

	"go.uber.org/fx"
	"go.uber.org/zap"

	"temandifa-backend/internal/logger"
)

// TokenCleanupJob handles periodic cleanup of expired tokens
type TokenCleanupJob struct {
	tokenService TokenService
	interval     time.Duration
	stopChan     chan struct{}
}

// NewTokenCleanupJob creates a new token cleanup job
func NewTokenCleanupJob(tokenService TokenService) *TokenCleanupJob {
	return &TokenCleanupJob{
		tokenService: tokenService,
		interval:     24 * time.Hour, // Run daily
		stopChan:     make(chan struct{}),
	}
}

// Start begins the cleanup job
func (j *TokenCleanupJob) Start() {
	logger.Info("Token cleanup job started",
		zap.Duration("interval", j.interval),
	)

	// Run immediately on startup
	j.runCleanup()

	// Then run periodically
	ticker := time.NewTicker(j.interval)
	go func() {
		for {
			select {
			case <-ticker.C:
				j.runCleanup()
			case <-j.stopChan:
				ticker.Stop()
				logger.Info("Token cleanup job stopped")
				return
			}
		}
	}()
}

// Stop stops the cleanup job
func (j *TokenCleanupJob) Stop() {
	close(j.stopChan)
}

func (j *TokenCleanupJob) runCleanup() {
	count, err := j.tokenService.CleanupExpiredTokens()
	if err != nil {
		logger.Error("Token cleanup failed", zap.Error(err))
		return
	}
	if count > 0 {
		logger.Info("Token cleanup completed",
			zap.Int64("tokens_removed", count),
		)
	}
}

// RegisterTokenCleanupJob registers the cleanup job with fx lifecycle
func RegisterTokenCleanupJob(lc fx.Lifecycle, tokenService TokenService) {
	job := NewTokenCleanupJob(tokenService)

	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			job.Start()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			job.Stop()
			return nil
		},
	})
}
