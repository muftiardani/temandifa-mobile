package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"temandifa-backend/internal/dto"
)

// HealthHandler handles health check requests
type HealthHandler struct {
	db           *gorm.DB
	redis        *redis.Client
	AIServiceURL string
}

// Version info - can be set via ldflags at build time
var (
	AppVersion = "1.0.0"
	BuildTime  = "unknown"
	GitCommit  = "unknown"
)

func NewHealthHandler(db *gorm.DB, redis *redis.Client, aiServiceURL string) *HealthHandler {
	return &HealthHandler{
		db:           db,
		redis:        redis,
		AIServiceURL: aiServiceURL,
	}
}

// CheckHealth handles health check requests
//
//	@Summary		Health Check
//	@Description	Get comprehensive health status of all services with latency info
//	@Tags			Health
//	@Produce		json
//	@Success		200	{object}	HealthResponse
//	@Failure		503	{object}	HealthResponse
//	@Router			/health [get]
func (h *HealthHandler) CheckHealth(c *gin.Context) {
	response := dto.HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now().Format(time.RFC3339),
		Version:   AppVersion,
		Checks:    make(map[string]dto.HealthCheck),
	}

	statusCode := http.StatusOK

	// Check PostgreSQL with latency
	pgStart := time.Now()
	if h.db != nil {
		sqlDB, err := h.db.DB()
		if err != nil {
			response.Checks["postgres"] = dto.HealthCheck{
				Status:    "unhealthy",
				LatencyMs: time.Since(pgStart).Milliseconds(),
				Message:   err.Error(),
			}
			response.Status = "degraded"
			statusCode = http.StatusServiceUnavailable
		} else if err := sqlDB.Ping(); err != nil {
			response.Checks["postgres"] = dto.HealthCheck{
				Status:    "unhealthy",
				LatencyMs: time.Since(pgStart).Milliseconds(),
				Message:   err.Error(),
			}
			response.Status = "degraded"
			statusCode = http.StatusServiceUnavailable
		} else {
			response.Checks["postgres"] = dto.HealthCheck{
				Status:    "healthy",
				LatencyMs: time.Since(pgStart).Milliseconds(),
			}
		}
	} else {
		response.Checks["postgres"] = dto.HealthCheck{
			Status:  "unhealthy",
			Message: "connection not initialized",
		}
		response.Status = "degraded"
		statusCode = http.StatusServiceUnavailable
	}

	// Check Redis with latency
	redisStart := time.Now()
	if h.redis != nil {
		if _, err := h.redis.Ping(c).Result(); err != nil {
			response.Checks["redis"] = dto.HealthCheck{
				Status:    "unhealthy",
				LatencyMs: time.Since(redisStart).Milliseconds(),
				Message:   err.Error(),
			}
			if response.Status != "degraded" {
				response.Status = "degraded"
			}
		} else {
			response.Checks["redis"] = dto.HealthCheck{
				Status:    "healthy",
				LatencyMs: time.Since(redisStart).Milliseconds(),
			}
		}
	} else {
		response.Checks["redis"] = dto.HealthCheck{
			Status:  "not_configured",
			Message: "Redis not connected",
		}
	}

	// Check AI Service with latency
	aiStart := time.Now()
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(h.AIServiceURL + "/health")
	if err != nil {
		response.Checks["ai_service"] = dto.HealthCheck{
			Status:    "unhealthy",
			LatencyMs: time.Since(aiStart).Milliseconds(),
			Message:   err.Error(),
		}
		if response.Status != "degraded" {
			response.Status = "degraded"
		}
	} else {
		defer func() {
			_ = resp.Body.Close()
		}()
		if resp.StatusCode == http.StatusOK {
			response.Checks["ai_service"] = dto.HealthCheck{
				Status:    "healthy",
				LatencyMs: time.Since(aiStart).Milliseconds(),
			}
		} else {
			response.Checks["ai_service"] = dto.HealthCheck{
				Status:    "unhealthy",
				LatencyMs: time.Since(aiStart).Milliseconds(),
				Message:   "HTTP " + resp.Status,
			}
			if response.Status != "degraded" {
				response.Status = "degraded"
			}
		}
	}

	c.JSON(statusCode, response)
}
