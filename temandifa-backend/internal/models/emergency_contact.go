package models

import "gorm.io/gorm"

type EmergencyContact struct {
	gorm.Model
	UserID      uint   `json:"user_id" gorm:"index"`
	Name        string `json:"name"`
	PhoneNumber string `json:"phone_number"`
	Relation    string `json:"relation"`   // e.g. "Orang Tua", "Saudara"
	IsPrimary   bool   `json:"is_primary"` // To mark the main contact to call first
}
