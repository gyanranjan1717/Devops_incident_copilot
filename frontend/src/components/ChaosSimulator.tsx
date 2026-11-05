import React, { useState, useEffect } from 'react';
import {
  Flame,
  Database,
  Server,
  Cpu,
  ShieldAlert,
  Play,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  FileCode,
  Terminal,
  Target,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { fetchChaosScenarios, triggerChaosScenario } from '../services/api';
import { TriageReport } from './TriageReport';
import { TriageResult } from '../types';

export const ChaosSimulator: React.FC = () => {
  const [scenarios, setScenarios] = useState<Record<string, any>>({});
  const [activeScenarioKey, setActiveScenarioKey] = useState<string>('postgres_locks');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [triageResults, setTriageResults] = useState<Record<string, TriageResult>>({});
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  useEffect(() => {
    fetchChaosScenarios()
      .then((data) => {
        setScenarios(data);
        const keys = Object.keys(data);
        if (keys.length > 0 && !data[activeScenarioKey]) {
          setActiveScenarioKey(keys[0]);
        }
      })
      .catch((e) => console.error('Failed to load chaos scenarios', e));
  }, []);

  const handleSelectScenario = (key: string) => {
    setActiveScenarioKey(key);
  };

  const handleTriggerChaos = async (scenarioKey: string) => {
    setIsLoading(true);
    try {
      const res = await triggerChaosScenario(scenarioKey);
      setTriageResults((prev) => ({
        ...prev,
        [scenarioKey]: res.triage_result,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const getIconForCategory = (category: string) => {
    if (category.includes('Database')) return <Database className="w-4 h-4 text-emerald-400" />;
    if (category.includes('Resource')) return <Cpu className="w-4 h-4 text-rose-400" />;
    if (category.includes('Ingress')) return <Server className="w-4 h-4 text-amber-400" />;
    return <ShieldAlert className="w-4 h-4 text-sky-400" />;
  };

  const currentScenario = scenarios[activeScenarioKey];
  const currentResult = triageResults[activeScenarioKey];

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Intro Header */}
      <div className="rounded-xl border border-rose-500/20 bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/30 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 shrink-0">
              <Flame className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Chaos Engineering Sandbox
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
                  Two-Step Problem & Resolution Inspector
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Step 1: Inspect the simulated production failure, error logs, and impact.
                Step 2: Trigger the AI Copilot to correlate telemetry with SOP runbooks and generate verified mitigation commands.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Selection Grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
            1. Select Incident Simulation Scenario:
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            {Object.keys(scenarios).length} Scenarios Available
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(scenarios).map(([key, item]) => {
            const isSelected = activeScenarioKey === key;
            const hasResult = !!triageResults[key];

            return (
              <div
                key={key}
                onClick={() => handleSelectScenario(key)}
                className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-sky-500 bg-slate-900/90 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/50'
                    : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                      {getIconForCategory(item.category)}
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {hasResult && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Resolved
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          item.severity === 'P1'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className={isSelected ? 'text-sky-400 font-semibold' : 'text-slate-500'}>
                    {isSelected ? '● Currently Inspecting' : 'Click to Inspect'}
                  </span>
                  <span className="text-slate-400 text-[10px]">View Details &rarr;</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Scenario Detailed Problem Card */}
      {currentScenario && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    currentScenario.severity === 'P1'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  SEVERITY: {currentScenario.severity}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Category: {currentScenario.category}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                {currentScenario.title}
              </h3>
            </div>

            {/* Action Trigger Button */}
            <button
              onClick={() => handleTriggerChaos(activeScenarioKey)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-sky-500/25 shrink-0 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Copilot Triaging Incident...</span>
                </>
              ) : currentResult ? (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Re-Run AI Copilot Triage</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Solve This Incident with AI Copilot</span>
                </>
              )}
            </button>
          </div>

          {/* Problem Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* What Happened */}
            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase font-bold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> What Happened (Root Problem)
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentScenario.problem_statement || currentScenario.description}
              </p>
            </div>

            {/* Production Impact */}
            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" /> Production & User Impact
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentScenario.impact || 'Service degradation affecting active user sessions and API latency.'}
              </p>
            </div>

            {/* Target Resolution Objective */}
            <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Target Resolution Goal
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentScenario.target_resolution || 'Correlate with SRE runbooks, identify blocker, and generate safe remediation commands.'}
              </p>
            </div>
          </div>

          {/* Injected Alert Log Payload (Terminal View) */}
          <div className="rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px] font-mono font-semibold text-slate-300">
                  Simulated Inbound Failure Payload &amp; Error Logs
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(currentScenario.payload)}
                className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {copiedPayload ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Payload</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 font-mono text-xs text-amber-300/90 whitespace-pre-wrap leading-relaxed overflow-x-auto bg-black/40">
              {currentScenario.payload}
            </pre>
          </div>

          {/* Call-to-Action Bar */}
          {!currentResult && !isLoading && (
            <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-sky-200">
              <span className="font-mono text-[11px]">
                👉 Review the error logs and impact above, then click the button to trigger AI Copilot resolution.
              </span>
              <button
                onClick={() => handleTriggerChaos(activeScenarioKey)}
                className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors shrink-0 shadow"
              >
                Launch AI Resolution &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Triage & Resolution Output */}
      {currentResult && (
        <div className="flex flex-col gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              2. AI Copilot Triage Findings &amp; Verified Remediation:
            </h3>
          </div>
          <TriageReport result={currentResult} />
        </div>
      )}
    </div>
  );
};
