package services

import (
	"temandifa-backend/internal/models"
	"temandifa-backend/internal/repositories"
)

type HistoryService interface {
	CreateHistory(history models.History) (models.History, error)
	GetUserHistory(userID uint, page, limit int) ([]models.History, int64, error)
	DeleteHistory(userID uint, historyID string) (bool, error)
	ClearUserHistory(userID uint) (int64, error)
}

type historyService struct {
	historyRepo repositories.HistoryRepository
}

func NewHistoryService(historyRepo repositories.HistoryRepository) HistoryService {
	return &historyService{
		historyRepo: historyRepo,
	}
}

func (s *historyService) CreateHistory(history models.History) (models.History, error) {
	err := s.historyRepo.Create(&history)
	return history, err
}

func (s *historyService) GetUserHistory(userID uint, page, limit int) ([]models.History, int64, error) {
	offset := (page - 1) * limit
	return s.historyRepo.FindUserHistory(userID, limit, offset)
}

func (s *historyService) DeleteHistory(userID uint, historyID string) (bool, error) {
	rowsAffected, err := s.historyRepo.DeleteByID(userID, historyID)
	if err != nil {
		return false, err
	}
	return rowsAffected > 0, nil
}

func (s *historyService) ClearUserHistory(userID uint) (int64, error) {
	return s.historyRepo.DeleteAllByUserID(userID)
}
