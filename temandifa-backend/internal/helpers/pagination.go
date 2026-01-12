package helpers

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// Pagination holds pagination parameters and metadata
type Pagination struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Offset     int   `json:"-"`
	Total      int64 `json:"total"`
	TotalPages int64 `json:"total_pages"`
}

// PaginationConfig holds configuration for pagination
type PaginationConfig struct {
	DefaultLimit int
	MaxLimit     int
}

// DefaultPaginationConfig returns default pagination config
var DefaultPaginationConfig = PaginationConfig{
	DefaultLimit: 20,
	MaxLimit:     100,
}

// NewPagination creates a new Pagination from gin context
func NewPagination(c *gin.Context) *Pagination {
	cfg := DefaultPaginationConfig

	page, err := strconv.Atoi(c.DefaultQuery("page", "1"))
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", strconv.Itoa(cfg.DefaultLimit)))
	if err != nil || limit < 1 {
		limit = cfg.DefaultLimit
	}
	if limit > cfg.MaxLimit {
		limit = cfg.MaxLimit
	}

	return &Pagination{
		Page:   page,
		Limit:  limit,
		Offset: (page - 1) * limit,
	}
}

// SetTotal sets the total count and calculates total pages
func (p *Pagination) SetTotal(total int64) {
	p.Total = total
	p.TotalPages = (total + int64(p.Limit) - 1) / int64(p.Limit)
}

// ToMeta returns pagination metadata for response
func (p *Pagination) ToMeta() gin.H {
	return gin.H{
		"page":        p.Page,
		"limit":       p.Limit,
		"total":       p.Total,
		"total_pages": p.TotalPages,
	}
}


