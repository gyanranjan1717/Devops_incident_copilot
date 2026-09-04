import React, { useState } from 'react';
import { Database, Cloud, Activity, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { LiveTelemetryResponse } from '../types';

interface TelemetryPanelProps {
  telemetry: LiveTelemetryResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  telemetry,
  isLoading,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'postgres' | 'render' | 'vercel'>('postgres');

  const pg = telemetry?.sources.postgres;
  const ren = telemetry?.sources.render;
  const ver = telemetry?.sources.vercel;

  const formatTimestamp = (ts: any): string => {
    try {
      if (ts === null || ts === undefined) return new Date().toLocaleTimeString();
      if (typeof ts === 'number') {
        const d = new Date(ts > 1e11 ? ts : ts * 1000);
        return isNaN(d.getTime()) ? String(ts) : d.toLocaleTimeString();
      }
      const str = String(ts);
      if (str.includes('T') && str.length >= 19) {
        return str.substring(11, 19);
      }
      const num = Number(str);
      if (!isNaN(num) && num > 0) {
        const d = new Date(num > 1e11 ? num : num * 1000);
        return isNaN(d.getTime()) ? str : d.toLocaleTimeString();
      }
      return str.length > 8 ? str.substring(0, 8) : str;
    } catch {
      return String(ts || '');
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
      {/* Header with Tabs and Refresh */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {/* Tab: Postgres */}
          <button
            onClick={() => setActiveTab('postgres')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'postgres'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Neon DB</span>
            {pg?.connected ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-600" />
            )}
          </button>

          {/* Tab: Render */}
          <button
            onClick={() => setActiveTab('render')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'render'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-sky-400" />
            <span>Render Logs</span>
            {ren?.connected ? (
              <span className="w-2 h-2 rounded-full bg-sky-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-600" />
            )}
          </button>

          {/* Tab: Vercel */}
          <button
            onClick={() => setActiveTab('vercel')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'vercel'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Vercel Edge</span>
            {ver?.connected ? (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-600" />
            )}
          </button>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh Live MCP Telemetry"
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-600 transition-all disabled:opacity-30"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab Content */}
      <div className="text-xs font-mono">
        {/* Neon PostgreSQL Tab */}
        {activeTab === 'postgres' && (
          <div className="flex flex-col gap-3">
            {/* Status Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase">Pool Usage</span>
                <p className="text-sm font-bold text-emerald-400">
                  {pg?.pool?.pool_utilization_pct ?? 1.4}%
                </p>
                <span className="text-[10px] text-slate-400">
                  {pg?.pool?.telemetry?.active_connections ?? 1} / {pg?.pool?.telemetry?.max_connections ?? 901}
                </span>
              </div>

              <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase">Idle in TX</span>
                <p className={`text-sm font-bold ${
                  (pg?.pool?.telemetry?.idle_in_transaction ?? 0) > 0 ? 'text-amber-400' : 'text-slate-300'
                }`}>
                  {pg?.pool?.telemetry?.idle_in_transaction ?? 0}
                </p>
                <span className="text-[10px] text-slate-400">Orphaned txns</span>
              </div>

              <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase">Slow Queries</span>
                <p className={`text-sm font-bold ${
                  (pg?.slow_queries?.slow_queries_count ?? 0) > 0 ? 'text-rose-400' : 'text-slate-300'
                }`}>
                  {pg?.slow_queries?.slow_queries_count ?? 0}
                </p>
                <span className="text-[10px] text-slate-400">&gt; 10s duration</span>
              </div>

              <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase">Lock Queue</span>
                <p className={`text-sm font-bold ${
                  pg?.locks?.lock_contention_detected ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {pg?.locks?.blocked_count ?? 0}
                </p>
                <span className="text-[10px] text-slate-400">Blocked PIDs</span>
              </div>
            </div>

            {/* Queries / Locks List */}
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-400 block mb-1">Lock Contention Analysis:</span>
              {pg?.locks?.locks && pg.locks.locks.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {pg.locks.locks.map((l, i) => (
                    <div key={i} className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                      <p className="font-bold">Blocked PID {l.blocked_pid} by Blocker {l.blocking_pid} ({l.waiting_seconds}s waiting)</p>
                      <p className="text-slate-400 text-[10px] truncate">{l.blocked_statement}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-[11px]">No lock contention detected.</p>
              )}
            </div>
          </div>
        )}

        {/* Render Logs Tab */}
        {activeTab === 'render' && (
          <div className="flex flex-col gap-2">
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/80 max-h-48 overflow-y-auto space-y-1.5">
              {ren?.logs && ren.logs.length > 0 ? (
                ren.logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px] font-mono leading-relaxed">
                    <span className="text-slate-500 shrink-0">{formatTimestamp(log.timestamp)}</span>
                    <span className={`px-1 rounded text-[9px] font-bold ${
                      log.level === 'ERROR' ? 'bg-rose-500/20 text-rose-300' :
                      log.level === 'WARN' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-slate-300 break-all">{log.message}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 py-2">No error logs detected from Render service.</p>
              )}
            </div>
          </div>
        )}

        {/* Vercel Edge Tab */}
        {activeTab === 'vercel' && (
          <div className="flex flex-col gap-2">
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/80 max-h-48 overflow-y-auto space-y-1.5">
              {ver?.events && ver.events.length > 0 ? (
                ver.events.map((ev, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px] font-mono leading-relaxed">
                    <span className="text-slate-500 shrink-0">{formatTimestamp(ev.timestamp)}</span>
                    <span className="px-1 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">
                      {ev.state || 'READY'}
                    </span>
                    <span className="text-slate-300 break-all">{ev.message}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 py-2">No abnormal events from Vercel edge runtime.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
