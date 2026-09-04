import React from 'react';
import { Cpu, Server, Database, Cloud, Activity } from 'lucide-react';
import { ModelsStatus } from '../types';

interface ModelSelectorProps {
  status: ModelsStatus | null;
  selectedProvider: string;
  selectedModel: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  enablePostgres: boolean;
  enableRender: boolean;
  enableVercel: boolean;
  onTogglePostgres: (val: boolean) => void;
  onToggleRender: (val: boolean) => void;
  onToggleVercel: (val: boolean) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  status,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  enablePostgres,
  enableRender,
  enableVercel,
  onTogglePostgres,
  onToggleRender,
  onToggleVercel,
}) => {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-xl">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Model Provider Tabs */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Provider:
          </span>
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => onProviderChange('gemini')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedProvider === 'gemini'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Google Gemini
            </button>
            <button
              onClick={() => onProviderChange('ollama')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedProvider === 'ollama'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              Local Ollama
            </button>
          </div>

          {/* Model Dropdown */}
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {selectedProvider === 'gemini' ? (
              <>
                <option value="gemini-flash-latest">gemini-flash-latest (Recommended)</option>
                <option value="gemini-3.6-flash">gemini-3.6-flash</option>
                <option value="gemini-3.7-flash">gemini-3.7-flash</option>
              </>
            ) : (
              <>
                <option value="llama3.1">llama3.1 (Local)</option>
                <option value="qwen2.5-coder">qwen2.5-coder (Local)</option>
                <option value="mistral">mistral (Local)</option>
              </>
            )}
          </select>
        </div>

        {/* MCP Telemetry Checkbox Sources */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
            Live MCP Telemetry:
          </span>

          {/* Postgres */}
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
            <input
              type="checkbox"
              checked={enablePostgres}
              onChange={(e) => onTogglePostgres(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0 w-3.5 h-3.5"
            />
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Neon DB</span>
          </label>

          {/* Render */}
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
            <input
              type="checkbox"
              checked={enableRender}
              onChange={(e) => onToggleRender(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0 w-3.5 h-3.5"
            />
            <Cloud className="w-3.5 h-3.5 text-sky-400" />
            <span>Render Logs</span>
          </label>

          {/* Vercel */}
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white select-none">
            <input
              type="checkbox"
              checked={enableVercel}
              onChange={(e) => onToggleVercel(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0 w-3.5 h-3.5"
            />
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Vercel Edge</span>
          </label>
        </div>
      </div>
    </div>
  );
};
