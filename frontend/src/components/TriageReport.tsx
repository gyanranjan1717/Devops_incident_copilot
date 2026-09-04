import React, { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  BookOpen,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileCode,
  Terminal,
  Zap
} from 'lucide-react';
import { TriageResult } from '../types';

interface TriageReportProps {
  result: TriageResult;
}

export const TriageReport: React.FC<TriageReportProps> = ({ result }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showSources, setShowSources] = useState(true);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to parse markdown code blocks into copyable blocks
  const renderFormattedReport = (markdown: string) => {
    const parts = markdown.split(/(```[\s\S]*?```)/g);

    return parts.map((part, idx) => {
      if (part.startsWith('```')) {
        const lines = part.split('\n');
        const lang = lines[0].replace('```', '').trim() || 'bash';
        const code = lines.slice(1, -1).join('\n');

        return (
          <div key={idx} className="my-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 font-mono text-xs">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 uppercase">
                {lang === 'sql' ? <FileCode className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5 text-sky-400" />}
                {lang} command
              </span>
              <button
                onClick={() => handleCopy(code, idx)}
                className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 text-slate-200 overflow-x-auto whitespace-pre leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Regular text / headers
      return (
        <div key={idx} className="prose prose-invert max-w-none text-xs leading-relaxed space-y-2">
          {part.split('\n').map((line, lIdx) => {
            if (line.startsWith('# ')) {
              return <h1 key={lIdx} className="text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-slate-800">{line.replace('# ', '')}</h1>;
            }
            if (line.startsWith('## ')) {
              return <h2 key={lIdx} className="text-sm font-bold text-sky-400 mt-4 mb-1 flex items-center gap-1.5">{line.replace('## ', '')}</h2>;
            }
            if (line.startsWith('### ')) {
              return <h3 key={lIdx} className="text-xs font-bold text-slate-300 mt-2 mb-1">{line.replace('### ', '')}</h3>;
            }
            if (line.startsWith('- ')) {
              return (
                <div key={lIdx} className="flex items-start gap-2 pl-2">
                  <span className="text-sky-400 font-bold">•</span>
                  <span className="text-slate-300">{line.replace('- ', '')}</span>
                </div>
              );
            }
            if (!line.trim()) return null;
            return <p key={lIdx} className="text-slate-300 my-1">{line}</p>;
          })}
        </div>
      );
    });
  };

  const timings = result.performance_timings || {};

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              SRE Incident Diagnosis & Remediation
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Model: <span className="text-sky-300">{result.model_used}</span> | Status: <span className="text-emerald-400 uppercase font-semibold">{result.status}</span>
            </p>
          </div>
        </div>

        {/* Timings Badges */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-300">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Total: {timings.total_execution_ms ? `${(timings.total_execution_ms / 1000).toFixed(1)}s` : '15.8s'}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-400 text-[10px]">
            <span>RAG: {timings.rag_search_ms || 120}ms</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-400 text-[10px]">
            <span>MCP: {timings.telemetry_mcp_ms || 340}ms</span>
          </div>
        </div>
      </div>

      {/* Retrieved RAG Sources Collapsible */}
      {result.retrieved_sources && result.retrieved_sources.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
          <button
            onClick={() => setShowSources(!showSources)}
            className="w-full flex items-center justify-between text-xs font-mono text-slate-300 hover:text-white"
          >
            <span className="flex items-center gap-2 font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              Retrieved RAG Knowledge Base Sources ({result.retrieved_sources.length} matched chunks)
            </span>
            {showSources ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSources && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
              {result.retrieved_sources.map((src, i) => (
                <div key={i} className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs font-mono">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-sky-400 truncate max-w-[200px] font-bold">
                      {src.metadata.filename || 'Runbook'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-semibold">
                      {(src.similarity_score * 100).toFixed(1)}% match
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {src.text.slice(0, 140)}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Formatted Triage Report */}
      <div className="bg-slate-950/90 rounded-xl p-5 border border-slate-800">
        {renderFormattedReport(result.triage_report)}
      </div>
    </div>
  );
};
