package models

import (
	"time"

	"gorm.io/gorm"
)

// RefreshToken stores refresh tokens for secure token rotation
type RefreshToken struct {
	gorm.Model
	UserID    uint       `gorm:"index;not null" json:"user_id"`
	Token     string     `gorm:"uniqueIndex;not null;size:512" json:"-"`
	ExpiresAt time.Time  `gorm:"not null" json:"expires_at"`
	Revoked   bool       `gorm:"default:false" json:"revoked"`
	RevokedAt *time.Time `json:"revoked_at,omitempty"`

	// Device info for tracking
	UserAgent string `gorm:"size:500" json:"user_agent,omitempty"`
	IPAddress string `gorm:"size:45" json:"ip_address,omitempty"`

	// Relations
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// IsValid checks if the refresh token is still valid
func (rt *RefreshToken) IsValid() bool {
	return !rt.Revoked && rt.ExpiresAt.After(time.Now())
}

// Revoke marks the token as revoked
func (rt *RefreshToken) Revoke() {
	now := time.Now()
	rt.Revoked = true
	rt.RevokedAt = &now
}
