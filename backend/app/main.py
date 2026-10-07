"""
main.py
-------
FastAPI Application Entrypoint for DevOps Incident Copilot.
Includes CORS, lifespan indexing, API routers, and health checks.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.rag.vector_store import vector_store
from app.rag.indexer import index_all_documents
from app.api.incidents import router as incidents_router
from app.api.runbooks import router as runbooks_router
from app.api.models_config import router as models_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Check if ChromaDB collection has documents, auto-index if empty
    print("[STARTUP] Initializing DevOps Incident Copilot Knowledge Base...")
    stats = vector_store.get_stats()
    if stats["total_chunks"] == 0:
        print("[STARTUP] Vector store empty. Performing initial runbook and postmortem indexing...")
        try:
            res = index_all_documents()
            print(f"[STARTUP] Indexed {res['chunks_indexed']} chunks across {res['files_indexed']} files.")
        except Exception as e:
            print(f"[STARTUP WARN] Initial indexing encountered error: {e}")
    else:
        print(f"[STARTUP] Found {stats['total_chunks']} chunks ready in ChromaDB.")
    yield
    print("[SHUTDOWN] DevOps Incident Copilot shutting down.")

app = FastAPI(
    title="DevOps Runbook & Live Incident Copilot (RAG + MCP)",
    description="Intelligent SRE Copilot integrating RAG Knowledge Base, MCP live diagnostics, and Multi-Model triage.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration supporting development & production (Vercel, custom domains)
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(incidents_router)
app.include_router(runbooks_router)
app.include_router(models_router)

@app.get("/")
def root():
    return {
        "service": "DevOps Runbook & Live Incident Copilot API",
        "version": "1.0.0",
        "status": "operational",
        "docs_url": "/docs",
        "endpoints": {
            "triage": "/api/incidents/triage",
            "telemetry": "/api/incidents/telemetry",
            "presets": "/api/incidents/presets",
            "runbooks": "/api/runbooks",
            "models": "/api/models/status"
        }
    }

@app.get("/health")
def health_check():
    stats = vector_store.get_stats()
    return {
        "status": "healthy",
        "knowledge_base": stats,
        "active_provider": settings.DEFAULT_LLM_PROVIDER
    }
