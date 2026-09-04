"""
config.py
---------
Configuration management using pydantic-settings.
Loads environment variables from .env file or system environment.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Server Configuration
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    FRONTEND_PORT: int = 5173
    ENVIRONMENT: str = "development"

    # Model Provider Selection ("gemini" or "ollama")
    DEFAULT_LLM_PROVIDER: str = "gemini"
    DEFAULT_EMBEDDING_PROVIDER: str = "gemini"

    # Google Gemini Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL_NAME: str = "gemini-flash-latest"
    GEMINI_FLASH_MODEL: str = "gemini-3.6-flash"
    GEMINI_EMBEDDING_MODEL: str = "models/gemini-embedding-001"

    # Local Model (Ollama) Configuration
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL_NAME: str = "llama3.1"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"

    # Vector Database (ChromaDB)
    CHROMA_PERSIST_DIRECTORY: str = str(BASE_DIR / "chroma_db")
    CHROMA_COLLECTION_NAME: str = "devops_knowledge_base"

    # Data directories
    DATA_DIRECTORY: str = str(BASE_DIR / "data")

    # Diagnostics & MCP Telemetry Sources
    POSTGRES_DIAGNOSTIC_DB_URL: str = ""
    NEON_PROJECT_ID: str = ""

    RENDER_API_KEY: str = ""
    RENDER_SERVICE_ID: str = ""
    RENDER_SERVICE_URL: str = ""

    VERCEL_API_TOKEN: str = ""
    VERCEL_PROJECT_ID: str = ""

settings = Settings()
