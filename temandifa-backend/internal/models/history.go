package models

import "gorm.io/gorm"

type FeatureType string

const (
	FeatureObject FeatureType = "OBJECT"
	FeatureOCR    FeatureType = "OCR"
	FeatureVoice  FeatureType = "VOICE"
)

type History struct {
	gorm.Model
	UserID      uint        `json:"user_id" gorm:"index"`
	User        User        `json:"-" gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	FeatureType FeatureType `json:"feature_type" gorm:"type:varchar(20)"` // OBJECT, OCR, VOICE
	InputSource string      `json:"input_source"`                         // URL or filename of image/audio
	ResultText  string      `json:"result_text" gorm:"type:text"`         // Classification result or transcribed text
}
