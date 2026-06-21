from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "MAM"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://mam_user:mam_password@localhost:5432/mam_db"

    # Security
    SECRET_KEY: str = "change-this-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # File Uploads
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 50

    # CORS — comma-separated list, e.g. "https://mam.vercel.app,http://localhost:3000"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    CORS_ORIGINS_STR: str = ""

    # Email / SMTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@agency.com"

    # AI — Google Gemini API
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


import os
import warnings
_settings = Settings()
if os.environ.get("VERCEL", "") == "1":
    _settings.UPLOAD_DIR = f"/tmp/{_settings.UPLOAD_DIR}"
if _settings.CORS_ORIGINS_STR:
    _settings.CORS_ORIGINS = [o.strip() for o in _settings.CORS_ORIGINS_STR.split(",") if o.strip()]
if _settings.SECRET_KEY == "change-this-secret-key":
    warnings.warn("WARNING: Using default SECRET_KEY — set a secure value in .env before going to production!", stacklevel=2)
settings = _settings
