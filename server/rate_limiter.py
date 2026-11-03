"""Shared Flask-Limiter configuration for the API."""
import os

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

DEFAULT_LIMITS = ('200 per day', '50 per hour')
STORAGE_URI = os.getenv('RATELIMIT_STORAGE_URI', 'memory://')

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=DEFAULT_LIMITS,
    storage_uri=STORAGE_URI,
)
