package handlers

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"temandifa-backend/internal/logger"
)

// AIProxyHandler handles requests that need to be forwarded to the Python AI Service
type AIProxyHandler struct {
	AIServiceURL string
}

func NewAIProxyHandler(aiServiceURL string) *AIProxyHandler {
	return &AIProxyHandler{
		AIServiceURL: aiServiceURL,
	}
}

// DetectObjects forwards the image to the Python YOLOv8 service
func (h *AIProxyHandler) DetectObjects(c *gin.Context) {
	start := time.Now()

	// 1. Get file from request
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		logger.Debug("Detection request missing file", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	logger.Debug("Processing detection request",
		zap.String("filename", header.Filename),
		zap.Int64("size", header.Size),
	)

	// 2. Prepare multipart request to Python Service
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", header.Filename)
	if err != nil {
		logger.Error("Failed to create form file for proxy", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create form file"})
		return
	}
	_, err = io.Copy(part, file)
	if err != nil {
		logger.Error("Failed to copy file content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy file content"})
		return
	}
	writer.Close()

	// 3. Send Request
	proxyReq, err := http.NewRequest("POST", h.AIServiceURL+"/detect", body)
	if err != nil {
		logger.Error("Failed to create proxy request",
			zap.Error(err),
			zap.String("url", h.AIServiceURL+"/detect"),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create proxy request"})
		return
	}
	proxyReq.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(proxyReq)
	if err != nil {
		logger.Error("AI Service unavailable",
			zap.Error(err),
			zap.String("service", "detection"),
		)
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI Service unavailable"})
		return
	}
	defer resp.Body.Close()

	// 4. Return response to Client
	c.Status(resp.StatusCode)
	c.Header("Content-Type", resp.Header.Get("Content-Type"))
	_, err = io.Copy(c.Writer, resp.Body)
	if err != nil {
		logger.Warn("Error copying response body", zap.Error(err))
	}

	logger.Info("AI proxy request completed",
		zap.String("service", "detection"),
		zap.Int("status", resp.StatusCode),
		zap.Duration("latency", time.Since(start)),
	)
}

// ExtractText forwards the image to the Python OCR service
func (h *AIProxyHandler) ExtractText(c *gin.Context) {
	start := time.Now()

	// 1. Get file from request
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		logger.Debug("OCR request missing file", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	logger.Debug("Processing OCR request",
		zap.String("filename", header.Filename),
		zap.Int64("size", header.Size),
	)

	// 2. Prepare multipart request to Python Service
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", header.Filename)
	if err != nil {
		logger.Error("Failed to create form file for proxy", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create form file"})
		return
	}
	_, err = io.Copy(part, file)
	if err != nil {
		logger.Error("Failed to copy file content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy file content"})
		return
	}
	writer.Close()

	// 3. Send Request
	proxyReq, err := http.NewRequest("POST", h.AIServiceURL+"/ocr", body)
	if err != nil {
		logger.Error("Failed to create proxy request",
			zap.Error(err),
			zap.String("url", h.AIServiceURL+"/ocr"),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create proxy request"})
		return
	}
	proxyReq.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 25 * time.Second} // Longer timeout for OCR
	resp, err := client.Do(proxyReq)
	if err != nil {
		logger.Error("AI Service unavailable",
			zap.Error(err),
			zap.String("service", "ocr"),
		)
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI Service unavailable"})
		return
	}
	defer resp.Body.Close()

	// 4. Return response to Client
	c.Status(resp.StatusCode)
	c.Header("Content-Type", resp.Header.Get("Content-Type"))
	_, err = io.Copy(c.Writer, resp.Body)
	if err != nil {
		logger.Warn("Error copying response body", zap.Error(err))
	}

	logger.Info("AI proxy request completed",
		zap.String("service", "ocr"),
		zap.Int("status", resp.StatusCode),
		zap.Duration("latency", time.Since(start)),
	)
}

// TranscribeAudio forwards the audio file to the Python Whisper service
func (h *AIProxyHandler) TranscribeAudio(c *gin.Context) {
	start := time.Now()

	// 1. Get file from request
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		logger.Debug("Transcription request missing file", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	logger.Debug("Processing transcription request",
		zap.String("filename", header.Filename),
		zap.Int64("size", header.Size),
	)

	// 2. Prepare multipart request to Python Service
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", header.Filename)
	if err != nil {
		logger.Error("Failed to create form file for proxy", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create form file"})
		return
	}
	_, err = io.Copy(part, file)
	if err != nil {
		logger.Error("Failed to copy file content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy file content"})
		return
	}
	writer.Close()

	// 3. Send Request
	proxyReq, err := http.NewRequest("POST", h.AIServiceURL+"/transcribe", body)
	if err != nil {
		logger.Error("Failed to create proxy request",
			zap.Error(err),
			zap.String("url", h.AIServiceURL+"/transcribe"),
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create proxy request"})
		return
	}
	proxyReq.Header.Set("Content-Type", writer.FormDataContentType())

	// Whisper can be slow, set timeout to 60s
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(proxyReq)
	if err != nil {
		logger.Error("AI Service unavailable",
			zap.Error(err),
			zap.String("service", "transcription"),
		)
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI Service unavailable"})
		return
	}
	defer resp.Body.Close()

	// 4. Return response to Client
	c.Status(resp.StatusCode)
	c.Header("Content-Type", resp.Header.Get("Content-Type"))
	_, err = io.Copy(c.Writer, resp.Body)
	if err != nil {
		logger.Warn("Error copying response body", zap.Error(err))
	}

	logger.Info("AI proxy request completed",
		zap.String("service", "transcription"),
		zap.Int("status", resp.StatusCode),
		zap.Duration("latency", time.Since(start)),
	)
}
