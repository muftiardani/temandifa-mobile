package handlers

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
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
	// 1. Get file from request
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// 2. Prepare multipart request to Python Service
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", header.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create form file"})
		return
	}
	_, err = io.Copy(part, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy file content"})
		return
	}
	writer.Close()

	// 3. Send Request
	proxyReq, err := http.NewRequest("POST", h.AIServiceURL+"/detect", body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create proxy request"})
		return
	}
	proxyReq.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(proxyReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI Service unavailable"})
		return
	}
	defer resp.Body.Close()

	// 4. Return response to Client
	// Copy headers and status code
	c.Status(resp.StatusCode)
	c.Header("Content-Type", resp.Header.Get("Content-Type"))
	_, err = io.Copy(c.Writer, resp.Body)
    if err != nil {
        // Just log internal error, cannot change status code now
        fmt.Println("Error copying response body:", err)
    }
}

// ExtractText forwards the image to the Python OCR service
func (h *AIProxyHandler) ExtractText(c *gin.Context) {
	// 1. Get file from request
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// 2. Prepare multipart request to Python Service
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", header.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create form file"})
		return
	}
	_, err = io.Copy(part, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy file content"})
		return
	}
	writer.Close()

	// 3. Send Request
	proxyReq, err := http.NewRequest("POST", h.AIServiceURL+"/ocr", body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create proxy request"})
		return
	}
	proxyReq.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 20 * time.Second} // Longer timeout for OCR
	resp, err := client.Do(proxyReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI Service unavailable"})
		return
	}
	defer resp.Body.Close()

	// 4. Return response to Client
	c.Status(resp.StatusCode)
	c.Header("Content-Type", resp.Header.Get("Content-Type"))
	_, err = io.Copy(c.Writer, resp.Body)
    if err != nil {
        fmt.Println("Error copying response body:", err)
    }
}

// TranscribeAudio forwards the audio file to the Python Whisper service
func (h *AIProxyHandler) TranscribeAudio(c *gin.Context) {
	// 1. Get file from request
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	// 2. Prepare multipart request to Python Service
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("file", header.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create form file"})
		return
	}
	_, err = io.Copy(part, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy file content"})
		return
	}
	writer.Close()

	// 3. Send Request
	proxyReq, err := http.NewRequest("POST", h.AIServiceURL+"/transcribe", body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create proxy request"})
		return
	}
	proxyReq.Header.Set("Content-Type", writer.FormDataContentType())

	// Whisper can be slow, set timeout to 60s
	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(proxyReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI Service unavailable"})
		return
	}
	defer resp.Body.Close()

	// 4. Return response to Client
	c.Status(resp.StatusCode)
	c.Header("Content-Type", resp.Header.Get("Content-Type"))
	_, err = io.Copy(c.Writer, resp.Body)
    if err != nil {
        fmt.Println("Error copying response body:", err)
    }
}
