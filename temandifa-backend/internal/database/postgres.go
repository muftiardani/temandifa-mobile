package database

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"go.uber.org/fx"
	"go.uber.org/zap"
	gorm_postgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"temandifa-backend/internal/config"
	"temandifa-backend/internal/logger"
)

// Module exports dependency for Fx
var Module = fx.Options(
	fx.Provide(NewPostgresConnection),
)

// Deprecated: DB is kept for backward compatibility. Use DI instead.
var DB *gorm.DB

var dbHealth = &healthStatus{healthy: true}

// healthStatus tracks database health
type healthStatus struct {
	mu      sync.RWMutex
	healthy bool
	lastErr error
}

// NewPostgresConnection initializes the PostgreSQL database connection
// and returns the *gorm.DB instance for dependency injection.
// Includes retry logic with exponential backoff for resilient startup.
func NewPostgresConnection(lc fx.Lifecycle, cfg *config.Config) (*gorm.DB, error) {
	// Configure GORM logger
	gormConfig := &gorm.Config{
		Logger:                 gormlogger.Default.LogMode(gormlogger.Warn),
		PrepareStmt:            true, // Cache prepared statements
		SkipDefaultTransaction: true, // Disable default transaction for single creates/updates
	}

	// Retry configuration
	maxRetries := 5
	retryDelay := 2 * time.Second

	var db *gorm.DB
	var err error

	// Attempt connection with retry
	for attempt := 1; attempt <= maxRetries; attempt++ {
		db, err = gorm.Open(gorm_postgres.Open(cfg.DatabaseDSN), gormConfig)
		if err == nil {
			break
		}

		if attempt < maxRetries {
			logger.Warn("Failed to connect to database, retrying...",
				zap.Int("attempt", attempt),
				zap.Int("max_retries", maxRetries),
				zap.Duration("retry_delay", retryDelay),
				zap.Error(err),
			)
			time.Sleep(retryDelay)
			retryDelay *= 2 // Exponential backoff
			if retryDelay > 30*time.Second {
				retryDelay = 30 * time.Second
			}
		}
	}

	if err != nil {
		logger.Error("Failed to connect to database after all retries",
			zap.Int("attempts", maxRetries),
			zap.Error(err),
		)
		return nil, err
	}

	// Deprecated: Assign to global for legacy support during migration
	// TODO: Remove this once all consumers use DI
	DB = db

	// Configure connection pool from config
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	// SetMaxIdleConns sets the maximum number of connections in the idle connection pool
	sqlDB.SetMaxIdleConns(cfg.DBMaxIdleConns)

	// SetMaxOpenConns sets the maximum number of open connections to the database
	sqlDB.SetMaxOpenConns(cfg.DBMaxOpenConns)

	// SetConnMaxLifetime sets the maximum amount of time a connection may be reused
	sqlDB.SetConnMaxLifetime(cfg.DBConnMaxLifetime)

	// SetConnMaxIdleTime sets the maximum amount of time a connection may be idle
	sqlDB.SetConnMaxIdleTime(cfg.DBConnMaxIdleTime)

	logger.Info("PostgreSQL connection established with connection pooling",
		zap.Int("max_idle_conns", cfg.DBMaxIdleConns),
		zap.Int("max_open_conns", cfg.DBMaxOpenConns),
		zap.Duration("conn_max_lifetime", cfg.DBConnMaxLifetime),
		zap.Duration("conn_max_idle_time", cfg.DBConnMaxIdleTime),
	)

	// Run Database Migrations
	runMigrations(sqlDB, "migrations")
	
	// Register Lifecycle hooks
	lc.Append(fx.Hook{
		OnStop: func(ctx context.Context) error {
			logger.Info("Closing database connection...")
			return sqlDB.Close()
		},
	})

	return db, nil
}

func runMigrations(db *sql.DB, migrationDir string) {
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		logger.Fatal("Could not create postgres migration driver", zap.Error(err))
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://"+migrationDir,
		"postgres",
		driver,
	)
	if err != nil {
		logger.Fatal("Could not create migration instance", zap.Error(err))
	}

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		logger.Fatal("An error occurred while running migrations", zap.Error(err))
	}

	logger.Info("Database migrations ran successfully")
}

// CloseDB closes the given database connection
// Deprecated: Use FX lifecycle hooks instead of manual close
func CloseDB(db *gorm.DB) error {
	if db != nil {
		sqlDB, err := db.DB()
		if err != nil {
			return err
		}
		return sqlDB.Close()
	}
	return nil
}

// Close is deprecated: kept for backward compatibility
// Use CloseDB or FX lifecycle hooks instead
func Close() error {
	return CloseDB(DB)
}

// StartHealthChecker starts a background goroutine that periodically checks database health
// Deprecated: Use StartHealthCheckerWithDB instead
func StartHealthChecker(interval time.Duration) {
	StartHealthCheckerWithDB(DB, interval)
}

// StartHealthCheckerWithDB starts a health checker for the given database connection
func StartHealthCheckerWithDB(db *gorm.DB, interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			if db == nil {
				dbHealth.setUnhealthy(nil)
				continue
			}

			sqlDB, err := db.DB()
			if err != nil {
				dbHealth.setUnhealthy(err)
				logger.Error("Database health check failed: cannot get sql.DB", zap.Error(err))
				continue
			}

			if err := sqlDB.Ping(); err != nil {
				dbHealth.setUnhealthy(err)
				logger.Error("Database health check failed: ping error", zap.Error(err))
			} else {
				if !dbHealth.isHealthy() {
					logger.Info("Database connection recovered")
				}
				dbHealth.setHealthy()
			}
		}
	}()

	logger.Info("Database health checker started", zap.Duration("interval", interval))
}

// IsHealthy returns true if the database is healthy
func IsHealthy() bool {
	return dbHealth.isHealthy()
}

// GetHealthStatus returns the current health status and last error
func GetHealthStatus() (bool, error) {
	dbHealth.mu.RLock()
	defer dbHealth.mu.RUnlock()
	return dbHealth.healthy, dbHealth.lastErr
}

func (h *healthStatus) setHealthy() {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.healthy = true
	h.lastErr = nil
}

func (h *healthStatus) setUnhealthy(err error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.healthy = false
	h.lastErr = err
}

func (h *healthStatus) isHealthy() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.healthy
}

