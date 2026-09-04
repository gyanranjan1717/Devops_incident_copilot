"""
models_config.py
----------------
Endpoints for monitoring and selecting LLM providers (Gemini vs. Ollama).
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.agent.llm_factory import llm_factory
from app.config import settings

router = APIRouter(prefix="/api/models", tags=["models"])

class ActiveModelRequest(BaseModel):
    provider: str
    model_name: Optional[str] = None

@router.get("/status")
def get_models_status():
    """Returns availability and supported model list for Gemini and Ollama."""
    status = llm_factory.check_providers_status()
    return {
        "current_provider": settings.DEFAULT_LLM_PROVIDER,
        "current_model": settings.GEMINI_MODEL_NAME if settings.DEFAULT_LLM_PROVIDER == "gemini" else settings.OLLAMA_MODEL_NAME,
        "providers": status
    }

@router.post("/active")
def set_active_model(req: ActiveModelRequest):
    """Dynamically switches active LLM provider."""
    settings.DEFAULT_LLM_PROVIDER = req.provider
    if req.model_name:
        if req.provider == "gemini":
            settings.GEMINI_MODEL_NAME = req.model_name
        else:
            settings.OLLAMA_MODEL_NAME = req.model_name
    return {
        "status": "updated",
        "active_provider": settings.DEFAULT_LLM_PROVIDER,
        "active_model": settings.GEMINI_MODEL_NAME if req.provider == "gemini" else settings.OLLAMA_MODEL_NAME
    }
