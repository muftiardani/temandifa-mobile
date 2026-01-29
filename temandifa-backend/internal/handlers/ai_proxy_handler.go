package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/goccy/go-json"
	"github.com/sony/gobreaker"
	"go.uber.org/zap"

	"temandifa-backend/internal/helpers"
	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/metrics"
	"temandifa-backend/internal/response"
	"temandifa-backend/internal/services"
)

// AIProxyHandler handles requests that need to be forwarded to the Python AI Service via gRPC
type AIProxyHandler struct {
	aiService services.AIService
}

func NewAIProxyHandler(aiService services.AIService) *AIProxyHandler {
	return &AIProxyHandler{
		aiService: aiService,
	}
}

// handleAIServiceError provides consistent error handling for AI Service failures
// with graceful degradation support (Retry-After headers, circuit breaker info)
func handleAIServiceError(c *gin.Context, err error, serviceName string) {
	if err == gobreaker.ErrOpenState {
		// Circuit breaker is open - provide Retry-After header for graceful degradation
		c.Header("Retry-After", "30")
		c.Header("X-Circuit-Breaker-State", "open")
		response.Error(c, http.StatusServiceUnavailable,
			response.ErrCodeAIServiceError,
			"AI Service is temporarily unavailable. Please try again in a few moments.",
			gin.H{
				"service":     serviceName,
				"retry_after": "30s",
				"fallback":    true,
			})
		logger.Warn("AI Service circuit breaker open",
			zap.String("service", serviceName),
		)
		return
	}

	// Regular AI Service error
	response.Error(c, http.StatusBadGateway,
		response.ErrCodeAIServiceError,
		"AI Service unavailable",
		gin.H{
			"service": serviceName,
			"error":   err.Error(),
		})
	logger.Error("AI Service error",
		zap.String("service", serviceName),
		zap.Error(err),
	)
}

// DetectObjects godoc
//
//	@Summary		Detect objects in image
//	@Description	Detect objects in an image using YOLOv8 with caching (via gRPC)
//	@Tags			AI
//	@Accept			multipart/form-data
//	@Produce		json
//	@Security		BearerAuth
//	@Param			file	formData	file				true	"Image file (jpg, png, webp)"
//	@Success		200		{object}	map[string]interface{}	"Detection results"
//	@Failure		400		{object}	response.ErrorResponse	"No file uploaded"
//	@Failure		502		{object}	response.ErrorResponse	"AI Service unavailable"
//	@Router			/detect [post]
func (h *AIProxyHandler) DetectObjects(c *gin.Context) {
	start := time.Now()

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		logger.Debug("Detection request missing file", zap.Error(err))
		response.BadRequest(c, "No file uploaded")
		return
	}
	defer func() { _ = file.Close() }()

	// Validate and read file
	uploadedFile, err := helpers.ValidateImageUpload(header, file)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	logger.Debug("Processing detection request",
		zap.String("filename", uploadedFile.Filename),
		zap.Int64("size", uploadedFile.Size),
		zap.String("mime", uploadedFile.MimeType),
	)

	result, fromCache, err := h.aiService.DetectObjects(c.Request.Context(), uploadedFile.Content, uploadedFile.Filename)
	if err != nil {
		handleAIServiceError(c, err, "detection")
		return
	}

	// Set cache header
	cacheStatus := "MISS"
	if fromCache {
		cacheStatus = "HIT"
	}
	c.Header("X-Cache", cacheStatus)

	// Fast JSON serialization
	c.Header("Content-Type", "application/json")
	jsonBytes, err := json.Marshal(result)
	if err != nil {
		c.JSON(http.StatusOK, result)
	} else {
		c.Data(http.StatusOK, "application/json", jsonBytes)
	}

	logger.InfoCtx(c.Request.Context(), "AI proxy request completed",
		zap.String("service", "detection"),
		zap.Int("status", http.StatusOK),
		zap.Duration("latency", time.Since(start)),
		zap.String("cache", cacheStatus),
	)

	metrics.RecordAIRequest("detection", time.Since(start).Seconds(), "success", fromCache)
}

// ExtractText godoc
//
//	@Summary		Extract text from image (OCR)
//	@Description	Perform OCR on an image using PaddleOCR via gRPC
//	@Tags			AI
//	@Accept			multipart/form-data
//	@Produce		json
//	@Security		BearerAuth
//	@Param			file	formData	file				true	"Image file"
//	@Param			lang	query		string				false	"Language: en, id, ch"	default(en)
//	@Router			/ocr [post]
func (h *AIProxyHandler) ExtractText(c *gin.Context) {
	start := time.Now()

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.BadRequest(c, "No file uploaded")
		return
	}
	defer func() { _ = file.Close() }()

	// Validate and read file
	uploadedFile, err := helpers.ValidateImageUpload(header, file)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	lang := c.DefaultQuery("lang", "en")

	result, fromCache, err := h.aiService.ExtractText(c.Request.Context(), uploadedFile.Content, uploadedFile.Filename, lang)
	if err != nil {
		handleAIServiceError(c, err, "ocr")
		return
	}

	cacheStatus := "MISS"
	if fromCache {
		cacheStatus = "HIT"
	}
	c.Header("X-Cache", cacheStatus)

	c.Header("Content-Type", "application/json")
	jsonBytes, err := json.Marshal(result)
	if err != nil {
		c.JSON(http.StatusOK, result)
	} else {
		c.Data(http.StatusOK, "application/json", jsonBytes)
	}

	logger.InfoCtx(c.Request.Context(), "OCR request completed", zap.Duration("latency", time.Since(start)))
	metrics.RecordAIRequest("ocr", time.Since(start).Seconds(), "success", fromCache)
}

// TranscribeAudio godoc
//
//	@Summary		Transcribe audio to text
//	@Description	Convert audio to text using Whisper via gRPC
//	@Tags			AI
//	@Accept			multipart/form-data
//	@Produce		json
//	@Security		BearerAuth
//	@Param			file	formData	file				true	"Audio file"
//	@Router			/transcribe [post]
func (h *AIProxyHandler) TranscribeAudio(c *gin.Context) {
	start := time.Now()

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.BadRequest(c, "No file uploaded")
		return
	}
	defer func() { _ = file.Close() }()

	// Validate and read file
	uploadedFile, err := helpers.ValidateAudioUpload(header, file)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	result, fromCache, err := h.aiService.TranscribeAudio(c.Request.Context(), uploadedFile.Content, uploadedFile.Filename)
	if err != nil {
		handleAIServiceError(c, err, "transcription")
		return
	}

	cacheStatus := "MISS"
	if fromCache {
		cacheStatus = "HIT"
	}
	c.Header("X-Cache", cacheStatus)

	c.Header("Content-Type", "application/json")
	jsonBytes, err := json.Marshal(result)
	if err != nil {
		c.JSON(http.StatusOK, result)
	} else {
		c.Data(http.StatusOK, "application/json", jsonBytes)
	}

	logger.InfoCtx(c.Request.Context(), "Transcription request completed", zap.Duration("latency", time.Since(start)))
	metrics.RecordAIRequest("transcription", time.Since(start).Seconds(), "success", fromCache)
}

// AskQuestion godoc
//
//	@Summary		Visual Question Answering
//	@Description	Ask a question about an image (VQA) using Google Gemini via gRPC
//	@Tags			AI
//	@Accept			multipart/form-data
//	@Produce		json
//	@Security		BearerAuth
//	@Param			file		formData	file				true	"Image file"
//	@Param			question	formData	string				true	"Question about the image"
//	@Router			/ask [post]
func (h *AIProxyHandler) AskQuestion(c *gin.Context) {
	start := time.Now()

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.BadRequest(c, "No file uploaded")
		return
	}
	defer func() { _ = file.Close() }()

	question := c.PostForm("question")
	if question == "" {
		response.BadRequest(c, "Question is required")
		return
	}

	// Validate and read file
	uploadedFile, err := helpers.ValidateImageUpload(header, file)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	result, fromCache, err := h.aiService.VisualQuestionAnswering(c.Request.Context(), uploadedFile.Content, uploadedFile.Filename, question)
	if err != nil {
		handleAIServiceError(c, err, "vqa")
		return
	}

	cacheStatus := "MISS"
	if fromCache {
		cacheStatus = "HIT"
	}
	c.Header("X-Cache", cacheStatus)

	c.Header("Content-Type", "application/json")
	jsonBytes, err := json.Marshal(result)
	if err != nil {
		c.JSON(http.StatusOK, result)
	} else {
		c.Data(http.StatusOK, "application/json", jsonBytes)
	}

	logger.InfoCtx(c.Request.Context(), "VQA request completed", zap.Duration("latency", time.Since(start)))
	metrics.RecordAIRequest("vqa", time.Since(start).Seconds(), "success", fromCache)
}
