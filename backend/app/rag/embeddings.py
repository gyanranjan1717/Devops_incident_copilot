"""
embeddings.py
-------------
Provides switchable and resilient embedding functions for ChromaDB.
Supports:
- Google Gemini text-embedding-004
- Fallback local deterministic/dense embedding function for offline/fail-safe operation.
"""

import math
import hashlib
from typing import List
import chromadb
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings

from app.config import settings

class ResilientGeminiEmbeddingFunction(EmbeddingFunction):
    """
    Embedding function that calls Gemini text-embedding-004 when GEMINI_API_KEY is available,
    and seamlessly falls back to a deterministic dense vector representation if offline or on rate limit.
    """
    def __init__(self, api_key: str = "", model_name: str = ""):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model_name = model_name or settings.GEMINI_EMBEDDING_MODEL
        self._gemini_client_ready = False

        if self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.genai = genai
                self._gemini_client_ready = True
            except Exception as e:
                print(f"[WARN] Failed to configure Gemini Embeddings: {e}. Using fallback embedding.")

    def __call__(self, input: Documents) -> Embeddings:
        if not input:
            return []

        if self._gemini_client_ready:
            try:
                embeddings: List[List[float]] = []
                # Process in batches of 20 to respect Gemini API batch limits
                batch_size = 20
                for i in range(0, len(input), batch_size):
                    batch = input[i:i + batch_size]
                    response = self.genai.embed_content(
                        model=self.model_name,
                        content=batch,
                        task_type="retrieval_document"
                    )
                    batch_embeds = response.get("embedding", [])
                    embeddings.extend(batch_embeds)
                if len(embeddings) == len(input):
                    return embeddings
            except Exception as e:
                print(f"[WARN] Gemini embedding API call failed: {e}. Falling back to dense embedding.")

        # Resilient Dense Embedding Fallback (3072 dimensions matching gemini-embedding-001)
        return [self._dense_fallback_embedding(doc, dim=3072) for doc in input]

    def _dense_fallback_embedding(self, text: str, dim: int = 3072) -> List[float]:
        """Generates a stable, normalized 3072-dimensional vector from token hashes."""
        vec = [0.0] * dim
        words = text.lower().split()
        if not words:
            return vec
        for i, word in enumerate(words):
            # Derive index and sign from sha256 hash
            h = int(hashlib.sha256(word.encode("utf-8")).hexdigest(), 16)
            idx = h % dim
            val = ((h >> 8) % 1000) / 1000.0 - 0.5
            pos_weight = 1.0 / (1.0 + math.log1p(i))
            vec[idx] += val * pos_weight

        # L2 normalize
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]
        return vec

def get_embedding_function() -> EmbeddingFunction:
    """Factory to retrieve active embedding function."""
    return ResilientGeminiEmbeddingFunction()
