package models

import "gorm.io/gorm"

type FeatureType string

const (
	FeatureObject FeatureType = "OBJECT"
	FeatureOCR    FeatureType = "OCR"
	FeatureVoice  FeatureType = "VOICE"
)

// History stores user activity records with AI features
// Indexes:
// - idx_history_user_created: composite index for efficient user history queries
// - idx_history_feature: index for filtering by feature type
type History struct {
	gorm.Model
	UserID      uint        `json:"user_id" gorm:"index:idx_history_user_created,priority:1;index:idx_history_user"`
	User        User        `json:"-" gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	FeatureType FeatureType `json:"feature_type" gorm:"type:varchar(20);index:idx_history_feature"` // OBJECT, OCR, VOICE
	InputSource string      `json:"input_source"`                                                   // URL or filename of image/audio
	ResultText  string      `json:"result_text" gorm:"type:text"`                                   // Classification result or transcribed text
}

