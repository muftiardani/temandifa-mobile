package models

import "time"

// User represents the user entity
type User struct {
	ID             uint       `gorm:"primaryKey" json:"id"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	DeletedAt      *time.Time `gorm:"index" json:"deleted_at,omitempty"`
	Email          string     `gorm:"uniqueIndex;not null" json:"email"`
	Password       string     `json:"-"`
	FullName       string     `json:"full_name"`
	ProfilePicture string     `json:"profile_picture"`
	Role           string     `gorm:"default:user" json:"role"`
}
