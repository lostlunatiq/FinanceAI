"""
Development settings — runs everything locally WITHOUT Docker.
SQLite database, no ClickHouse, no Redis, no Celery.
OCR tasks run synchronously. Frontend served by Django.
"""
import os
from pathlib import Path

# ─── Base import with overrides ─────────────────────────────────
# We import from base but override everything that requires Docker
from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

# ─── Force SQLite ────────────────────────────────────────────────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Disable ClickHouse router entirely
DATABASE_ROUTERS = []

# ─── Remove apps that might not have proper migrations ───────────
# Keep only the apps we actually use
INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    # Third party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    # Local
    "apps.core",
    "apps.invoices",
    "apps.expenses",
    "apps.forecast",
    "apps.query",
    "apps.reports",
    "apps.notifications.apps.NotificationsConfig",
]

# Remove allauth middleware if allauth is not installed
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.AuditLogMiddleware",
]

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
]

# ─── Relaxed CORS ────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# ─── Print emails to console ────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# ─── Disable throttling in dev ───────────────────────────────────
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []
REST_FRAMEWORK["DEFAULT_PAGINATION_CLASS"] = None  # No pagination for simpler dev

# ─── Faster password hashing in dev ─────────────────────────────
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# ─── Celery: run tasks synchronously (no Redis needed) ───────────
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"

# ─── OpenRouter model config ────────────────────────────────────
# Change these to switch models across the whole app
OPENROUTER_MODEL_OCR      = "anthropic/claude-haiku-4-5"         # vision: PDF/image OCR (reliable)
OPENROUTER_MODEL_FALLBACK = "google/gemini-2.5-flash-preview"   # fallback if primary OCR fails
OPENROUTER_MODEL_TEXT     = "anthropic/claude-haiku-4-5"         # text: anomaly, NL query, chatbot
OPENROUTER_BASE_URL       = "https://openrouter.ai/api/v1"

# ─── OCR config ──────────────────────────────────────────────────
OCR_CONFIDENCE_AUTO_ACCEPT = 0.85
OCR_CONFIDENCE_REVIEW = 0.50
OCR_CONFIDENCE_MANUAL = 0.30

# ─── Static files: serve frontend HTML from /frontend/ ───────────
STATICFILES_DIRS = [
    BASE_DIR / "frontend",
]

# ─── Disable CSRF for API requests ──────────────────────────────
CSRF_TRUSTED_ORIGINS = ["http://localhost:8000", "http://127.0.0.1:8000"]
