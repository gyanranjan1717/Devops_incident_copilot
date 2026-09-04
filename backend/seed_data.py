"""
seed_data.py (Root Entrypoint)
------------------------------
Calls scripts/seed_data.py to ingest and index all runbooks and postmortems into ChromaDB.
Usage:
    python backend/seed_data.py
"""

from scripts.seed_data import main

if __name__ == "__main__":
    main()
