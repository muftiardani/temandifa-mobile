package docs

import "time"

// SwaggerModel is a swagger-friendly representation of gorm.Model
// @Description Base model with common fields
type SwaggerModel struct {
	ID        uint       `json:"id" example:"1"`
	CreatedAt time.Time  `json:"created_at" example:"2026-01-07T00:00:00Z"`
	UpdatedAt time.Time  `json:"updated_at" example:"2026-01-07T00:00:00Z"`
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}

// UserResponse represents user data in API responses
// @Description User information
type UserResponse struct {
	ID       uint   `json:"id" example:"1"`
	FullName string `json:"full_name" example:"John Doe"`
	Email    string `json:"email" example:"john@example.com"`
}

// TokenResponse represents token pair response
// @Description Authentication tokens
type TokenResponse struct {
	AccessToken  string       `json:"access_token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	RefreshToken string       `json:"refresh_token" example:"base64-encoded-refresh-token"`
	ExpiresAt    string       `json:"expires_at" example:"2026-01-07T00:15:00Z"`
	TokenType    string       `json:"token_type" example:"Bearer"`
	User         UserResponse `json:"user"`
}

// HistoryItemResponse represents a history entry
// @Description User activity history item
type HistoryItemResponse struct {
	ID          uint   `json:"id" example:"1"`
	UserID      uint   `json:"user_id" example:"1"`
	FeatureType string `json:"feature_type" example:"OBJECT"`
	InputSource string `json:"input_source" example:"camera"`
	ResultText  string `json:"result_text" example:"Detected: person, chair, table"`
	CreatedAt   string `json:"created_at" example:"2026-01-07T00:00:00Z"`
}

// PaginationMeta represents pagination metadata
// @Description Pagination information
type PaginationMeta struct {
	Page       int   `json:"page" example:"1"`
	Limit      int   `json:"limit" example:"20"`
	Total      int64 `json:"total" example:"100"`
	TotalPages int   `json:"total_pages" example:"5"`
}

// DetectionResult represents object detection response
// @Description Object detection results
type DetectionResult struct {
	Detections []DetectionItem `json:"detections"`
	Count      int             `json:"count" example:"3"`
	Cached     bool            `json:"cached" example:"false"`
}

// DetectionItem represents a single detected object
// @Description Single detected object
type DetectionItem struct {
	Label      string  `json:"label" example:"person"`
	Confidence float64 `json:"confidence" example:"0.95"`
	Box        []int   `json:"box" example:"[100, 150, 300, 400]"`
}

// OCRResult represents OCR response
// @Description OCR extraction results
type OCRResult struct {
	Text   string `json:"text" example:"Hello World"`
	Cached bool   `json:"cached" example:"false"`
}

// TranscriptionResult represents audio transcription response
// @Description Audio transcription results
type TranscriptionResult struct {
	Text     string `json:"text" example:"This is the transcribed text"`
	Language string `json:"language" example:"id"`
	Cached   bool   `json:"cached" example:"false"`
}
