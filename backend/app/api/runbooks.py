"""
runbooks.py
-----------
API routes for browsing, retrieving, searching, and re-indexing SRE runbooks & postmortems.
"""

from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.rag.vector_store import vector_store
from app.rag.indexer import index_all_documents, extract_title, extract_tags

router = APIRouter(prefix="/api/runbooks", tags=["runbooks"])

DATA_DIR = Path(settings.DATA_DIRECTORY)
RUNBOOKS_DIR = DATA_DIR / "runbooks"
POSTMORTEMS_DIR = DATA_DIR / "postmortems"

@router.get("")
def list_documents(doc_type: Optional[str] = None):
    """Lists all available runbooks and postmortems."""
    docs = []

    if doc_type != "postmortem" and RUNBOOKS_DIR.exists():
        for f in sorted(RUNBOOKS_DIR.glob("*.md")):
            content = f.read_text(encoding="utf-8")
            docs.append({
                "filename": f.name,
                "title": extract_title(content, f.name),
                "type": "runbook",
                "tags": extract_tags(content),
                "size_bytes": f.stat().st_size
            })

    if doc_type != "runbook" and POSTMORTEMS_DIR.exists():
        for f in sorted(POSTMORTEMS_DIR.glob("*.md")):
            content = f.read_text(encoding="utf-8")
            docs.append({
                "filename": f.name,
                "title": extract_title(content, f.name),
                "type": "postmortem",
                "tags": extract_tags(content),
                "size_bytes": f.stat().st_size
            })

    stats = vector_store.get_stats()
    return {
        "count": len(docs),
        "documents": docs,
        "vector_store_stats": stats
    }

@router.get("/search")
def search_knowledge_base(
    q: str = Query(..., description="Semantic search query"),
    limit: int = Query(5, ge=1, le=10),
    doc_type: Optional[str] = None
):
    """Direct semantic search query returning matched chunks and relevance."""
    results = vector_store.search(q, n_results=limit, doc_type=doc_type)
    return {
        "query": q,
        "results_count": len(results),
        "results": results
    }

@router.get("/{filename}")
def get_document_content(filename: str):
    """Returns the raw markdown content of a specific runbook or postmortem."""
    target_path = RUNBOOKS_DIR / filename
    if not target_path.exists():
        target_path = POSTMORTEMS_DIR / filename

    if not target_path.exists():
        raise HTTPException(status_code=404, detail=f"Document {filename} not found")

    content = target_path.read_text(encoding="utf-8")
    return {
        "filename": filename,
        "title": extract_title(content, filename),
        "tags": extract_tags(content),
        "content": content
    }

@router.post("/reindex")
def trigger_reindexing():
    """Triggers complete re-indexing of all markdown files into ChromaDB."""
    result = index_all_documents()
    return {
        "status": "success",
        "message": "Knowledge base reindexed successfully",
        "details": result
    }
