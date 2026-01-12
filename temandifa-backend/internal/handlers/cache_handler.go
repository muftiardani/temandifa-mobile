package handlers

import (
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/response"
	"temandifa-backend/internal/services"
)

type CacheHandler struct {
	cacheService services.CacheService
}

func NewCacheHandler(cacheService services.CacheService) *CacheHandler {
	return &CacheHandler{
		cacheService: cacheService,
	}
}

// GetCacheStats godoc
//
//	@Summary		Get cache statistics
//	@Description	Get Redis cache hit/miss statistics
//	@Tags			Cache
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{object}	map[string]interface{}	"Cache statistics"
//	@Failure		401	{object}	response.ErrorResponse	"Unauthorized"
//	@Failure		403	{object}	response.ErrorResponse	"Forbidden (Admin only)"
//	@Router			/cache/stats [get]
func (h *CacheHandler) GetCacheStats(c *gin.Context) {
	stats := h.cacheService.GetStats(c.Request.Context())
	response.Success(c, stats)
}

// ClearDetectionCache godoc
//
//	@Summary		Clear detection cache
//	@Description	Clear all object detection cache entries
//	@Tags			Cache
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{object}	map[string]interface{}	"Deleted count"
//	@Failure		401	{object}	response.ErrorResponse	"Unauthorized"
//	@Failure		403	{object}	response.ErrorResponse	"Forbidden (Admin only)"
//	@Failure		500	{object}	response.ErrorResponse	"Failed to clear cache"
//	@Router			/cache/detection [delete]
func (h *CacheHandler) ClearDetectionCache(c *gin.Context) {
	deleted, err := h.cacheService.ClearByPrefix(c.Request.Context(), "detect")
	if err != nil {
		logger.Error("Failed to clear detection cache", zap.Error(err))
		response.InternalError(c, "Failed to clear cache")
		return
	}

	logger.Info("Detection cache cleared", zap.Int64("deleted", deleted))
	response.Success(c, gin.H{"deleted": deleted}, "Detection cache cleared")
}

// ClearOCRCache godoc
//
//	@Summary		Clear OCR cache
//	@Description	Clear all OCR cache entries
//	@Tags			Cache
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{object}	map[string]interface{}	"Deleted count"
//	@Failure		401	{object}	response.ErrorResponse	"Unauthorized"
//	@Failure		403	{object}	response.ErrorResponse	"Forbidden (Admin only)"
//	@Failure		500	{object}	response.ErrorResponse	"Failed to clear cache"
//	@Router			/cache/ocr [delete]
func (h *CacheHandler) ClearOCRCache(c *gin.Context) {
	deleted, err := h.cacheService.ClearByPrefix(c.Request.Context(), "ocr")
	if err != nil {
		logger.Error("Failed to clear OCR cache", zap.Error(err))
		response.InternalError(c, "Failed to clear cache")
		return
	}

	logger.Info("OCR cache cleared", zap.Int64("deleted", deleted))
	response.Success(c, gin.H{"deleted": deleted}, "OCR cache cleared")
}

// ClearTranscriptionCache godoc
//
//	@Summary		Clear transcription cache
//	@Description	Clear all audio transcription cache entries
//	@Tags			Cache
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{object}	map[string]interface{}	"Deleted count"
//	@Failure		401	{object}	response.ErrorResponse	"Unauthorized"
//	@Failure		403	{object}	response.ErrorResponse	"Forbidden (Admin only)"
//	@Failure		500	{object}	response.ErrorResponse	"Failed to clear cache"
//	@Router			/cache/transcription [delete]
func (h *CacheHandler) ClearTranscriptionCache(c *gin.Context) {
	deleted, err := h.cacheService.ClearByPrefix(c.Request.Context(), "transcribe")
	if err != nil {
		logger.Error("Failed to clear transcription cache", zap.Error(err))
		response.InternalError(c, "Failed to clear cache")
		return
	}

	logger.Info("Transcription cache cleared", zap.Int64("deleted", deleted))
	response.Success(c, gin.H{"deleted": deleted}, "Transcription cache cleared")
}

// ClearAllCache godoc
//
//	@Summary		Clear all AI cache
//	@Description	Clear all AI-related cache entries (detection, OCR, transcription)
//	@Tags			Cache
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{object}	map[string]interface{}	"Total deleted count"
//	@Failure		401	{object}	response.ErrorResponse	"Unauthorized"
//	@Failure		403	{object}	response.ErrorResponse	"Forbidden (Admin only)"
//	@Router			/cache [delete]
func (h *CacheHandler) ClearAllCache(c *gin.Context) {
	var totalDeleted int64
	ctx := c.Request.Context()

	d1, _ := h.cacheService.ClearByPrefix(ctx, "detect")
	totalDeleted += d1

	d2, _ := h.cacheService.ClearByPrefix(ctx, "ocr")
	totalDeleted += d2

	d3, _ := h.cacheService.ClearByPrefix(ctx, "transcribe")
	totalDeleted += d3

	logger.Info("All AI cache cleared", zap.Int64("deleted", totalDeleted))
	response.Success(c, gin.H{"deleted": totalDeleted}, "All cache cleared")
}
