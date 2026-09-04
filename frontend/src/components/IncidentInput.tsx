import React from 'react';
import { AlertTriangle, Play, RefreshCw, Sparkles, Terminal } from 'lucide-react';
import { IncidentPreset } from '../types';

interface IncidentInputProps {
  alertText: string;
  onChangeAlertText: (text: string) => void;
  presets: IncidentPreset[];
  onSelectPreset: (preset: IncidentPreset) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const IncidentInput: React.FC<IncidentInputProps> = ({
  alertText,
  onChangeAlertText,
  presets,
  onSelectPreset,
  onSubmit,
  isLoading,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col gap-4">
      {/* Header & Presets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Live Incident Alert / Log Payload
          </label>
          <span className="text-xs text-slate-400 font-mono">
            {alertText.length} characters
          </span>
        </div>

        {/* 1-Click Presets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p)}
              disabled={isLoading}
              className="text-left p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 hover:border-slate-700 transition-all text-xs group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                  {p.category}
                </span>
                <span
                  className={`text-[10px] font-bold font-mono px-1 py-0.2 rounded ${
                    p.severity === 'P1'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {p.severity}
                </span>
              </div>
              <p className="font-medium text-slate-300 group-hover:text-sky-300 line-clamp-1">
                {p.title}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          rows={5}
          value={alertText}
          onChange={(e) => onChangeAlertText(e.target.value)}
          placeholder="Paste real production error log, stack trace, or incident symptoms here... (e.g. 504 Gateway Timeout spike on /api/v1/checkout, connection pool saturation, or container exit code 137)"
          className="w-full bg-slate-950/90 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChangeAlertText('')}
          disabled={isLoading || !alertText}
          className="text-xs text-slate-400 hover:text-slate-200 font-mono transition-colors disabled:opacity-30"
        >
          Clear Input
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || !alertText.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold font-mono shadow-lg shadow-sky-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>Orchestrating SRE Triage...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-sky-200" />
              <span>Diagnose Incident (RAG + MCP)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
