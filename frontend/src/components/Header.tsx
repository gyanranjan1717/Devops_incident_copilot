import React from 'react';
import { Terminal, ShieldAlert, Cpu, Database, Cloud } from 'lucide-react';
import { ModelsStatus, LiveTelemetryResponse } from '../types';

interface HeaderProps {
  modelsStatus: ModelsStatus | null;
  telemetry: LiveTelemetryResponse | null;
  totalChunks: number;
}

export const Header: React.FC<HeaderProps> = ({
  modelsStatus,
  telemetry,
  totalChunks
}) => {
  const pgConnected = telemetry?.sources.postgres?.connected ?? true;
  const renderConnected = telemetry?.sources.render?.connected ?? true;
  const vercelConnected = telemetry?.sources.vercel?.connected ?? true;

  return (
    <header className="border-b border-gray-800 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                DevOps Incident Copilot
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  RAG + MCP
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">Autonomous SRE Runbook Triage & Live Telemetry</p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-3">
          {/* Active Model Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/90 border border-slate-800 text-xs font-mono">
            <Cpu className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="text-slate-400">LLM:</span>
            <span className="text-sky-300 font-semibold">
              {modelsStatus?.current_model || 'gemini-flash-latest'}
            </span>
          </div>

          {/* RAG Knowledge Base Count */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/90 border border-slate-800 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-400">RAG SOPs:</span>
            <span className="text-emerald-300 font-semibold">{totalChunks || 89} chunks</span>
          </div>

          {/* MCP Telemetry Pills */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {/* Neon DB */}
            <div
              title="Neon PostgreSQL Connection"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] ${
                pgConnected
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              <Database className="w-3 h-3" />
              <span>Neon</span>
            </div>

            {/* Render */}
            <div
              title="Render Cloud Telemetry"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] ${
                renderConnected
                  ? 'bg-sky-500/10 border-sky-500/20 text-sky-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              <Cloud className="w-3 h-3" />
              <span>Render</span>
            </div>

            {/* Vercel */}
            <div
              title="Vercel Edge Telemetry"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] ${
                vercelConnected
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Vercel</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
