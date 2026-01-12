"""
Async gRPC Client for internal communication with the AI Worker Process.
This allows the HTTP API to forward requests to the isolated AI process.
Enhanced with request ID metadata propagation for distributed tracing.
"""

import grpc

from app.core import logger
from app.grpc_generated import ai_service_pb2_grpc


class AIClient:
    """
    gRPC client for communicating with the AI worker process.
    Supports request ID propagation via metadata for tracing.
    """

    def __init__(self, host: str = "localhost", port: int = 50051):
        self.host = host
        self.port = port
        self.channel = None
        self.stub = None

    async def connect(self):
        """Establish gRPC connection."""
        target = f"{self.host}:{self.port}"
        logger.info(f"Connecting to internal gRPC server at {target}")
        self.channel = grpc.aio.insecure_channel(target)
        self.stub = ai_service_pb2_grpc.AIServiceStub(self.channel)

    async def close(self):
        """Close gRPC connection."""
        if self.channel:
            await self.channel.close()
            logger.info("Internal gRPC connection closed")

    def get_stub(self):
        """Get the gRPC stub, connecting if necessary."""
        if self.stub is None:
            target = f"{self.host}:{self.port}"
            self.channel = grpc.aio.insecure_channel(target)
            self.stub = ai_service_pb2_grpc.AIServiceStub(self.channel)
        return self.stub

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


# Helper function to make traced calls
async def call_with_tracing(
    method, request, request_id: str = None, timeout: float = 120.0
):
    """
    Make a gRPC call with request ID tracing.

    Args:
        method: The gRPC method to call (stub.MethodName)
        request: The request message
        request_id: Request ID for tracing
        timeout: Request timeout in seconds

    Returns:
        The gRPC response
    """
    metadata = AIClient.create_metadata(request_id=request_id)

    return await method(request, metadata=metadata, timeout=timeout)
