"""
seed_data.py
------------
Indexes all SOP runbooks and RCA postmortems into ChromaDB vector database.
Can be executed standalone via:
    python backend/scripts/seed_data.py
"""

import sys
from pathlib import Path

# Add backend directory to sys.path so app modules are resolvable
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.rag.indexer import index_all_documents
from app.rag.vector_store import vector_store

def main():
    print("=" * 65)
    print("DevOps Incident Copilot: Vector Store Seeding & Ingestion")
    print("=" * 65)
    print(f"ChromaDB storage location: {vector_store.client._system.settings.require('persist_directory')}")
    print("Resetting and indexing runbooks and postmortems...")
    
    vector_store.reset_collection()
    result = index_all_documents()
    print("\nIndexing Completed Successfully!")
    print(f"- Files Processed: {result['files_indexed']}")
    print(f"- Chunks Created: {result['chunks_indexed']}")
    print(f"- Total Chunks in ChromaDB: {result['total_in_store']}")
    print(f"  * Runbook chunks: {result['runbooks_chunks']}")
    print(f"  * Postmortem chunks: {result['postmortems_chunks']}")

    # Validation test query
    print("\nRunning Verification Semantic Query: '504 gateway timeout database connection lock'...")
    search_results = vector_store.search("504 gateway timeout database connection lock", n_results=3)
    for i, res in enumerate(search_results, 1):
        print(f"\n[Result {i}] Score: {res['similarity_score']:.4f} | Source: {res['metadata'].get('filename')} | Section: {res['metadata'].get('section')}")
        preview = res['text'].replace('\n', ' ')[:140]
        print(f"  Preview: {preview}...")
    
    print("\n" + "=" * 65)
    print("Knowledge base is primed and ready for Incident Copilot triage!")
    print("=" * 65)

if __name__ == "__main__":
    main()
