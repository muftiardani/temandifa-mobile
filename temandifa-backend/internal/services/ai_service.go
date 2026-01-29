package services

import (
	"context"
	"fmt"
	"time"

	"github.com/goccy/go-json"
	"github.com/sony/gobreaker"
	"go.uber.org/zap"
	"google.golang.org/grpc/status"

	"temandifa-backend/internal/cache"
	"temandifa-backend/internal/clients"
	"temandifa-backend/internal/logger"
	"temandifa-backend/internal/metrics"
)

type AIService interface {
	DetectObjects(ctx context.Context, fileContent []byte, filename string) (interface{}, bool, error)
	ExtractText(ctx context.Context, fileContent []byte, filename string, lang string) (interface{}, bool, error)
	TranscribeAudio(ctx context.Context, fileContent []byte, filename string) (interface{}, bool, error)
	VisualQuestionAnswering(ctx context.Context, fileContent []byte, filename string, question string) (interface{}, bool, error)
}

type aiService struct {
	grpcClient   *clients.AIClient
	cacheService CacheService
	// Separate circuit breakers per operation for fault isolation
	detectCB     *gobreaker.CircuitBreaker
	ocrCB        *gobreaker.CircuitBreaker
	transcribeCB *gobreaker.CircuitBreaker
	vqaCB        *gobreaker.CircuitBreaker
}

// onCircuitStateChange handles circuit breaker state changes with logging and metrics
func onCircuitStateChange(name string, from gobreaker.State, to gobreaker.State) {
	logger.Warn("Circuit Breaker state changed",
		zap.String("name", name),
		zap.String("from", from.String()),
		zap.String("to", to.String()),
	)
	// Update Prometheus metrics
	// State mapping: Closed=0, Open=1, HalfOpen=2
	stateValue := 0
	switch to {
	case gobreaker.StateOpen:
		stateValue = 1
	case gobreaker.StateHalfOpen:
		stateValue = 2
	}
	metrics.UpdateCircuitBreakerState(name, stateValue)
}

// newCircuitBreaker creates a circuit breaker with standard settings
func newCircuitBreaker(name string) *gobreaker.CircuitBreaker {
	return gobreaker.NewCircuitBreaker(gobreaker.Settings{
		Name:        name,
		MaxRequests: 3,                // Max requests in half-open state
		Interval:    60 * time.Second, // Cyclic period of the closed state
		Timeout:     30 * time.Second, // Wait time before half-open
		ReadyToTrip: func(counts gobreaker.Counts) bool {
			failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
			return counts.Requests >= 5 && failureRatio >= 0.6
		},
		OnStateChange: onCircuitStateChange,
	})
}

func NewAIService(grpcClient *clients.AIClient, cacheService CacheService) AIService {
	return &aiService{
		grpcClient:   grpcClient,
		cacheService: cacheService,
		// Create separate circuit breakers for each operation type
		detectCB:     newCircuitBreaker("ai-detect"),
		ocrCB:        newCircuitBreaker("ai-ocr"),
		transcribeCB: newCircuitBreaker("ai-transcribe"),
		vqaCB:        newCircuitBreaker("ai-vqa"),
	}
}

func (s *aiService) DetectObjects(ctx context.Context, fileContent []byte, filename string) (interface{}, bool, error) {

	cacheKey := s.cacheService.GenerateKey("detect", fileContent)
	if result, hit := s.cacheService.Get(ctx, cacheKey); hit {
		var cachedData interface{}
		if err := json.Unmarshal(result, &cachedData); err == nil {
			return cachedData, true, nil
		}
	}

	result, err := s.detectCB.Execute(func() (interface{}, error) {
		resp, err := s.grpcClient.DetectObjects(ctx, fileContent, filename)
		if err != nil {
			return nil, err
		}
		if !resp.Success {
			return nil, fmt.Errorf("ai service error: %s", resp.Message)
		}
		return resp, nil
	})

	if err != nil {
		return nil, false, s.handleError(err)
	}

	go func() {
		jsonBytes, err := json.Marshal(result)
		if err == nil {
			// Create a detached context for async cache set
			detachedCtx := context.WithoutCancel(ctx)
			s.cacheService.SetAsync(detachedCtx, cacheKey, jsonBytes, cache.Config.DetectionTTL)
		}
	}()

	return result, false, nil
}

func (s *aiService) ExtractText(ctx context.Context, fileContent []byte, filename string, lang string) (interface{}, bool, error) {

	cacheKey := s.cacheService.GenerateKey("ocr", append(fileContent, []byte(lang)...))
	if result, hit := s.cacheService.Get(ctx, cacheKey); hit {
		var cachedData interface{}
		if err := json.Unmarshal(result, &cachedData); err == nil {
			return cachedData, true, nil
		}
	}

	result, err := s.ocrCB.Execute(func() (interface{}, error) {
		resp, err := s.grpcClient.ExtractText(ctx, fileContent, filename, lang)
		if err != nil {
			return nil, err
		}
		if !resp.Success {
			return nil, fmt.Errorf("ai service error: %s", resp.Message)
		}
		return resp, nil
	})

	if err != nil {
		return nil, false, s.handleError(err)
	}

	go func() {
		jsonBytes, err := json.Marshal(result)
		if err == nil {
			detachedCtx := context.WithoutCancel(ctx)
			s.cacheService.SetAsync(detachedCtx, cacheKey, jsonBytes, cache.Config.OCRTTL)
		}
	}()

	return result, false, nil
}

func (s *aiService) TranscribeAudio(ctx context.Context, fileContent []byte, filename string) (interface{}, bool, error) {

	cacheKey := s.cacheService.GenerateKey("transcribe", fileContent)
	if result, hit := s.cacheService.Get(ctx, cacheKey); hit {
		var cachedData interface{}
		if err := json.Unmarshal(result, &cachedData); err == nil {
			return cachedData, true, nil
		}
	}

	result, err := s.transcribeCB.Execute(func() (interface{}, error) {
		resp, err := s.grpcClient.TranscribeAudio(ctx, fileContent, filename)
		if err != nil {
			return nil, err
		}
		if !resp.Success {
			return nil, fmt.Errorf("transcription failed")
		}
		return resp, nil
	})

	if err != nil {
		return nil, false, s.handleError(err)
	}

	go func() {
		jsonBytes, err := json.Marshal(result)
		if err == nil {
			detachedCtx := context.WithoutCancel(ctx)
			s.cacheService.SetAsync(detachedCtx, cacheKey, jsonBytes, cache.Config.TranscriptionTTL)
		}
	}()

	return result, false, nil
}

func (s *aiService) handleError(err error) error {
	if err == gobreaker.ErrOpenState {
		return err
	}

	st, ok := status.FromError(err)
	if ok {
		logger.Error("AI Service gRPC failed",
			zap.String("code", st.Code().String()),
			zap.String("message", st.Message()),
		)
		return fmt.Errorf("AI Service error: %s", st.Message())
	}

	logger.Error("AI Service call failed", zap.Error(err))
	return err
}

func (s *aiService) VisualQuestionAnswering(ctx context.Context, fileContent []byte, filename string, question string) (interface{}, bool, error) {

	cacheKey := s.cacheService.GenerateKey("vqa", append(fileContent, []byte(question)...))
	if result, hit := s.cacheService.Get(ctx, cacheKey); hit {
		var cachedData interface{}
		if err := json.Unmarshal(result, &cachedData); err == nil {
			return cachedData, true, nil
		}
	}

	result, err := s.vqaCB.Execute(func() (interface{}, error) {
		resp, err := s.grpcClient.VisualQuestionAnswering(ctx, fileContent, filename, question)
		if err != nil {
			return nil, err
		}
		if !resp.Success {
			return nil, fmt.Errorf("vqa error: %s", resp.Message)
		}
		return resp, nil
	})

	if err != nil {
		return nil, false, s.handleError(err)
	}

	go func() {
		jsonBytes, err := json.Marshal(result)
		if err == nil {
			detachedCtx := context.WithoutCancel(ctx)
			s.cacheService.SetAsync(detachedCtx, cacheKey, jsonBytes, cache.Config.VQATTL)
		}
	}()

	return result, false, nil
}
