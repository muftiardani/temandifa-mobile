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

// Connect initializes the database connection
// dsn: "host=localhost user=postgres password=root dbname=temandifa port=5432 sslmode=disable"
func Connect(dsn string) {
	var err error

	// Configure GORM logger
	gormConfig := &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Warn),
	}

	DB, err = gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}

	logger.Info("Database connection established")

	// Auto Migrate
	err = DB.AutoMigrate(&models.User{}, &models.History{}, &models.EmergencyContact{}, &models.CallLog{})
	if err != nil {
		logger.Fatal("Failed to migrate database", zap.Error(err))
	}

	logger.Info("Database migration completed")
}
