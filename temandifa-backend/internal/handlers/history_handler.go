package handlers

import (
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"temandifa-backend/internal/helpers"
	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/models"
	"temandifa-backend/internal/response"
	"temandifa-backend/internal/services"
)

type HistoryHandler struct {
	historyService services.HistoryService
}

func NewHistoryHandler(historyService services.HistoryService) *HistoryHandler {
	return &HistoryHandler{
		historyService: historyService,
	}
}

// CreateHistoryInput represents history creation request
//
//	@Description	History creation input
type CreateHistoryInput struct {
	FeatureType string `json:"feature_type" binding:"required,oneof=OBJECT OCR VOICE" example:"OBJECT"`
	InputSource string `json:"input_source" binding:"max=500" example:"camera_capture"`
	ResultText  string `json:"result_text" binding:"max=10000" example:"Detected: person, car"`
}

// GetUserHistory godoc
//
//	@Summary		Get user history
//	@Description	Get paginated history for authenticated user
//	@Tags			History
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			page	query		int	false	"Page number"			default(1)
//	@Param			limit	query		int	false	"Items per page (max 100)"	default(20)
//	@Success		200		{object}	response.SuccessResponse{data=[]models.History,meta=helpers.Pagination}
//	@Failure		401		{object}	response.ErrorResponse
//	@Failure		500		{object}	response.ErrorResponse
//	@Router			/history [get]
func (h *HistoryHandler) GetUserHistory(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	// Use pagination helper
	pagination := helpers.NewPagination(c)

	histories, total, err := h.historyService.GetUserHistory(user.ID, pagination.Page, pagination.Limit)
	if err != nil {
		logger.Error("Failed to fetch history",
			zap.Error(err),
			zap.Uint("user_id", user.ID),
		)
		response.InternalError(c, "Failed to fetch history")
		return
	}

	pagination.SetTotal(total)

	logger.Debug("History fetched",
		zap.Uint("user_id", user.ID),
		zap.Int("count", len(histories)),
		zap.Int("page", pagination.Page),
	)

	response.SuccessWithMeta(c, histories, pagination.ToMeta())
}

// CreateHistory godoc
//
//	@Summary		Create history entry
//	@Description	Save a new history entry for authenticated user
//	@Tags			History
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			input	body		CreateHistoryInput	true	"History data"
//	@Success		201		{object}	response.SuccessResponse{data=models.History}
//	@Failure		400		{object}	response.ErrorResponse
//	@Failure		401		{object}	response.ErrorResponse
//	@Failure		500		{object}	response.ErrorResponse
//	@Router			/history [post]
func (h *HistoryHandler) CreateHistory(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var input CreateHistoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logger.Debug("History creation validation failed", zap.Error(err))
		response.BadRequest(c, "Validation failed", err.Error())
		return
	}

	history := models.History{
		UserID:      user.ID,
		FeatureType: models.FeatureType(input.FeatureType),
		InputSource: input.InputSource,
		ResultText:  input.ResultText,
	}

	createdHistory, err := h.historyService.CreateHistory(history)
	if err != nil {
		logger.Error("Failed to save history",
			zap.Error(err),
			zap.Uint("user_id", user.ID),
		)
		response.InternalError(c, "Failed to save history")
		return
	}

	logger.Info("History saved",
		zap.Uint("user_id", user.ID),
		zap.Uint("history_id", createdHistory.ID),
		zap.String("feature_type", input.FeatureType),
	)

	response.Created(c, createdHistory, "History saved successfully")
}

// DeleteHistory godoc
//
//	@Summary		Delete history entry
//	@Description	Delete a specific history entry by ID
//	@Tags			History
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			id	path		int	true	"History ID"
//	@Success		200	{object}	response.SuccessResponse
//	@Failure		401	{object}	response.ErrorResponse
//	@Failure		404	{object}	response.ErrorResponse
//	@Router			/history/{id} [delete]
func (h *HistoryHandler) DeleteHistory(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	historyID := c.Param("id")

	found, err := h.historyService.DeleteHistory(user.ID, historyID)
	if err != nil {
		logger.Error("Failed to delete history", zap.Error(err))
		response.InternalError(c, "Failed to delete history")
		return
	}

	if !found {
		response.NotFound(c, "History item")
		return
	}
	

	logger.Info("History deleted",
		zap.String("history_id", historyID),
		zap.Uint("user_id", user.ID),
	)

	response.Success(c, nil, "History deleted successfully")
}

// ClearUserHistory godoc
//
//	@Summary		Clear all history
//	@Description	Delete all history entries for authenticated user
//	@Tags			History
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{object}	response.SuccessResponse{data=object{deleted=int}}
//	@Failure		401	{object}	response.ErrorResponse
//	@Router			/history [delete]
func (h *HistoryHandler) ClearUserHistory(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	deletedCount, err := h.historyService.ClearUserHistory(user.ID)
	if err != nil {
		logger.Error("Failed to clear history", zap.Error(err))
		response.InternalError(c, "Failed to clear history")
		return
	}

	logger.Info("All history cleared",
		zap.Uint("user_id", user.ID),
		zap.Int64("deleted", deletedCount),
	)

	response.Success(c, gin.H{"deleted": deletedCount}, "All history cleared")
}
