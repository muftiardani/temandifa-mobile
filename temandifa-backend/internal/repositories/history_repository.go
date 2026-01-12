package repositories

import (
	"temandifa-backend/internal/models"

	"gorm.io/gorm"
)

type HistoryRepository interface {
	Create(history *models.History) error
	FindUserHistory(userID uint, limit, offset int) ([]models.History, int64, error)
	DeleteByID(userID uint, historyID string) (int64, error)
	DeleteAllByUserID(userID uint) (int64, error)
}

type historyRepository struct {
	db *gorm.DB
}

func NewHistoryRepository(db *gorm.DB) HistoryRepository {
	return &historyRepository{db: db}
}

func (r *historyRepository) Create(history *models.History) error {
	return r.db.Create(history).Error
}

func (r *historyRepository) FindUserHistory(userID uint, limit, offset int) ([]models.History, int64, error) {
	var histories []models.History
	var total int64

	// Count total records for this user
	r.db.Model(&models.History{}).Where("user_id = ?", userID).Count(&total)

	// Fetch paginated results
	result := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&histories)

	return histories, total, result.Error
}

func (r *historyRepository) DeleteByID(userID uint, historyID string) (int64, error) {
	result := r.db.Where("id = ? AND user_id = ?", historyID, userID).Delete(&models.History{})
	return result.RowsAffected, result.Error
}

func (r *historyRepository) DeleteAllByUserID(userID uint) (int64, error) {
	result := r.db.Where("user_id = ?", userID).Delete(&models.History{})
	return result.RowsAffected, result.Error
}
