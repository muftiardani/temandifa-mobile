package models

import (
	"time"

	"gorm.io/gorm"
)

type CallStatus string

const (
	CallStatusInitiated CallStatus = "INITIATED"
	CallStatusOngoing   CallStatus = "ONGOING"
	CallStatusEnded     CallStatus = "ENDED"
	CallStatusMissed    CallStatus = "MISSED"
	CallStatusRejected  CallStatus = "REJECTED"
)

type CallLog struct {
	gorm.Model
	CallerID   uint       `json:"caller_id" gorm:"index"`
	Caller     User       `json:"-" gorm:"foreignKey:CallerID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	ReceiverID *uint      `json:"receiver_id" gorm:"index"` // Nullable if calling a general pool (e.g. 'Any Volunteer')
	Receiver   *User      `json:"-" gorm:"foreignKey:ReceiverID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	RoomID     string     `json:"room_id" gorm:"index"` // WebRTC Room ID
	Status     CallStatus `json:"status" gorm:"type:varchar(20);default:'INITIATED'"`
	StartTime  time.Time  `json:"start_time"`
	EndTime    *time.Time `json:"end_time"`
	Duration   int        `json:"duration_seconds"`
}
