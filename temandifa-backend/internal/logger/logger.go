package logger

import (
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Global logger instance
var Log *zap.Logger
var Sugar *zap.SugaredLogger

// Config holds logger configuration
type Config struct {
	Level      string // debug, info, warn, error
	Format     string // json, console
	TimeFormat string // ISO8601, epoch, etc.
}

// DefaultConfig returns default logger configuration
func DefaultConfig() Config {
	return Config{
		Level:      "info",
		Format:     "console",
		TimeFormat: "ISO8601",
	}
}

// Init initializes the global logger
func Init(cfg Config) {
	var config zap.Config

	if cfg.Format == "json" {
		config = zap.NewProductionConfig()
	} else {
		config = zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		config.EncoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout("15:04:05")
	}

	// Set log level
	config.Level = zap.NewAtomicLevelAt(parseLevel(cfg.Level))

	// Disable caller for cleaner output in development
	if cfg.Format == "console" {
		config.DisableCaller = true
	}

	var err error
	Log, err = config.Build()
	if err != nil {
		panic("Failed to initialize logger: " + err.Error())
	}

	Sugar = Log.Sugar()
}

// InitFromEnv initializes logger from environment variables
func InitFromEnv() {
	cfg := DefaultConfig()

	if level := os.Getenv("LOG_LEVEL"); level != "" {
		cfg.Level = level
	}

	if format := os.Getenv("LOG_FORMAT"); format != "" {
		cfg.Format = format
	}

	// Use JSON in production
	if os.Getenv("GIN_MODE") == "release" {
		cfg.Format = "json"
		cfg.Level = "info"
	}

	Init(cfg)
}

func parseLevel(level string) zapcore.Level {
	switch level {
	case "debug":
		return zapcore.DebugLevel
	case "info":
		return zapcore.InfoLevel
	case "warn":
		return zapcore.WarnLevel
	case "error":
		return zapcore.ErrorLevel
	default:
		return zapcore.InfoLevel
	}
}

// Sync flushes any buffered log entries
func Sync() {
	if Log != nil {
		_ = Log.Sync()
	}
}

// Info logs an info message
func Info(msg string, fields ...zap.Field) {
	Log.Info(msg, fields...)
}

// Debug logs a debug message
func Debug(msg string, fields ...zap.Field) {
	Log.Debug(msg, fields...)
}

// Warn logs a warning message
func Warn(msg string, fields ...zap.Field) {
	Log.Warn(msg, fields...)
}

// Error logs an error message
func Error(msg string, fields ...zap.Field) {
	Log.Error(msg, fields...)
}

// Fatal logs a fatal message and exits
func Fatal(msg string, fields ...zap.Field) {
	Log.Fatal(msg, fields...)
}

// Context key types for extracting values from context
type contextKey string

const (
	// RequestIDKey is the context key for request ID
	RequestIDKey contextKey = "request_id"
	// UserIDKey is the context key for user ID
	UserIDKey contextKey = "user_id"
)

// FromContext creates a logger with request_id and user_id fields from context
// This enables automatic correlation of logs with their originating requests
func FromContext(ctx interface{ Value(any) any }) *zap.Logger {
	fields := make([]zap.Field, 0, 2)

	if requestID, ok := ctx.Value(RequestIDKey).(string); ok && requestID != "" {
		fields = append(fields, zap.String("request_id", requestID))
	} else if requestID, ok := ctx.Value("request_id").(string); ok && requestID != "" {
		// Fallback for gin context
		fields = append(fields, zap.String("request_id", requestID))
	}

	if userID, ok := ctx.Value(UserIDKey).(uint); ok && userID != 0 {
		fields = append(fields, zap.Uint("user_id", userID))
	} else if userID, ok := ctx.Value("user_id").(uint); ok && userID != 0 {
		// Fallback for gin context
		fields = append(fields, zap.Uint("user_id", userID))
	}

	if len(fields) > 0 {
		return Log.With(fields...)
	}
	return Log
}

// InfoCtx logs an info message with context fields
func InfoCtx(ctx interface{ Value(any) any }, msg string, fields ...zap.Field) {
	FromContext(ctx).Info(msg, fields...)
}
