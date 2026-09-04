# ⚡ DevOps Incident Copilot (RAG + MCP)

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB.svg?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2D8.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![ChromaDB](https://img.shields.io/badge/Vector_DB-ChromaDB-FF6F00.svg?style=flat)](https://www.trychroma.com/)
[![Model Context Protocol](https://img.shields.io/badge/Protocol-MCP_(Model_Context_Protocol)-8A2BE2.svg?style=flat)](https://modelcontextprotocol.io/)
[![Google Gemini](https://img.shields.io/badge/LLM-Google_Gemini_&_Ollama-4285F4.svg?style=flat&logo=google)](https://ai.google.dev/)

An enterprise-grade, autonomous **DevOps Runbook & Live Incident Copilot** designed for Site Reliability Engineers (SREs). It unifies **Retrieval-Augmented Generation (RAG)** over production postmortems with **Model Context Protocol (MCP)** live diagnostic tools across **Neon PostgreSQL**, **Render Logs**, and **Vercel Edge Telemetry**.

---

## 🎯 Key Features

- 🧠 **Header-Aware RAG Knowledge Base**: High-precision semantic chunking and cosine similarity search across 89+ curated SRE runbooks (SOPs) and authentic postmortems (PostHog, GitLab, Cloudflare, GitHub, Dan Luu).
- 🔌 **Live MCP Infrastructure Diagnostics**: Real-time read-only inspection of:
  - **Neon PostgreSQL**: Active transactions in `pg_stat_activity`, lock contention in `pg_locks`, and pooler saturation.
  - **Render API**: Live backend logs and deploy statuses.
  - **Vercel Edge API**: Deployment telemetry and edge runtime events.
- 🔀 **Multi-Model Orchestrator**: Dynamic runtime switching between **Google Gemini** (`gemini-flash-latest`, `gemini-1.5-pro`) and local offline **Ollama** (`llama3.1`, `qwen2.5-coder`).
- 🖥️ **SRE Operations Console**: Dark-mode React dashboard with 1-click incident presets, live infrastructure telemetry pills, and copyable remediation CLI/SQL command checklists.

---

## 🏛️ System Architecture

```
                        [ Operator Incident Alert / Error Logs ]
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │        Agent Orchestrator Loop               │
                    └───────┬──────────────────────────────┬───────┘
                            │                              │
                  Phase 1   │                    Phase 2   │
                            ▼                              ▼
               ┌────────────────────────┐    ┌───────────────────────────┐
               │ ChromaDB Vector Search │    │ MCP Live Diagnostics Tool │
               │ ────────────────────── │    │ ───────────────────────── │
               │ • 4 SOP Runbooks       │    │ • Neon PostgreSQL (Pool/  │
               │ • 8 Postmortems (RCA)  │    │   Locks/Long Queries)     │
               │ • PostHog / Dan Luu    │    │ • Render Logs API         │
               │ • Cosine similarity %  │    │ • Vercel Edge Telemetry   │
               └────────────┬───────────┘    └─────────────┬─────────────┘
                            │                              │
                            └──────────────┬───────────────┘
                                           │
                                 Phase 3   ▼
                             ┌───────────────────────────┐
                             │ Multi-Model SRE Synthesis │
                             │ ───────────────────────── │
                             │ • Google Gemini (Active)  │
                             │ • Local Ollama (Offline)  │
                             └─────────────┬─────────────┘
                                           │
                                           ▼
                             ┌─────────────────────────────┐
                             │ SRE Triage Report           │
                             │ • Severity Rating (P1/P2/P3)│
                             │ • Root Cause Hypothesis     │
                             │ • Copyable Fix Checklist    │
                             └─────────────────────────────┘
```

---

## 📁 Repository Structure

```
devops-incident-copilot/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entrypoint with CORS & lifespan
│   │   ├── config.py                # Pydantic Settings reading .env
│   │   ├── api/
│   │   │   ├── incidents.py         # Endpoints for triage, telemetry & presets
│   │   │   ├── runbooks.py          # CRUD & semantic search for runbooks/RCAs
│   │   │   └── models_config.py     # Model provider status and switcher
│   │   ├── rag/
│   │   │   ├── vector_store.py      # ChromaDB client & vector operations
│   │   │   ├── embeddings.py        # Gemini Embeddings + Resilient Fallback
│   │   │   └── indexer.py           # Header-aware markdown chunker
│   │   ├── mcp/
│   │   │   ├── client.py            # Async parallel MCP orchestrator
│   │   │   ├── postgres_tool.py     # Neon PostgreSQL live locks & pool metrics
│   │   │   ├── render_logs_tool.py  # Render API live logs fetcher
│   │   │   └── vercel_logs_tool.py  # Vercel API live deployments & edge events
│   │   └── agent/
│   │       ├── orchestrator.py      # Core SRE triage loop (Alert -> RAG -> MCP -> RCA)
│   │       ├── llm_factory.py       # Switchable Gemini vs. Local Ollama LLM provider
│   │       └── prompts.py           # SRE Incident Commander prompt templates
│   ├── data/
│   │   ├── runbooks/                # High-quality SOP markdown files
│   │   └── postmortems/             # Authentic postmortems from PostHog & Dan Luu
│   ├── scripts/
│   │   ├── fetch_real_datasets.py   # Download authentic postmortems
│   │   └── seed_data.py             # Script to populate vector store
│   ├── requirements.txt
│   └── seed_data.py                 # Root seed entrypoint
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx           # SRE top bar with live telemetry health pills
│   │   │   ├── ModelSelector.tsx    # Dropdown for Gemini vs. Ollama + MCP switches
│   │   │   ├── IncidentInput.tsx    # 1-click incident presets & log submission box
│   │   │   ├── TelemetryPanel.tsx   # Live Neon DB locks/queries & Render/Vercel logs
│   │   │   ├── TriageReport.tsx     # Formatted diagnosis with copyable CLI/SQL actions
│   │   │   └── RunbookBrowser.tsx   # View indexed SOPs & trigger reindexing
│   │   ├── App.tsx                  # Main SRE Incident Dashboard
│   │   ├── main.tsx
│   │   └── index.css                # Tailwind dark DevOps theme
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── run.py                           # 🚀 One-command full-stack launcher
├── dev.bat                          # Windows one-click startup batch script
├── docker-compose.yml               # Optional local PostgreSQL & Ollama
├── .env.example                     # Environment variables configuration template
└── README.md
```

---

## 🚀 Quickstart Guide

### Option 1: One-Command Launcher (Recommended)

From the project root:

```bash
# 1. Install backend dependencies
cd backend && pip install -r requirements.txt && cd ..

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Seed knowledge base (first time only)
python backend/seed_data.py

# 4. Launch Full Stack (Backend + Frontend)
python run.py
```

* **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
* **Backend API Docs (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### Option 2: Manual Start in Separate Terminals

#### Terminal 1 — Backend (FastAPI):
```bash
cd backend
python -m pip install -r requirements.txt
python seed_data.py
python -m uvicorn app.main:app --reload --port 8000
```

#### Terminal 2 — Frontend (Vite):
```bash
cd frontend
npm install
node node_modules/vite/bin/vite.js
```

---

## ⚙️ Environment Variables

Create a `backend/.env` file (refer to `.env.example`):

| Variable | Description | Default |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API key | Required for Gemini |
| `DEFAULT_LLM_PROVIDER` | `gemini` or `ollama` | `gemini` |
| `POSTGRES_DIAGNOSTIC_DB_URL` | Neon PostgreSQL connection string | Optional (live diagnostics) |
| `RENDER_API_KEY` | Render API Token | Optional (live diagnostics) |
| `RENDER_SERVICE_ID` | Render Web Service ID | Optional (live diagnostics) |
| `VERCEL_API_TOKEN` | Vercel API Access Token | Optional (live diagnostics) |
| `VERCEL_PROJECT_ID` | Vercel Project ID | Optional (live diagnostics) |
| `CHROMA_PERSIST_DIRECTORY` | ChromaDB storage folder | `./chroma_db` |

---

## 🧪 1-Click Incident Presets

Test the copilot immediately using built-in production scenario presets:

1. **DB Connection Pool Saturation**: Simulates database connection pool exhaustion and elevated client queue latencies.
2. **PostgreSQL Lock Contention**: Simulates row/table exclusive locks blocking transactions on high-throughput services.
3. **Render 504 Gateway Timeout**: Simulates downstream HTTP 504 gateway timeouts and upstream worker saturation.
4. **Kafka Consumer Lag & Rebalance**: Simulates slow consumer threads exceeding `max.poll.interval.ms` and triggering cascading rebalance storms.

---

## 🛡️ License

Distributed under the MIT License. Built with ❤️ for Site Reliability Engineers.
