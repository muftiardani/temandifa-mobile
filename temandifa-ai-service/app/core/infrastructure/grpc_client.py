"""
Async gRPC Client for internal communication with the AI Worker Process.
This allows the HTTP API to forward requests to the isolated AI process.
Enhanced with request ID metadata propagation for distributed tracing.
"""

import grpc

from app.core import logger
from app.grpc_generated import ai_service_pb2_grpc

# gRPC channel options for performance and resilience
GRPC_CHANNEL_OPTIONS = [
    # Keepalive settings - maintain connection health
    ("grpc.keepalive_time_ms", 30000),  # Send keepalive ping every 30s
    ("grpc.keepalive_timeout_ms", 10000),  # Wait 10s for keepalive response
    ("grpc.keepalive_permit_without_calls", True),  # Allow without active calls
    ("grpc.http2.min_time_between_pings_ms", 10000),  # Min 10s between pings
    # Message size limits - support large images/audio
    ("grpc.max_receive_message_length", 50 * 1024 * 1024),  # 50MB receive
    ("grpc.max_send_message_length", 50 * 1024 * 1024),  # 50MB send
    # Connection settings
    ("grpc.initial_reconnect_backoff_ms", 1000),  # 1s initial backoff
    ("grpc.max_reconnect_backoff_ms", 10000),  # 10s max backoff
]


class AIClient:
    """
    gRPC client for communicating with the AI worker process.
    Supports request ID propagation via metadata for tracing.
    Enhanced with connection pooling and keepalive.
    """

    def __init__(self, host: str = "localhost", port: int = 50051):
        self.host = host
        self.port = port
        self.channel = None
        self.stub = None
        self._connected = False

    async def connect(self):
        """Establish gRPC connection with optimized channel options."""
        target = f"{self.host}:{self.port}"
        logger.info(f"Connecting to internal gRPC server at {target}")
        self.channel = grpc.aio.insecure_channel(target, options=GRPC_CHANNEL_OPTIONS)
        self.stub = ai_service_pb2_grpc.AIServiceStub(self.channel)
        self._connected = True

    async def close(self):
        """Close gRPC connection."""
        if self.channel:
            await self.channel.close()
            self._connected = False
            logger.info("Internal gRPC connection closed")

    def get_stub(self):
        """Get the gRPC stub, connecting if necessary."""
        if self.stub is None:
            target = f"{self.host}:{self.port}"
            self.channel = grpc.aio.insecure_channel(
                target, options=GRPC_CHANNEL_OPTIONS
            )
            self.stub = ai_service_pb2_grpc.AIServiceStub(self.channel)
            self._connected = True
        return self.stub

    def is_connected(self) -> bool:
        """Check if client is connected."""
        return self._connected and self.channel is not None

    async def get_channel_state(self) -> str:
        """Get current channel connectivity state."""
        if not self.channel:
            return "NOT_CONNECTED"
        try:
            state = self.channel.get_state(try_to_connect=False)
            return str(state).replace("ChannelConnectivity.", "")
        except Exception:
            return "UNKNOWN"

    @staticmethod
    def create_metadata(request_id: str = None, **extra) -> list:
        """
        Create gRPC metadata for request tracing.

        Args:
            request_id: The request ID to propagate for tracing
            **extra: Additional metadata key-value pairs

        Returns:
            List of (key, value) tuples for gRPC metadata
        """
        metadata = []

        if request_id:
            metadata.append(("x-request-id", request_id))

        for key, value in extra.items():
            metadata.append((key, str(value)))

        return metadata


# Singleton instance
ai_client = AIClient()
