package handlers

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"temandifa-backend/internal/cache"
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

// DetectObjects forwards the image to the Python YOLOv8 service with caching
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

	// Read file content for caching
	fileContent, err := io.ReadAll(file)
	if err != nil {
		logger.Error("Failed to read file content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	logger.Debug("Processing detection request",
		zap.String("filename", header.Filename),
		zap.Int("size", len(fileContent)),
	)

	// 2. Check cache first
	cacheKey := cache.GenerateKey("detect", fileContent)
	cached := cache.Get(c, cacheKey)
	if cached.Hit {
		logger.Info("Detection cache hit",
			zap.String("key", cacheKey),
			zap.Duration("latency", time.Since(start)),
		)
		c.Header("X-Cache", "HIT")
		c.Header("Content-Type", "application/json")
		c.Data(http.StatusOK, "application/json", cached.Data)
		return
	}

	// 3. Prepare multipart request to Python Service
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", header.Filename)
	if err != nil {
		logger.Error("Failed to create form file for proxy", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create form file"})
		return
	}
	_, err = io.Copy(part, bytes.NewReader(fileContent))
	if err != nil {
		logger.Error("Failed to copy file content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy file content"})
		return
	}
	writer.Close()

	// 4. Send Request
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

	// 5. Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.Error("Failed to read AI response", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
		return
	}

	// 6. Cache successful response
	if resp.StatusCode == http.StatusOK {
		go func() {
			if err := cache.Set(c.Copy(), cacheKey, respBody, cache.Config.DetectionTTL); err != nil {
				logger.Warn("Failed to cache detection result", zap.Error(err))
			}
		}()
	}

	// 7. Return response to Client
	c.Header("X-Cache", "MISS")
	c.Header("Content-Type", resp.Header.Get("Content-Type"))
	c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), respBody)

	logger.Info("AI proxy request completed",
		zap.String("service", "detection"),
		zap.Int("status", resp.StatusCode),
		zap.Duration("latency", time.Since(start)),
		zap.String("cache", "MISS"),
	)
}

// ExtractText forwards the image to the Python OCR service with caching
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

	// Read file content for caching
	fileContent, err := io.ReadAll(file)
	if err != nil {
		logger.Error("Failed to read file content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	logger.Debug("Processing OCR request",
		zap.String("filename", header.Filename),
		zap.Int("size", len(fileContent)),
	)

	// 2. Check cache first
	cacheKey := cache.GenerateKey("ocr", fileContent)
	cached := cache.Get(c, cacheKey)
	if cached.Hit {
		logger.Info("OCR cache hit",
			zap.String("key", cacheKey),
			zap.Duration("latency", time.Since(start)),
		)
		c.Header("X-Cache", "HIT")
		c.Header("Content-Type", "application/json")
		c.Data(http.StatusOK, "application/json", cached.Data)
		return
	}

	// 3. Prepare multipart request to Python Service
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", header.Filename)
	if err != nil {
		logger.Error("Failed to create form file for proxy", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create form file"})
		return
	}
	_, err = io.Copy(part, bytes.NewReader(fileContent))
	if err != nil {
		logger.Error("Failed to copy file content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy file content"})
		return
	}
	writer.Close()

	// 4. Send Request
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

	client := &http.Client{Timeout: 25 * time.Second}
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

	// 5. Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.Error("Failed to read AI response", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
		return
	}

	// 6. Cache successful response
	if resp.StatusCode == http.StatusOK {
		go func() {
			if err := cache.Set(c.Copy(), cacheKey, respBody, cache.Config.OCRTTL); err != nil {
				logger.Warn("Failed to cache OCR result", zap.Error(err))
			}
		}()
	}

	// 7. Return response to Client
	c.Header("X-Cache", "MISS")
	c.Header("Content-Type", resp.Header.Get("Content-Type"))
	c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), respBody)

	logger.Info("AI proxy request completed",
		zap.String("service", "ocr"),
		zap.Int("status", resp.StatusCode),
		zap.Duration("latency", time.Since(start)),
		zap.String("cache", "MISS"),
	)
}

// TranscribeAudio forwards the audio file to the Python Whisper service with caching
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

	// Read file content for caching
	fileContent, err := io.ReadAll(file)
	if err != nil {
		logger.Error("Failed to read file content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	logger.Debug("Processing transcription request",
		zap.String("filename", header.Filename),
		zap.Int("size", len(fileContent)),
	)

	// 2. Check cache first
	cacheKey := cache.GenerateKey("transcribe", fileContent)
	cached := cache.Get(c, cacheKey)
	if cached.Hit {
		logger.Info("Transcription cache hit",
			zap.String("key", cacheKey),
			zap.Duration("latency", time.Since(start)),
		)
		c.Header("X-Cache", "HIT")
		c.Header("Content-Type", "application/json")
		c.Data(http.StatusOK, "application/json", cached.Data)
		return
	}

	// 3. Prepare multipart request to Python Service
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", header.Filename)
	if err != nil {
		logger.Error("Failed to create form file for proxy", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create form file"})
		return
	}
	_, err = io.Copy(part, bytes.NewReader(fileContent))
	if err != nil {
		logger.Error("Failed to copy file content", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy file content"})
		return
	}
	writer.Close()

	// 4. Send Request
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

	// 5. Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		logger.Error("Failed to read AI response", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
		return
	}

	// 6. Cache successful response
	if resp.StatusCode == http.StatusOK {
		go func() {
			if err := cache.Set(c.Copy(), cacheKey, respBody, cache.Config.TranscriptionTTL); err != nil {
				logger.Warn("Failed to cache transcription result", zap.Error(err))
			}
		}()
	}

	// 7. Return response to Client
	c.Header("X-Cache", "MISS")
	c.Header("Content-Type", resp.Header.Get("Content-Type"))
	c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), respBody)

	logger.Info("AI proxy request completed",
		zap.String("service", "transcription"),
		zap.Int("status", resp.StatusCode),
		zap.Duration("latency", time.Since(start)),
		zap.String("cache", "MISS"),
	)
}
