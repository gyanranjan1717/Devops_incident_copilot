"""
incidents.py
------------
Core API endpoints for incident triage, live telemetry inspection, and incident presets.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from app.agent.orchestrator import orchestrator
from app.mcp.client import mcp_client

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

class TriageRequest(BaseModel):
    alert_payload: str = Field(..., description="Alert message, error log, or symptom description")
    provider: Optional[str] = Field("gemini", description="LLM provider ('gemini' or 'ollama')")
    model_name: Optional[str] = Field("gemini-1.5-pro", description="Specific model name")
    enable_postgres: bool = Field(True, description="Query Neon PostgreSQL MCP tool")
    enable_render: bool = Field(True, description="Query Render Logs MCP tool")
    enable_vercel: bool = Field(True, description="Query Vercel Telemetry MCP tool")

SAMPLE_PRESETS = [
    {
        "id": "preset-504-timeout",
        "title": "504 Gateway Timeout on /api/v1/checkout",
        "category": "Ingress / Gateway Timeout",
        "severity": "P1",
        "payload": """[2026-09-02T04:12:00Z] [error] 142#142: *89402 upstream timed out (110: Connection timed out) while reading response header from upstream, client: 192.168.1.42, server: api.shop.com, request: "POST /api/v1/checkout HTTP/2.0", upstream: "http://10.0.4.12:8000/api/v1/checkout", host: "api.shop.com"
Spike in 504 status codes: 18.2% of all requests failing. Application workers queued at 98/100 connections. Users receiving checkout failure modal."""
    },
    {
        "id": "preset-postgres-locks",
        "title": "PostgreSQL Locks & Connection Pool Saturation",
        "category": "Database Contention",
        "severity": "P1",
        "payload": """sqlalchemy.exc.TimeoutError: QueuePool limit of size 20 overflow 10 reached, connection timed out, timeout 30.00 (Background worker holding AccessExclusiveLock on table 'users' during unindexed schema migration. 42 transactions blocked in state 'idle in transaction')."""
    },
    {
        "id": "preset-node-oom",
        "title": "Node.js Heap OOM Crash on Render Backend",
        "category": "Runtime / OOM Crash",
        "severity": "P2",
        "payload": """<--- Last few GCs --->
[38:0x7f9a2000]    42940 ms: Mark-sweep 2042.1 (2054.3) -> 2038.4 (2054.3) MB, 820.4 / 0.0 ms  (average mu = 0.124, current mu = 0.012) allocation failure scavenge might not succeed
<--- JS stacktrace --->
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
Render container exited with code 137 (SIGKILL) on service srv-da37p78jo6nc73dud950 (itsshowtime-backend)."""
    },
    {
        "id": "preset-cache-stampede",
        "title": "Redis Cache Eviction & Database Thundering Herd",
        "category": "Caching & Replica Saturation",
        "severity": "P1",
        "payload": """RedisClusterDownException: OOM command not allowed when used memory > 'maxmemory'. Key 'feature_flags:global' evicted. 35,000 concurrent requests bypassing cache directly to PostgreSQL replica. Database CPU spiked to 99.4%, response latency P99 degraded to 14,200ms."""
    }
]

@router.get("/presets")
def get_incident_presets():
    """Returns realistic curated incident presets for fast 1-click evaluation."""
    return {
        "presets": SAMPLE_PRESETS
    }

@router.post("/triage")
async def triage_incident(req: TriageRequest):
    """
    Full SRE Copilot Triage Flow:
    1. Knowledge Base Semantic Search
    2. Real-time MCP Telemetry (Neon DB, Render, Vercel)
    3. LLM Correlated Root Cause Analysis & Remediation
    """
    if not req.alert_payload.strip():
        raise HTTPException(status_code=400, detail="Alert payload cannot be empty")

    result = await orchestrator.triage_incident(
        alert_payload=req.alert_payload,
        provider=req.provider,
        model_name=req.model_name,
        enable_postgres=req.enable_postgres,
        enable_render=req.enable_render,
        enable_vercel=req.enable_vercel
    )
    return result

@router.get("/telemetry")
async def get_live_telemetry(
    postgres: bool = True,
    render: bool = True,
    vercel: bool = True
):
    """Fetches real-time diagnostics on demand from all active MCP tools."""
    telemetry = await mcp_client.collect_telemetry(
        enable_postgres=postgres,
        enable_render=render,
        enable_vercel=vercel
    )
    return telemetry
