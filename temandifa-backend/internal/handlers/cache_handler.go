package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"temandifa-backend/internal/cache"
	"temandifa-backend/internal/logger"
)

type CacheHandler struct{}

// GetCacheStats returns cache statistics
func (h *CacheHandler) GetCacheStats(c *gin.Context) {
	stats := cache.GetStats(c)
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"data":   stats,
	})
}

// ClearDetectionCache clears all detection cache entries
func (h *CacheHandler) ClearDetectionCache(c *gin.Context) {
	deleted, err := cache.ClearByPrefix(c, "detect")
	if err != nil {
		logger.Error("Failed to clear detection cache", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear cache"})
		return
	}

	logger.Info("Detection cache cleared", zap.Int64("deleted", deleted))
	c.JSON(http.StatusOK, gin.H{
		"message": "Detection cache cleared",
		"deleted": deleted,
	})
}

// ClearOCRCache clears all OCR cache entries
func (h *CacheHandler) ClearOCRCache(c *gin.Context) {
	deleted, err := cache.ClearByPrefix(c, "ocr")
	if err != nil {
		logger.Error("Failed to clear OCR cache", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear cache"})
		return
	}

	logger.Info("OCR cache cleared", zap.Int64("deleted", deleted))
	c.JSON(http.StatusOK, gin.H{
		"message": "OCR cache cleared",
		"deleted": deleted,
	})
}

// ClearTranscriptionCache clears all transcription cache entries
func (h *CacheHandler) ClearTranscriptionCache(c *gin.Context) {
	deleted, err := cache.ClearByPrefix(c, "transcribe")
	if err != nil {
		logger.Error("Failed to clear transcription cache", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear cache"})
		return
	}

	logger.Info("Transcription cache cleared", zap.Int64("deleted", deleted))
	c.JSON(http.StatusOK, gin.H{
		"message": "Transcription cache cleared",
		"deleted": deleted,
	})
}

// ClearAllCache clears all AI-related cache entries
func (h *CacheHandler) ClearAllCache(c *gin.Context) {
	var totalDeleted int64

	d1, _ := cache.ClearByPrefix(c, "detect")
	totalDeleted += d1

	d2, _ := cache.ClearByPrefix(c, "ocr")
	totalDeleted += d2

	d3, _ := cache.ClearByPrefix(c, "transcribe")
	totalDeleted += d3

	logger.Info("All AI cache cleared", zap.Int64("deleted", totalDeleted))
	c.JSON(http.StatusOK, gin.H{
		"message": "All cache cleared",
		"deleted": totalDeleted,
	})
}
