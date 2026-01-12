package helpers

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"

	"go.uber.org/zap"

	"temandifa-backend/internal/logger"
)

// File size limits (in bytes)
const (
	MaxImageSize = 10 * 1024 * 1024  // 10MB
	MaxAudioSize = 25 * 1024 * 1024  // 25MB
)

// Allowed MIME types
var (
	AllowedImageTypes = map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
		"image/gif":  true,
	}
	AllowedAudioTypes = map[string]bool{
		"audio/mpeg":  true,
		"audio/wav":   true,
		"audio/x-wav": true,
		"audio/webm":  true,
		"audio/ogg":   true,
		"audio/mp4":   true,
		"audio/m4a":   true,
		"video/webm":  true, // Often used for audio
	}
)

// UploadedFile contains validated file data
type UploadedFile struct {
	Content  []byte
	Filename string
	MimeType string
	Size     int64
}

// ValidateImageUpload validates and reads an uploaded image file
func ValidateImageUpload(header *multipart.FileHeader, file multipart.File) (*UploadedFile, error) {
	return validateUpload(header, file, MaxImageSize, AllowedImageTypes, "image")
}

// ValidateAudioUpload validates and reads an uploaded audio file
func ValidateAudioUpload(header *multipart.FileHeader, file multipart.File) (*UploadedFile, error) {
	return validateUpload(header, file, MaxAudioSize, AllowedAudioTypes, "audio")
}

// validateUpload is the generic validation function
func validateUpload(
	header *multipart.FileHeader,
	file multipart.File,
	maxSize int64,
	allowedTypes map[string]bool,
	fileType string,
) (*UploadedFile, error) {
	// Check file size
	if header.Size > maxSize {
		logger.Debug("File too large",
			zap.String("filename", header.Filename),
			zap.Int64("size", header.Size),
			zap.Int64("max", maxSize),
		)
		return nil, fmt.Errorf("file too large: max %d MB allowed", maxSize/(1024*1024))
	}

	// Read file content
	content, err := io.ReadAll(file)
	if err != nil {
		logger.Error("Failed to read file", zap.Error(err))
		return nil, fmt.Errorf("failed to read file")
	}

	// Detect MIME type from content (magic bytes)
	mimeType := http.DetectContentType(content)

	// Check if MIME type is allowed
	if !allowedTypes[mimeType] {
		logger.Debug("Invalid file type",
			zap.String("filename", header.Filename),
			zap.String("detected_mime", mimeType),
		)
		return nil, fmt.Errorf("invalid %s format: %s not allowed", fileType, mimeType)
	}

	logger.Debug("File validated successfully",
		zap.String("filename", header.Filename),
		zap.String("mime", mimeType),
		zap.Int64("size", header.Size),
	)

	return &UploadedFile{
		Content:  content,
		Filename: SanitizeFilename(header.Filename),
		MimeType: mimeType,
		Size:     header.Size,
	}, nil
}

// SanitizeFilename removes potentially dangerous characters from filenames
// and prevents path traversal attacks
func SanitizeFilename(filename string) string {
	// Get just the base filename (remove any directory components)
	filename = filepath.Base(filename)

	// Remove null bytes and other control characters
	filename = strings.Map(func(r rune) rune {
		if r < 32 {
			return -1
		}
		return r
	}, filename)

	// Remove potentially dangerous characters
	// Keep only alphanumeric, dots, underscores, and hyphens
	re := regexp.MustCompile(`[^a-zA-Z0-9._-]`)
	filename = re.ReplaceAllString(filename, "_")

	// Prevent hidden files (starting with dot)
	filename = strings.TrimLeft(filename, ".")

	// Limit filename length
	if len(filename) > 255 {
		ext := filepath.Ext(filename)
		base := filename[:255-len(ext)]
		filename = base + ext
	}

	// Default filename if empty
	if filename == "" {
		filename = "upload"
	}

	return filename
}
