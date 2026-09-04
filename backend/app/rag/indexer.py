"""
indexer.py
----------
Parses and indexes markdown SRE Runbooks and RCA Postmortems into ChromaDB.
Uses header-aware semantic chunking to preserve procedural integrity.
"""

import re
import os
from pathlib import Path
from typing import List, Dict, Any

from app.config import settings
from app.rag.vector_store import vector_store

def extract_title(content: str, fallback: str) -> str:
    """Extracts first H1 header as title or uses filename fallback."""
    match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    if match:
        return match.group(1).strip()
    return fallback.replace("_", " ").replace(".md", "").title()

def extract_tags(content: str) -> List[str]:
    """Extracts tags from markdown frontmatter or tag metadata lines."""
    tags = []
    match = re.search(r"Tags?:\s*`?([^\n`]+)`?", content, re.IGNORECASE)
    if match:
        raw_tags = match.group(1)
        tags = [t.strip().replace("`", "") for t in raw_tags.split(",") if t.strip()]
    return tags

def chunk_markdown(content: str, filename: str, doc_type: str) -> List[Dict[str, Any]]:
    """
    Splits markdown into logical chunks based on # and ## headers.
    If a section exceeds 1200 characters, recursively sub-chunks it.
    """
    title = extract_title(content, filename)
    tags = extract_tags(content)

    # Split by level 1 and 2 headers while keeping the header text
    sections = re.split(r"(?=(?:\n|^)#{1,3}\s+)", content)
    chunks: List[Dict[str, Any]] = []

    chunk_idx = 0
    for section in sections:
        section = section.strip()
        if not section or len(section) < 30:
            continue

        # Extract current section header if present
        header_match = re.match(r"^(#{1,3}\s+[^\n]+)", section)
        section_name = header_match.group(1).strip() if header_match else "General"

        # If section is small enough, store directly
        if len(section) <= 1200:
            chunk_id = f"{filename}_{chunk_idx}"
            chunks.append({
                "id": chunk_id,
                "text": f"Document: {title}\nSection: {section_name}\n\n{section}",
                "metadata": {
                    "filename": filename,
                    "title": title,
                    "type": doc_type,
                    "section": section_name,
                    "tags": tags
                }
            })
            chunk_idx += 1
        else:
            # Sub-chunk larger sections with 100-char overlap
            step = 900
            overlap = 150
            for start in range(0, len(section), step - overlap):
                sub_text = section[start:start + step].strip()
                if len(sub_text) < 40:
                    continue
                chunk_id = f"{filename}_{chunk_idx}"
                chunks.append({
                    "id": chunk_id,
                    "text": f"Document: {title}\nSection: {section_name} (Part {chunk_idx + 1})\n\n{sub_text}",
                    "metadata": {
                        "filename": filename,
                        "title": title,
                        "type": doc_type,
                        "section": section_name,
                        "tags": tags
                    }
                })
                chunk_idx += 1

    return chunks

def index_all_documents() -> Dict[str, Any]:
    """
    Scans data/runbooks/ and data/postmortems/, chunks documents,
    and indexes them into ChromaDB.
    """
    data_dir = Path(settings.DATA_DIRECTORY)
    runbooks_dir = data_dir / "runbooks"
    postmortems_dir = data_dir / "postmortems"

    all_chunks: List[Dict[str, Any]] = []
    files_processed = 0

    # Process Runbooks
    if runbooks_dir.exists():
        for f in runbooks_dir.glob("*.md"):
            content = f.read_text(encoding="utf-8")
            chunks = chunk_markdown(content, f.name, doc_type="runbook")
            all_chunks.extend(chunks)
            files_processed += 1

    # Process Postmortems
    if postmortems_dir.exists():
        for f in postmortems_dir.glob("*.md"):
            content = f.read_text(encoding="utf-8")
            chunks = chunk_markdown(content, f.name, doc_type="postmortem")
            all_chunks.extend(chunks)
            files_processed += 1

    if all_chunks:
        vector_store.add_chunks(all_chunks)

    stats = vector_store.get_stats()
    return {
        "files_indexed": files_processed,
        "chunks_indexed": len(all_chunks),
        "total_in_store": stats["total_chunks"],
        "runbooks_chunks": stats["runbooks_chunks"],
        "postmortems_chunks": stats["postmortems_chunks"]
    }
