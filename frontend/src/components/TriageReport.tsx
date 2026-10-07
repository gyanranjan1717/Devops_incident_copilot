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
  Zap,
  Play,
  CheckCircle2,
  FileCheck,
  Loader2,
  Sparkles
} from 'lucide-react';
import { TriageResult } from '../types';
import { executeRemediationCommand, generatePostmortemReport } from '../services/api';

interface TriageReportProps {
  result: TriageResult;
  onPostmortemAdded?: (totalChunks: number) => void;
}

export const TriageReport: React.FC<TriageReportProps> = ({ result, onPostmortemAdded }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showSources, setShowSources] = useState(true);

  // Remediation Execution States
  const [executingIdx, setExecutingIdx] = useState<number | null>(null);
  const [executionOutputs, setExecutionOutputs] = useState<Record<number, string>>({});

  // Postmortem Generation State
  const [isGeneratingPostmortem, setIsGeneratingPostmortem] = useState(false);
  const [postmortemSuccess, setPostmortemSuccess] = useState<any | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExecuteRemediation = async (command: string, lang: string, index: number) => {
    setExecutingIdx(index);
    try {
      const res = await executeRemediationCommand({
        command,
        command_type: lang === 'sql' ? 'sql' : 'bash',
        dry_run: false,
      });
      setExecutionOutputs((prev) => ({
        ...prev,
        [index]: res.output || 'Execution complete with exit code 0.',
      }));
    } catch (err: any) {
      setExecutionOutputs((prev) => ({
        ...prev,
        [index]: `Execution Failed: ${err.message || 'Safety guardrail error'}`,
      }));
    } finally {
      setExecutingIdx(null);
    }
  };

  const handleCreatePostmortem = async () => {
    setIsGeneratingPostmortem(true);
    try {
      const data = await generatePostmortemReport({
        alert_payload: result.alert,
        triage_report: result.triage_report,
        remediation_notes: 'Remediation executed safely by SRE on-call engineer.',
      });
      setPostmortemSuccess(data);
      if (onPostmortemAdded && data.total_knowledge_base_chunks) {
        onPostmortemAdded(data.total_knowledge_base_chunks);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsGeneratingPostmortem(false);
    }
  };

  // Helper to parse markdown code blocks into copyable & executable blocks
  const renderFormattedReport = (markdown: string) => {
    const parts = markdown.split(/(```[\s\S]*?```)/g);

    return parts.map((part, idx) => {
      if (part.startsWith('```')) {
        const lines = part.split('\n');
        const lang = lines[0].replace('```', '').trim() || 'bash';
        const code = lines.slice(1, -1).join('\n');
        const hasExecuted = !!executionOutputs[idx];

        return (
          <div key={idx} className="my-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 font-mono text-xs">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 uppercase">
                {lang === 'sql' ? <FileCode className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5 text-sky-400" />}
                {lang} command
              </span>
              <div className="flex items-center gap-2">
                {/* 1-Click HITL Remediation Button */}
                <button
                  onClick={() => handleExecuteRemediation(code, lang, idx)}
                  disabled={executingIdx === idx}
                  className="flex items-center gap-1 text-[11px] text-emerald-300 hover:text-white px-2 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-800/80 border border-emerald-600/40 transition-colors cursor-pointer"
                >
                  {executingIdx === idx ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                      <span>Executing...</span>
                    </>
                  ) : hasExecuted ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Re-Run</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 text-emerald-400 fill-current" />
                      <span>Run Remediation</span>
                    </>
                  )}
                </button>

                {/* Copy Button */}
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
            </div>

            <pre className="p-3 text-slate-200 overflow-x-auto whitespace-pre leading-relaxed">
              <code>{code}</code>
            </pre>

            {/* Execution Audit Box */}
            {hasExecuted && (
              <div className="px-3 py-2 bg-emerald-950/30 border-t border-emerald-900/50 text-[11px] text-emerald-300 whitespace-pre font-mono">
                {executionOutputs[idx]}
              </div>
            )}
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
    <div className="flex flex-col gap-4 font-sans">
      {/* Top Banner with Timings */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white">SRE Triage Analysis Complete</span>
          <span className="text-slate-500 font-mono text-[11px]">
            ({result.provider_used} / {result.model_used})
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
          {timings.rag_search_ms !== undefined && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" />
              RAG: {timings.rag_search_ms}ms
            </span>
          )}
          {timings.telemetry_mcp_ms !== undefined && (
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              MCP: {timings.telemetry_mcp_ms}ms
            </span>
          )}
          {timings.llm_synthesis_ms !== undefined && (
            <span className="flex items-center gap-1">
              LLM: {timings.llm_synthesis_ms}ms
            </span>
          )}
        </div>
      </div>

      {/* Retrieved Sources Drawer */}
      {result.retrieved_sources && result.retrieved_sources.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
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

      {/* Auto-Postmortem & Continuous Learning Knowledge Flywheel Card */}
      <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-sky-950/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Knowledge Flywheel: Resolve &amp; Index Postmortem
          </h4>
          <p className="text-[11px] text-slate-400">
            Generate an official SRE Postmortem from this incident and dynamically index it into ChromaDB so the Copilot learns permanently.
          </p>
        </div>

        <button
          onClick={handleCreatePostmortem}
          disabled={isGeneratingPostmortem || !!postmortemSuccess}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-lg shadow-emerald-500/20"
        >
          {isGeneratingPostmortem ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating RCA &amp; Indexing...
            </>
          ) : postmortemSuccess ? (
            <>
              <Check className="w-4 h-4" />
              Indexed into ChromaDB!
            </>
          ) : (
            <>
              <FileCheck className="w-4 h-4" />
              Resolve &amp; Index Postmortem
            </>
          )}
        </button>
      </div>

      {postmortemSuccess && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
          ✓ Postmortem <strong>{postmortemSuccess.filename}</strong> created and chunked into {postmortemSuccess.chunks_added} vectors. Total Knowledge Base size is now <strong>{postmortemSuccess.total_knowledge_base_chunks} chunks</strong>!
        </div>
      )}
    </div>
  );
};
