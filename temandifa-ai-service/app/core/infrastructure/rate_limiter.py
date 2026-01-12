"""
Rate limiter configuration using SlowAPI.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Initialize rate limiter with remote address as key
limiter = Limiter(key_func=get_remote_address)
