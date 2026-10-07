"""
start.py
--------
Production entrypoint for Render and cloud hosting providers.
Dynamically resolves the $PORT environment variable without shell syntax issues.
"""

import os
import sys
import uvicorn

if __name__ == "__main__":
    port_env = os.environ.get("PORT", "10000")
    try:
        port = int(port_env)
    except ValueError:
        port = 10000

    host = os.environ.get("HOST", "0.0.0.0")
    print(f"[PRODUCTION STARTUP] Starting DevOps Incident Copilot on {host}:{port}...")
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        proxy_headers=True,
        forwarded_allow_ips="*"
    )
