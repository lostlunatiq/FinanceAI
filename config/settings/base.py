import os
from pathlib import Path
import environ

# --- Paths ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
)

# Load .env file if present
environ.Env.read_env(BASE_DIR / ".env")

# --- Core ---
SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.microsoft",
    "drf_spectacular",
    "corsheaders",
    "django_celery_beat",
]

LOCAL_APPS = [
    "apps.core",
    "apps.invoices",
    "apps.expenses",
    "apps.forecast",
    "apps.query",
    "apps.reports",
    "apps.notifications.apps.NotificationsConfig",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

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
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

ASGI_APPLICATION = "config.asgi.application"

# --- Database ---
DATABASES = {"default": env.db("DATABASE_URL")}
DATABASES["default"]["CONN_MAX_AGE"] = 0
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True

# --- Auth ---
AUTH_USER_MODEL = "core.User"
SITE_ID = 1

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- JWT ---
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# --- DRF ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "20/minute",
        "user": "600/minute",
        "nl_query": "60/minute",
        "login": "5/minute",
        "auth": "20/minute",
    },
}

# --- API Docs ---
SPECTACULAR_SETTINGS = {
    "TITLE": "FinanceAI API",
    "DESCRIPTION": "3SC Vendor Invoice Approval + Analytics Platform",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# --- Celery ---
CELERY_BROKER_URL = env("REDIS_URL", default="redis://redis:6379/0")
CELERY_RESULT_BACKEND = env("REDIS_URL", default="redis://redis:6379/0")
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = "Asia/Kolkata"
CELERY_ENABLE_UTC = True
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

# --- ClickHouse ---
CLICKHOUSE_HOST = env("CLICKHOUSE_HOST", default="clickhouse")
CLICKHOUSE_PORT = env.int("CLICKHOUSE_PORT", default=8123)
CLICKHOUSE_DATABASE = env("CLICKHOUSE_DATABASE", default="financeai")
CLICKHOUSE_USER = env("CLICKHOUSE_USER", default="default")
CLICKHOUSE_PASSWORD = env("CLICKHOUSE_PASSWORD", default="")

# --- OpenRouter ---
OPENROUTER_API_KEY = env("OPENROUTER_API_KEY")
OPENROUTER_SITE_URL = env("OPENROUTER_SITE_URL", default="https://3sc.financeai")
OPENROUTER_APP_NAME = env("OPENROUTER_APP_NAME", default="FinanceAI")
OPENROUTER_BASE_URL = env("OPENROUTER_BASE_URL", default="https://openrouter.ai/api/v1")
OPENROUTER_MODEL_OCR      = env("OPENROUTER_MODEL_OCR", default="anthropic/claude-3-haiku")
OPENROUTER_MODEL_TEXT     = env("OPENROUTER_MODEL_TEXT", default="anthropic/claude-3-haiku")
OPENROUTER_MODEL_FALLBACK = env("OPENROUTER_MODEL_FALLBACK", default="anthropic/claude-3-haiku")

# --- Email ---
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Tijori Finance <noreply@tijori.ai>")
FINANCE_NOTIFY_EMAIL = env("FINANCE_NOTIFY_EMAIL", default="finance@tijori.ai")

# --- Azure AD / MSAL ---
AZURE_CLIENT_ID = env("AZURE_CLIENT_ID", default="")
AZURE_CLIENT_SECRET = env("AZURE_CLIENT_SECRET", default="")
AZURE_TENANT_ID = env("AZURE_TENANT_ID", default="")

SOCIALACCOUNT_PROVIDERS = {
    "microsoft": {
        "APP": {
            "client_id": AZURE_CLIENT_ID,
            "secret": AZURE_CLIENT_SECRET,
            "settings": {
                "tenant": AZURE_TENANT_ID,
            },
        }
    }
}

# --- D365 ---
D365_TENANT_ID = env("D365_TENANT_ID", default="")
D365_CLIENT_ID = env("D365_CLIENT_ID", default="")
D365_CLIENT_SECRET = env("D365_CLIENT_SECRET", default="")
D365_ENVIRONMENT = env("D365_ENVIRONMENT", default="Sandbox")
D365_COMPANY_ID = env("D365_COMPANY_ID", default="")
D365_MOCK_MODE = env.bool("D365_MOCK_MODE", default=False)

# --- Teams ---
TEAMS_WEBHOOK_URL = env("TEAMS_WEBHOOK_URL", default="")

# --- ML model paths ---
MODELS_DIR = BASE_DIR / "models"
CATEGORY_MODEL_PATH = str(MODELS_DIR / "category_clf.pkl")
ANOMALY_MODEL_PATH = str(MODELS_DIR / "anomaly_iso.pkl")
PROPHET_MODEL_PATH = str(MODELS_DIR / "prophet_cashflow.pkl")

# --- Finance config ---
CASH_FLOOR_THRESHOLD = env.int("CASH_FLOOR_THRESHOLD", default=500000)

# --- Static / Media ---
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# --- Localisation ---
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Logging ---
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "ai": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "celery": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "ai.pipelines.ocr_pipeline": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "ai.pipelines.anomaly_pipeline": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}
