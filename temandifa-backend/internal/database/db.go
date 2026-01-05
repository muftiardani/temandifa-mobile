package database

import (
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"temandifa-backend/internal/models"
)

var DB *gorm.DB

// Connect initializes the database connection
// dsn: "host=localhost user=postgres password=root dbname=temandifa port=5432 sslmode=disable"
func Connect(dsn string) {
	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Database connection established")
	
	// Auto Migrate
	err = DB.AutoMigrate(&models.User{}, &models.History{}, &models.EmergencyContact{}, &models.CallLog{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
}
