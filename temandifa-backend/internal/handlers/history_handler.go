package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"temandifa-backend/internal/database"
	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/models"
)

type HistoryHandler struct{}

type CreateHistoryInput struct {
	FeatureType string `json:"feature_type" binding:"required,oneof=OBJECT OCR VOICE"`
	InputSource string `json:"input_source"`
	ResultText  string `json:"result_text"`
}

// GetUserHistory returns paginated history for the authenticated user
func (h *HistoryHandler) GetUserHistory(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var histories []models.History
	result := database.DB.Where("user_id = ?", user.ID).
		Order("created_at DESC").
		Limit(50).
		Find(&histories)

	if result.Error != nil {
		logger.Error("Failed to fetch history",
			zap.Error(result.Error),
			zap.Uint("user_id", user.ID),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch history"})
		return
	}

	logger.Debug("History fetched",
		zap.Uint("user_id", user.ID),
		zap.Int("count", len(histories)),
	)

	c.JSON(http.StatusOK, gin.H{
		"data":  histories,
		"count": len(histories),
	})
}

// CreateHistory saves a new history entry for the authenticated user
func (h *HistoryHandler) CreateHistory(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var input CreateHistoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logger.Debug("History creation validation failed", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	history := models.History{
		UserID:      user.ID,
		FeatureType: models.FeatureType(input.FeatureType),
		InputSource: input.InputSource,
		ResultText:  input.ResultText,
	}

	if result := database.DB.Create(&history); result.Error != nil {
		logger.Error("Failed to save history",
			zap.Error(result.Error),
			zap.Uint("user_id", user.ID),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save history"})
		return
	}

	logger.Info("History saved",
		zap.Uint("user_id", user.ID),
		zap.Uint("history_id", history.ID),
		zap.String("feature_type", input.FeatureType),
	)

	c.JSON(http.StatusCreated, gin.H{
		"message": "History saved successfully",
		"data":    history,
	})
}

// DeleteHistory removes a specific history entry for the authenticated user
func (h *HistoryHandler) DeleteHistory(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	historyID := c.Param("id")

	result := database.DB.Where("id = ? AND user_id = ?", historyID, user.ID).Delete(&models.History{})

	if result.RowsAffected == 0 {
		logger.Debug("History not found for deletion",
			zap.String("history_id", historyID),
			zap.Uint("user_id", user.ID),
		)
		c.JSON(http.StatusNotFound, gin.H{"error": "History not found"})
		return
	}

	logger.Info("History deleted",
		zap.String("history_id", historyID),
		zap.Uint("user_id", user.ID),
	)

	c.JSON(http.StatusOK, gin.H{"message": "History deleted successfully"})
}

// ClearUserHistory removes all history entries for the authenticated user
func (h *HistoryHandler) ClearUserHistory(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	result := database.DB.Where("user_id = ?", user.ID).Delete(&models.History{})

	logger.Info("All history cleared",
		zap.Uint("user_id", user.ID),
		zap.Int64("deleted", result.RowsAffected),
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "All history cleared",
		"deleted": result.RowsAffected,
	})
}
