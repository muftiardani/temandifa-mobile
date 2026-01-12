"""
Structured logging configuration for AI Service.
Supports both text and JSON format for production/development.
"""

import json
import logging
import sys
from datetime import datetime
from typing import Any


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging in production."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if hasattr(record, "extra_data"):
            log_data.update(record.extra_data)

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)


class ColoredFormatter(logging.Formatter):
    """Colored formatter for development."""

    COLORS = {
        "DEBUG": "\033[36m",  # Cyan
        "INFO": "\033[32m",  # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",  # Red
        "CRITICAL": "\033[35m",  # Magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{color}{record.levelname}{self.RESET}"
        return super().format(record)


def setup_logging(level: str = "INFO", log_format: str = "text") -> logging.Logger:
    """
    Setup logging configuration.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_format: Format type ('json' for production, 'text' for development)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger("temandifa-ai")
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)

    if log_format == "json":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(
            ColoredFormatter(
                fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )

    logger.addHandler(handler)

    # Suppress noisy loggers
    logging.getLogger("ultralytics").setLevel(logging.WARNING)
    logging.getLogger("paddle").setLevel(logging.WARNING)
    logging.getLogger("ppocr").setLevel(logging.WARNING)

    return logger


class Logger:
    """Logger wrapper with extra data support."""

    def __init__(self, name: str = "temandifa-ai"):
        self._logger = logging.getLogger(name)

    def _log(self, level: int, msg: str, extra: dict[str, Any] | None = None):
        if extra:
            record = self._logger.makeRecord(
                self._logger.name, level, "", 0, msg, (), None
            )
            record.extra_data = extra
            self._logger.handle(record)
        else:
            self._logger.log(level, msg)

    def debug(self, msg: str, **extra):
        self._log(logging.DEBUG, msg, extra if extra else None)

    def info(self, msg: str, **extra):
        self._log(logging.INFO, msg, extra if extra else None)

    def warning(self, msg: str, **extra):
        self._log(logging.WARNING, msg, extra if extra else None)

    def error(self, msg: str, **extra):
        self._log(logging.ERROR, msg, extra if extra else None)

    def critical(self, msg: str, **extra):
        self._log(logging.CRITICAL, msg, extra if extra else None)


# Default logger instance (will be initialized in main.py)
logger = Logger()
