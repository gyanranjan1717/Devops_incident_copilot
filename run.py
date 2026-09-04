"""
run.py
------
One-command launcher for both Backend (FastAPI) and Frontend (Vite).
Runs both processes concurrently in a single terminal session.
"""

import subprocess
import sys
import os
import signal
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

def main():
    print("=" * 60)
    print("  Starting DevOps Incident Copilot (Full Stack)")
    print("  - Backend:  http://127.0.0.1:8000")
    print("  - Frontend: http://localhost:5173")
    print("  Press Ctrl+C to stop both servers.")
    print("=" * 60)

    # 1. Start Backend
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"],
        cwd=str(BACKEND_DIR)
    )

    # 2. Start Frontend (Direct node invocation bypasses Windows npm subshell issue)
    vite_bin = FRONTEND_DIR / "node_modules" / "vite" / "bin" / "vite.js"
    if vite_bin.exists():
        frontend_proc = subprocess.Popen(
            ["node", str(vite_bin)],
            cwd=str(FRONTEND_DIR)
        )
    else:
        frontend_proc = subprocess.Popen(
            ["npx", "vite"],
            cwd=str(FRONTEND_DIR),
            shell=True
        )

    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        print("\nStopping servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        try:
            backend_proc.wait(timeout=5)
            frontend_proc.wait(timeout=5)
        except Exception:
            backend_proc.kill()
            frontend_proc.kill()
        print("Servers stopped.")

if __name__ == "__main__":
    main()
