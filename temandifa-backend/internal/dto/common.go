package dto

// HealthCheck represents a single service health check result
type HealthCheck struct {
	Status    string `json:"status"`
	LatencyMs int64  `json:"latency_ms,omitempty"`
	Message   string `json:"message,omitempty"`
}

// HealthResponse is the structured health check response
type HealthResponse struct {
	Status    string                 `json:"status"`
	Timestamp string                 `json:"timestamp"`
	Version   string                 `json:"version"`
	Checks    map[string]HealthCheck `json:"checks"`
}

// APIResponse is a generic API response wrapper
type APIResponse struct {
	Success   bool   `json:"success"`
	Data      any    `json:"data,omitempty"`
	Message   string `json:"message,omitempty"`
	RequestID string `json:"request_id,omitempty"`
}

// PaginationMeta contains pagination metadata
type PaginationMeta struct {
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	TotalItems int64 `json:"total_items"`
	TotalPages int   `json:"total_pages"`
}

// PaginatedResponse is a paginated API response
type PaginatedResponse struct {
	Success bool           `json:"success"`
	Data    any            `json:"data"`
	Meta    PaginationMeta `json:"meta"`
}
