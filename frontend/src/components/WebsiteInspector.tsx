import React, { useState } from 'react';
import {
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Server,
  Zap,
  Loader2
} from 'lucide-react';
import { diagnoseUserWebsite } from '../services/api';
import { TriageReport } from './TriageReport';
import { TriageResult } from '../types';

export const WebsiteInspector: React.FC = () => {
  const [url, setUrl] = useState('');
  const [logs, setLogs] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [probeResult, setProbeResult] = useState<any>(null);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);

  const sampleSites = [
    { label: 'GitHub Status', url: 'https://www.githubstatus.com' },
    { label: 'OpenAI Status', url: 'https://status.openai.com' },
    { label: 'HTTP 502 Test', url: 'https://httpstat.us/502' },
    { label: 'HTTP 504 Test', url: 'https://httpstat.us/504' },
  ];

  const handleDiagnose = async (targetUrlOverride?: string) => {
    const targetUrl = targetUrlOverride || url;
    if (!targetUrl.trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    setProbeResult(null);
    setTriageResult(null);

    try {
      const data = await diagnoseUserWebsite({
        target_url: targetUrl,
        error_logs: logs,
        provider: 'gemini',
        model_name: 'gemini-1.5-pro'
      });
      setProbeResult(data.probe);
      setTriageResult(data.triage_result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to probe target website');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Intro Banner */}
      <div className="rounded-xl border border-sky-500/20 bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/30 p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30">
            <Globe className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Diagnose Any Website or API Live
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                User Method 1 &bull; Instant Edge Prober
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Input your own production domain or API endpoint. The Copilot executes an edge probe measuring HTTP status, TTFB latency, SSL certificate health, and headers, then synthesizes a tailored SRE diagnosis.
            </p>
          </div>
        </div>

        {/* Quick Sample Links */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
          <span className="text-slate-500 font-mono text-[11px]">Quick Samples:</span>
          {sampleSites.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setUrl(s.url);
                handleDiagnose(s.url);
              }}
              className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-sky-500/20 hover:text-sky-300 text-slate-300 border border-slate-700 text-[11px] transition-all"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-3">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              Target Website / API URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="https://your-website.com or https://api.mycompany.io/v1/health"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDiagnose()}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500 transition-colors"
              />
              <button
                onClick={() => handleDiagnose()}
                disabled={isLoading || !url.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-sky-500/20 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Probing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Run Diagnostic
                  </>
                )}
              </button>
            </div>

            <label className="text-xs font-semibold text-slate-300 mt-2 flex items-center justify-between">
              <span>Attach Error Logs or Stack Trace (Optional)</span>
              <span className="text-[10px] text-slate-500 font-mono">Enhances AI Root Cause precision</span>
            </label>
            <textarea
              rows={4}
              placeholder="Paste any 500 error, Node.js crash, or Docker log snippet here..."
              value={logs}
              onChange={(e) => setLogs(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-sky-500 transition-colors resize-none"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Right Column: Live Edge Probe Results Card */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  Live Edge Network Telemetry
                </span>
                {probeResult && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      probeResult.online && probeResult.status_code < 400
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    HTTP {probeResult.status_code || 'DOWN'}
                  </span>
                )}
              </div>

              {probeResult ? (
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      Response Latency (TTFB):
                    </span>
                    <span className="text-white font-bold">{probeResult.latency_ms} ms</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      SSL Certificate:
                    </span>
                    <span className="text-slate-200">
                      {probeResult.ssl_info?.valid
                        ? `Valid (${probeResult.ssl_info.days_remaining}d remaining)`
                        : probeResult.ssl_info?.error || 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 block font-semibold">Diagnostic Signal:</span>
                    <p
                      className={`text-[11px] leading-relaxed ${
                        probeResult.status_code >= 400 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {probeResult.diagnostic_summary}
                    </p>
                    {probeResult.error_detail && (
                      <p className="text-[10px] text-rose-400 mt-1">{probeResult.error_detail}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs font-mono">
                  Enter a URL on the left and click "Run Diagnostic" to view live edge metrics.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Correlated Triage Report */}
      {triageResult && (
        <div className="mt-2">
          <TriageReport result={triageResult} />
        </div>
      )}
    </div>
  );
};
