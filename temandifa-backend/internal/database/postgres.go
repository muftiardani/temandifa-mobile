package database

import (
	"context"
	"database/sql"
	"errors"
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
