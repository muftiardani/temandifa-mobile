"""
Dynamic Batcher for GPU Batch Inference.
Collects incoming requests and processes them in batches for efficient GPU utilization.
"""

import asyncio
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Generic, TypeVar

from app.core import logger

T = TypeVar("T")
R = TypeVar("R")


@dataclass
class BatchItem(Generic[T, R]):
    """Single item in the batch queue."""

    data: T
    future: asyncio.Future = field(
        default_factory=lambda: asyncio.get_event_loop().create_future()
    )
    request_id: str = "-"


class DynamicBatcher(Generic[T, R]):
    """
    Dynamic batcher that collects requests and processes them in batches.

    Features:
    - Configurable max batch size
    - Timeout-based batching (process after max_wait_ms even if batch not full)
    - Async-safe with proper locking
    - Error propagation to individual futures

    Usage:
        batcher = DynamicBatcher(
            process_fn=my_batch_processor,
            max_batch_size=8,
            max_wait_ms=50.0
        )
        result = await batcher.add(image_bytes)
    """

    def __init__(
        self,
        process_fn: Callable[[list[T]], list[R]],
        max_batch_size: int = 8,
        max_wait_ms: float = 50.0,
        name: str = "batcher",
    ):
        """
        Initialize the dynamic batcher.

        Args:
            process_fn: Async function that processes a batch of inputs
            max_batch_size: Maximum items per batch
            max_wait_ms: Maximum wait time before processing incomplete batch
            name: Identifier for logging
        """
        self.process_fn = process_fn
        self.max_batch_size = max_batch_size
        self.max_wait_ms = max_wait_ms
        self.name = name

        self._queue: deque[BatchItem[T, R]] = deque()
        self._lock = asyncio.Lock()
        self._timer_task: asyncio.Task | None = None
        self._is_processing = False

        logger.info(
            "DynamicBatcher initialized",
            name=name,
            max_batch_size=max_batch_size,
            max_wait_ms=max_wait_ms,
        )

    async def add(self, data: T, request_id: str = "-") -> R:
        """
        Add an item to the batch queue and wait for result.

        Args:
            data: Input data to process
            request_id: Request ID for tracing

        Returns:
            Processed result
        """
        item = BatchItem[T, R](data=data, request_id=request_id)

        async with self._lock:
            self._queue.append(item)
            queue_size = len(self._queue)

            # If batch is full, process immediately
            if queue_size >= self.max_batch_size:
                asyncio.create_task(self._process_batch())
            # Otherwise, start timer if not already running
            elif self._timer_task is None or self._timer_task.done():
                self._timer_task = asyncio.create_task(self._wait_and_process())

        logger.debug(
            "Item added to batch queue",
            name=self.name,
            request_id=request_id,
            queue_size=queue_size,
        )

        return await item.future

    async def _wait_and_process(self):
        """Wait for timeout then process whatever is in the queue."""
        await asyncio.sleep(self.max_wait_ms / 1000.0)
        await self._process_batch()

    async def _process_batch(self):
        """Process all items currently in the queue."""
        async with self._lock:
            if not self._queue or self._is_processing:
                return

            self._is_processing = True

            # Collect items up to max batch size
            batch_size = min(len(self._queue), self.max_batch_size)
            batch: list[BatchItem[T, R]] = [
                self._queue.popleft() for _ in range(batch_size)
            ]

        request_ids = [item.request_id for item in batch]
        logger.debug(
            "Processing batch",
            name=self.name,
            batch_size=len(batch),
            request_ids=request_ids,
        )

        try:
            # Extract inputs
            inputs = [item.data for item in batch]

            # Process batch (this is the expensive GPU operation)
            results = await self.process_fn(inputs)

            # Distribute results to futures
            if len(results) != len(batch):
                raise ValueError(
                    f"Batch processor returned {len(results)} results for {len(batch)} inputs"
                )

            for item, result in zip(batch, results):
                if not item.future.done():
                    item.future.set_result(result)

            logger.debug(
                "Batch processed successfully",
                name=self.name,
                batch_size=len(batch),
            )

        except Exception as e:
            # Propagate error to all futures in batch
            logger.error(
                "Batch processing failed",
                name=self.name,
                error=str(e),
            )
            for item in batch:
                if not item.future.done():
                    item.future.set_exception(e)

        finally:
            self._is_processing = False

            # Check if more items arrived while processing
            if self._queue:
                asyncio.create_task(self._process_batch())

    @property
    def queue_size(self) -> int:
        """Current number of items waiting in queue."""
        return len(self._queue)

    @property
    def is_processing(self) -> bool:
        """Whether a batch is currently being processed."""
        return self._is_processing


class BatcherRegistry:
    """
    Registry for managing multiple batchers.
    Provides easy access to batchers by name.
    """

    _batchers: dict[str, DynamicBatcher] = {}

    @classmethod
    def register(cls, name: str, batcher: DynamicBatcher):
        """Register a batcher with given name."""
        cls._batchers[name] = batcher
        logger.info("Batcher registered", name=name)

    @classmethod
    def get(cls, name: str) -> DynamicBatcher | None:
        """Get batcher by name."""
        return cls._batchers.get(name)

    @classmethod
    def get_stats(cls) -> dict[str, dict]:
        """Get stats for all registered batchers."""
        return {
            name: {
                "queue_size": batcher.queue_size,
                "is_processing": batcher.is_processing,
                "max_batch_size": batcher.max_batch_size,
            }
            for name, batcher in cls._batchers.items()
        }
