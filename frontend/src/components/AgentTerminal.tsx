import React from 'react';
import { Terminal, Activity, CheckCircle2, Loader2 } from 'lucide-react';

export interface ReasoningStep {
  phase: string;
  step_num: number;
  message: string;
  timestamp?: string;
}

interface AgentTerminalProps {
  steps: ReasoningStep[];
  isActive: boolean;
}

export const AgentTerminal: React.FC<AgentTerminalProps> = ({ steps, isActive }) => {
  if (steps.length === 0 && !isActive) return null;

  return (
    <div className="rounded-xl border border-sky-500/30 bg-slate-950 shadow-2xl overflow-hidden font-mono text-xs">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 ml-2">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            Agent Chain-of-Thought Live Reasoning Stream (SSE)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? (
            <span className="flex items-center gap-1.5 text-[11px] text-sky-400 font-medium px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30">
              <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
              Agent Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Completed
            </span>
          )}
        </div>
      </div>

      {/* Terminal Output */}
      <div className="p-4 space-y-2 max-h-60 overflow-y-auto leading-relaxed select-text">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-2.5 text-slate-300">
            <span className="text-slate-500 select-none">
              [{step.timestamp || new Date().toLocaleTimeString()}]
            </span>
            <span className="text-sky-400 font-bold select-none">
              [Phase {step.step_num || idx + 1}]
            </span>
            <span className="text-slate-200">{step.message}</span>
          </div>
        ))}

        {isActive && (
          <div className="flex items-center gap-2 text-sky-400 pt-1 animate-pulse">
            <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span>
            <Activity className="w-3.5 h-3.5 animate-spin" />
            <span>Analyzing incident evidence and orchestrating MCP tools...</span>
          </div>
        )}
      </div>
    </div>
  );
};
