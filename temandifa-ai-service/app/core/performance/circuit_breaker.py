"""
Circuit Breaker pattern implementation for external API resilience.
Prevents cascading failures when external services are unavailable.
"""

import time
from collections.abc import Callable

from app.core import logger


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open."""


class CircuitBreaker:
    """
    Circuit breaker pattern for external API calls.

    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Failures exceeded threshold, requests blocked
    - HALF_OPEN: Testing if service recovered
    """

    STATE_CLOSED = "closed"
    STATE_OPEN = "open"
    STATE_HALF_OPEN = "half_open"

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 3,
    ):
        """
        Initialize circuit breaker.

        Args:
            name: Identifier for logging
            failure_threshold: Failures before opening circuit
            recovery_timeout: Seconds before attempting recovery
            half_open_max_calls: Max test calls in half-open state
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls

        self.state = self.STATE_CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.half_open_calls = 0

    def can_execute(self) -> bool:
        """Check if execution is allowed."""
        if self.state == self.STATE_CLOSED:
            return True

        if self.state == self.STATE_OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = self.STATE_HALF_OPEN
                self.half_open_calls = 0
                logger.info(
                    "Circuit breaker transitioning to HALF_OPEN", name=self.name
                )
                return True
            return False

        if self.state == self.STATE_HALF_OPEN:
            return self.half_open_calls < self.half_open_max_calls

        return False

    def record_success(self):
        """Record a successful call."""
        if self.state == self.STATE_HALF_OPEN:
            self.state = self.STATE_CLOSED
            self.failure_count = 0
            logger.info("Circuit breaker CLOSED after successful test", name=self.name)
        elif self.state == self.STATE_CLOSED:
            self.failure_count = 0

    def record_failure(self):
        """Record a failed call."""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.state == self.STATE_HALF_OPEN:
            self.state = self.STATE_OPEN
            logger.warning(
                "Circuit breaker OPEN after half-open failure", name=self.name
            )
        elif self.failure_count >= self.failure_threshold:
            self.state = self.STATE_OPEN
            logger.warning(
                "Circuit breaker OPEN after failures",
                name=self.name,
                failure_count=self.failure_count,
            )

    def execute(self, func: Callable, *args, **kwargs):
        """Execute function with circuit breaker protection."""
        if not self.can_execute():
            raise CircuitBreakerOpenError(
                f"Circuit breaker '{self.name}' is open. "
                "Service temporarily unavailable."
            )

        if self.state == self.STATE_HALF_OPEN:
            self.half_open_calls += 1

        try:
            result = func(*args, **kwargs)
            self.record_success()
            return result
        except Exception:
            self.record_failure()
            raise

    def get_status(self) -> dict:
        """Get circuit breaker status for monitoring."""
        return {
            "name": self.name,
            "state": self.state,
            "failure_count": self.failure_count,
            "failure_threshold": self.failure_threshold,
        }

    def reset(self):
        """Manually reset circuit breaker to closed state."""
        self.state = self.STATE_CLOSED
        self.failure_count = 0
        self.half_open_calls = 0
        logger.info("Circuit breaker manually reset", name=self.name)
