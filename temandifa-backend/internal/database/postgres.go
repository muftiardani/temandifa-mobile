package database

import (
	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/models"
)

var DB *gorm.DB

// ConnectPostgres initializes the PostgreSQL database connection
// dsn: "host=localhost user=postgres password=root dbname=temandifa port=5432 sslmode=disable"
func ConnectPostgres(dsn string) {
	var err error

	// Configure GORM logger
	gormConfig := &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Warn),
	}

	DB, err = gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		logger.Fatal("Failed to connect to PostgreSQL", zap.Error(err))
	}

	logger.Info("PostgreSQL connection established")

	// Auto Migrate
	err = DB.AutoMigrate(&models.User{}, &models.History{}, &models.EmergencyContact{}, &models.CallLog{})
	if err != nil {
		logger.Fatal("Failed to migrate database", zap.Error(err))
	}

	logger.Info("Database migration completed")
}
