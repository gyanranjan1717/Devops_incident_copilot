"""
client.py
---------
Asynchronous MCP Diagnostic Client Orchestrator.
Dispatches queries in parallel to:
- Neon PostgreSQL (locks, slow queries, connection pool)
- Render Logs API (itsshowtime-backend)
- Vercel Telemetry API (movieticket)
"""

import asyncio
from typing import Dict, Any, List, Optional
from app.mcp.postgres_tool import postgres_tool
from app.mcp.render_logs_tool import render_logs_tool
from app.mcp.vercel_logs_tool import vercel_logs_tool

class MCPClientOrchestrator:
    async def collect_telemetry(
        self,
        enable_postgres: bool = True,
        enable_render: bool = True,
        enable_vercel: bool = True
    ) -> Dict[str, Any]:
        """Collects telemetry concurrently from enabled MCP diagnostic sources."""
        loop = asyncio.get_event_loop()
        source_names = []
        futures = []

        if enable_postgres:
            source_names.append("postgres")
            futures.append(loop.run_in_executor(None, postgres_tool.collect_all_telemetry))
        if enable_render:
            source_names.append("render")
            futures.append(loop.run_in_executor(None, render_logs_tool.fetch_recent_logs))
        if enable_vercel:
            source_names.append("vercel")
            futures.append(loop.run_in_executor(None, vercel_logs_tool.fetch_recent_deployments))

        results_list = await asyncio.gather(*futures, return_exceptions=True)
        results = {}
        for name, outcome in zip(source_names, results_list):
            if isinstance(outcome, Exception):
                results[name] = {"source": name, "connected": False, "error": str(outcome)}
            else:
                results[name] = outcome

        return {
            "timestamp": asyncio.get_event_loop().time(),
            "sources": results
        }

mcp_client = MCPClientOrchestrator()
