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
  Sparkles
} from 'lucide-react';
import { fetchChaosScenarios, triggerChaosScenario } from '../services/api';
import { TriageReport } from './TriageReport';
import { TriageResult } from '../types';

export const ChaosSimulator: React.FC = () => {
  const [scenarios, setScenarios] = useState<Record<string, any>>({});
  const [activeScenarioKey, setActiveScenarioKey] = useState<string>('postgres_locks');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);

  useEffect(() => {
    fetchChaosScenarios()
      .then((data) => setScenarios(data))
      .catch((e) => console.error('Failed to load chaos scenarios', e));
  }, []);

  const handleTriggerChaos = async (scenarioKey: string) => {
    setActiveScenarioKey(scenarioKey);
    setIsLoading(true);
    setTriageResult(null);

    try {
      const res = await triggerChaosScenario(scenarioKey);
      setTriageResult(res.triage_result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getIconForCategory = (category: string) => {
    if (category.includes('Database')) return <Database className="w-4 h-4 text-emerald-400" />;
    if (category.includes('Resource')) return <Cpu className="w-4 h-4 text-rose-400" />;
    if (category.includes('Ingress')) return <Server className="w-4 h-4 text-amber-400" />;
    return <ShieldAlert className="w-4 h-4 text-sky-400" />;
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Intro Card */}
      <div className="rounded-xl border border-rose-500/20 bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/30 p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
            <Flame className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Chaos Engineering Sandbox
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                1-Click Production Failure Simulator
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Inject real-world distributed systems failures. Test how the Copilot correlates historical postmortems with live telemetry to synthesize root cause hypotheses and copyable remediation steps.
            </p>
          </div>
        </div>
      </div>

      {/* Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(scenarios).map(([key, item]) => {
          const isTriggering = isLoading && activeScenarioKey === key;
          return (
            <div
              key={key}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                activeScenarioKey === key
                  ? 'border-rose-500/50 bg-slate-900/90 shadow-lg shadow-rose-950/20'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                    {getIconForCategory(item.category)}
                    {item.category}
                  </span>
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

                <h3 className="text-sm font-bold text-white mb-1.5">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{item.description}</p>
              </div>

              <button
                onClick={() => handleTriggerChaos(key)}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-rose-500/20"
              >
                {isTriggering ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Simulating Failure &amp; Triaging...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Inject Failure &amp; Auto-Triage
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Triage Report Output */}
      {triageResult && (
        <div className="mt-2">
          <TriageReport result={triageResult} />
        </div>
      )}
    </div>
  );
};
