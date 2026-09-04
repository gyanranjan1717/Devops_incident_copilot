"""
vector_store.py
---------------
Manages persistent ChromaDB vector storage and semantic retrieval
for DevOps runbooks and historical incident postmortems.
"""

import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings
from app.rag.embeddings import get_embedding_function

class VectorStoreManager:
    def __init__(self):
        persist_dir = Path(settings.CHROMA_PERSIST_DIRECTORY)
        persist_dir.mkdir(parents=True, exist_ok=True)
        
        self.client = chromadb.PersistentClient(
            path=str(persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        self.embedding_fn = get_embedding_function()
        self.collection = self.client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION_NAME,
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"}
        )

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        """
        Ingests a list of document chunks into ChromaDB.
        Each chunk dict must contain:
        - id: unique string id
        - text: content to embed and store
        - metadata: dict with filename, title, type, tags, section
        """
        if not chunks:
            return

        ids = [c["id"] for c in chunks]
        documents = [c["text"] for c in chunks]
        metadatas = [c.get("metadata", {}) for c in chunks]

        # ChromaDB requires all metadata values to be str, int, float, or bool
        sanitized_metadatas = []
        for m in metadatas:
            clean_m = {}
            for k, v in m.items():
                if isinstance(v, (str, int, float, bool)):
                    clean_m[k] = v
                elif isinstance(v, (list, tuple)):
                    clean_m[k] = ", ".join(str(item) for item in v)
                else:
                    clean_m[k] = str(v)
            sanitized_metadatas.append(clean_m)

        self.collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=sanitized_metadatas
        )

    def search(
        self,
        query: str,
        n_results: int = 4,
        doc_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Performs semantic vector search against the knowledge base.
        Returns matched chunks with cosine similarity score (0.0 to 1.0).
        """
        where_clause = None
        if doc_type:
            where_clause = {"type": doc_type}

        total_docs = self.collection.count()
        if total_docs == 0:
            return []

        actual_n = min(n_results, total_docs)

        results = self.collection.query(
            query_texts=[query],
            n_results=actual_n,
            where=where_clause
        )

        matched_items: List[Dict[str, Any]] = []
        if not results or not results["ids"] or not results["ids"][0]:
            return matched_items

        ids = results["ids"][0]
        docs = results["documents"][0]
        metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(ids)
        distances = results["distances"][0] if results.get("distances") else [0.5] * len(ids)

        for doc_id, doc_text, meta, dist in zip(ids, docs, metas, distances):
            # For cosine distance, similarity is roughly 1.0 - (dist / 2.0) or 1.0 - dist
            # Bound similarity between 0.00 and 1.00
            similarity = max(0.0, min(1.0, 1.0 - float(dist)))
            matched_items.append({
                "id": doc_id,
                "text": doc_text,
                "metadata": meta,
                "similarity_score": round(similarity, 4)
            })

        # Sort by similarity descending
        matched_items.sort(key=lambda x: x["similarity_score"], reverse=True)
        return matched_items

    def get_stats(self) -> Dict[str, Any]:
        """Returns statistics of the indexed documents."""
        count = self.collection.count()
        all_meta = self.collection.get(include=["metadatas"])["metadatas"]
        
        runbooks_count = sum(1 for m in all_meta if m and m.get("type") == "runbook")
        postmortems_count = sum(1 for m in all_meta if m and m.get("type") == "postmortem")

        return {
            "total_chunks": count,
            "runbooks_chunks": runbooks_count,
            "postmortems_chunks": postmortems_count,
            "collection_name": settings.CHROMA_COLLECTION_NAME
        }

    def reset_collection(self):
        """Clears all records from the collection."""
        self.client.delete_collection(settings.CHROMA_COLLECTION_NAME)
        self.collection = self.client.create_collection(
            name=settings.CHROMA_COLLECTION_NAME,
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"}
        )

# Global singleton
vector_store = VectorStoreManager()
