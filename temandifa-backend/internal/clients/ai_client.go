package clients

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/metadata"

	pb "temandifa-backend/internal/grpc/aiservice" //nolint:typecheck
	"temandifa-backend/internal/helpers"
	"temandifa-backend/internal/logger"
)

// RequestIDKey is the context key for request ID
type RequestIDKey struct{}

type AIClient struct {
	conn   *grpc.ClientConn
	client pb.AIServiceClient
}

// NewAIClient creates a new gRPC client for AI Service
// address should be "host:port", e.g., "ai-service:50051"
func NewAIClient(address string) (*AIClient, func(), error) {
	// 5 seconds timeout for connection
	// 5 seconds timeout was previously used for DialContext, but NewClient is non-blocking.
	// We keep the signature but remove the unused context.

	// Connect to gRPC server
	// Using insecure for internal communication within Docker network
	kacp := keepalive.ClientParameters{
		Time:                10 * time.Second, // send pings every 10 seconds if there is no activity
		Timeout:             time.Second,      // wait 1 second for ping ack before considering the connection dead
		PermitWithoutStream: true,             // send pings even without active streams
	}

	conn, err := grpc.NewClient(address,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithKeepaliveParams(kacp),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create gRPC client: %w", err)
	}

	// Wait for connection (since we removed WithBlock) or fail fast
	// Note: NewClient doesn't block, so we might want to check connectivity explicitly or let the first call handle it.
	// For backward compatibility with previous logic, we can verify state, but NewClient design philosophy is "lazy connection".
	// We will rely on the first call to Connect.

	client := pb.NewAIServiceClient(conn)

	cleanup := func() {
		if err := conn.Close(); err != nil {
			logger.Error("Failed to close gRPC connection: " + err.Error())
		}
	}

	return &AIClient{
		conn:   conn,
		client: client,
	}, cleanup, nil
}

// withRequestID adds the request ID from context to gRPC metadata
func withRequestID(ctx context.Context) context.Context {
	// Try to get request ID from context
	if requestID, ok := ctx.Value("request_id").(string); ok && requestID != "" {
		ctx = metadata.AppendToOutgoingContext(ctx, "x-request-id", requestID)
	}
	return ctx
}

// DetectObjects calls the DetectObjects gRPC method
func (c *AIClient) DetectObjects(ctx context.Context, imageData []byte, filename string) (*pb.DetectionResponse, error) {
	ctx = withRequestID(ctx)
	req := &pb.ImageRequest{
		ImageData: imageData,
		Filename:  filename,
	}

	var resp *pb.DetectionResponse
	err := helpers.WithRetry(ctx, helpers.DefaultRetryConfig, "DetectObjects", func() error {
		var err error
		resp, err = c.client.DetectObjects(ctx, req)
		return err
	})

	return resp, err
}

// ExtractText calls the ExtractText gRPC method
func (c *AIClient) ExtractText(ctx context.Context, imageData []byte, filename, language string) (*pb.OCRResponse, error) {
	ctx = withRequestID(ctx)
	req := &pb.OCRRequest{
		ImageData: imageData,
		Filename:  filename,
		Language:  language,
	}

	var resp *pb.OCRResponse
	err := helpers.WithRetry(ctx, helpers.DefaultRetryConfig, "ExtractText", func() error {
		var err error
		resp, err = c.client.ExtractText(ctx, req)
		return err
	})

	return resp, err
}

// TranscribeAudio calls the TranscribeAudio gRPC method
func (c *AIClient) TranscribeAudio(ctx context.Context, audioData []byte, filename string) (*pb.TranscriptionResponse, error) {
	ctx = withRequestID(ctx)
	req := &pb.AudioRequest{
		AudioData: audioData,
		Filename:  filename,
	}

	var resp *pb.TranscriptionResponse
	err := helpers.WithRetry(ctx, helpers.DefaultRetryConfig, "TranscribeAudio", func() error {
		var err error
		resp, err = c.client.TranscribeAudio(ctx, req)
		return err
	})

	return resp, err
}

// VisualQuestionAnswering calls the VQA gRPC method
func (c *AIClient) VisualQuestionAnswering(ctx context.Context, imageData []byte, filename, question string) (*pb.VQAResponse, error) {
	ctx = withRequestID(ctx)
	req := &pb.VQARequest{
		ImageData: imageData,
		Filename:  filename,
		Question:  question,
	}

	var resp *pb.VQAResponse
	err := helpers.WithRetry(ctx, helpers.DefaultRetryConfig, "VisualQuestionAnswering", func() error {
		var err error
		resp, err = c.client.VisualQuestionAnswering(ctx, req)
		return err
	})

	return resp, err
}
