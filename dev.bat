@echo off
echo ===================================================
echo Starting DevOps Incident Copilot (Backend + Frontend)
echo ===================================================

start "DevOps Backend (FastAPI)" cmd /k "cd backend && python -m uvicorn app.main:app --reload --port 8000"
start "DevOps Frontend (Vite)" cmd /k "cd frontend && node node_modules\vite\bin\vite.js"

echo.
echo Both Backend (http://127.0.0.1:8000) and Frontend (http://localhost:5173) are launching!
