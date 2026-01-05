package models

import "gorm.io/gorm"

type User struct {
	gorm.Model
	Email          string `gorm:"uniqueIndex;not null" json:"email"`
	Password       string `json:"-"` // Don't return password in JSON
	FullName       string `json:"full_name"`
	ProfilePicture string `json:"profile_picture"` // URL to profile image
	Role           string `gorm:"default:'user'" json:"role"` // 'user' or 'admin'

	// Relations
	EmergencyContacts []EmergencyContact `json:"emergency_contacts,omitempty"`
}
