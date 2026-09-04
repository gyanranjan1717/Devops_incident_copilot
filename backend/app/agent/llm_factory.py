"""
llm_factory.py
--------------
Multi-Model Provider Factory.
Supports:
1. Google Gemini (gemini-1.5-pro, gemini-1.5-flash)
2. Local Ollama (llama3.1, qwen2.5-coder)
Includes safe fallback synthesis if offline.
"""

import asyncio
import requests
from typing import Dict, Any, Optional
import google.generativeai as genai

from app.config import settings

class LLMFactory:
    def __init__(self):
        self._init_gemini()

    def _init_gemini(self):
        if settings.GEMINI_API_KEY:
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.gemini_configured = True
            except Exception as e:
                print(f"[WARN] Could not configure Gemini: {e}")
                self.gemini_configured = False
        else:
            self.gemini_configured = False

    def check_providers_status(self) -> Dict[str, Any]:
        """Checks availability of Gemini and local Ollama server."""
        gemini_ok = False
        ollama_ok = False
        ollama_models = []

        if self.gemini_configured:
            gemini_ok = True

        try:
            resp = requests.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=1.5)
            if resp.status_code == 200:
                ollama_ok = True
                ollama_models = [m.get("name") for m in resp.json().get("models", [])]
        except Exception:
            ollama_ok = False

        return {
            "gemini": {
                "available": gemini_ok,
                "default_model": settings.GEMINI_MODEL_NAME,
                "supported_models": [settings.GEMINI_MODEL_NAME, settings.GEMINI_FLASH_MODEL]
            },
            "ollama": {
                "available": ollama_ok,
                "base_url": settings.OLLAMA_BASE_URL,
                "installed_models": ollama_models,
                "default_model": settings.OLLAMA_MODEL_NAME
            }
        }

    async def generate_response(
        self,
        prompt: str,
        system_prompt: str,
        provider: Optional[str] = None,
        model_name: Optional[str] = None
    ) -> str:
        """Dispatches prompt to selected provider (Gemini or Ollama)."""
        selected_provider = (provider or settings.DEFAULT_LLM_PROVIDER).lower()

        if selected_provider == "ollama":
            return await self._call_ollama(prompt, system_prompt, model_name)
        else:
            return await self._call_gemini(prompt, system_prompt, model_name)

    async def _call_gemini(
        self,
        prompt: str,
        system_prompt: str,
        model_name: Optional[str] = None
    ) -> str:
        target_model = model_name or settings.GEMINI_MODEL_NAME

        if not self.gemini_configured:
            raise ValueError("Gemini API key is not configured.")

        loop = asyncio.get_event_loop()

        try:
            model = genai.GenerativeModel(
                model_name=target_model,
                system_instruction=system_prompt,
                generation_config={"temperature": 0.2, "top_p": 0.95}
            )
            response = await loop.run_in_executor(None, model.generate_content, prompt)
            return response.text
        except Exception as e:
            # Fallback to gemini-flash-latest if model fails
            if target_model != settings.GEMINI_FLASH_MODEL:
                try:
                    print(f"[INFO] Retrying with {settings.GEMINI_FLASH_MODEL} due to: {e}")
                    fallback_model = genai.GenerativeModel(
                        model_name=settings.GEMINI_FLASH_MODEL,
                        system_instruction=system_prompt,
                        generation_config={"temperature": 0.2}
                    )
                    resp = await loop.run_in_executor(None, fallback_model.generate_content, prompt)
                    return resp.text
                except Exception as e2:
                    raise RuntimeError(f"Gemini API failure: {e2}")
            raise RuntimeError(f"Gemini API error: {e}")

    async def _call_ollama(
        self,
        prompt: str,
        system_prompt: str,
        model_name: Optional[str] = None
    ) -> str:
        target_model = model_name or settings.OLLAMA_MODEL_NAME
        try:
            resp = requests.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": target_model,
                    "prompt": prompt,
                    "system": system_prompt,
                    "stream": False
                },
                timeout=45
            )
            if resp.status_code == 200:
                return resp.json().get("response", "")
            raise RuntimeError(f"Ollama returned HTTP {resp.status_code}: {resp.text}")
        except Exception as e:
            raise RuntimeError(f"Could not connect to Ollama server at {settings.OLLAMA_BASE_URL}: {e}")

llm_factory = LLMFactory()
