import React, { useState, useEffect } from 'react';
import {
  Webhook,
  Copy,
  Check,
  Bell,
  Code,
  Radio,
  Clock,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { fetchRecentWebhooks } from '../services/api';
import { TriageReport } from './TriageReport';

export const WebhookHub: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

  const webhookUrl = `${window.location.origin}/api/incidents/webhook`;

  const curlExample = `curl -X POST "${webhookUrl}?source=custom" \\
  -H "Content-Type: application/json" \\
  -d '{
    "service": "checkout-api",
    "level": "critical",
    "error": "504 Gateway Timeout: connection pool exhausted (active: 98/100)",
    "timestamp": "${new Date().toISOString()}"
  }'`;

  useEffect(() => {
    fetchRecentWebhooks().then((list) => {
      setWebhooks(list);
      if (list.length > 0) setSelectedIncident(list[0]);
    });
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Banner */}
      <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-sky-950/30 p-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
            <Webhook className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Public Inbound Alert Webhook
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                User Method 2 &bull; Continuous Automation
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Integrate with <strong>Sentry</strong>, <strong>Datadog</strong>, <strong>BetterStack</strong>, <strong>Cloudflare</strong>, or custom alert scripts. Point incoming webhook alerts here to trigger automatic AI SRE triage.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Webhook URL & Curl snippet */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                Live Ingestion Endpoint
              </span>
              <button
                onClick={() => handleCopy(webhookUrl, 'url')}
                className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                {copied === 'url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied === 'url' ? 'Copied' : 'Copy Endpoint'}
              </button>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-sky-400 select-all overflow-x-auto">
              {webhookUrl}
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-sky-400" />
                  Quick Test via cURL
                </span>
                <button
                  onClick={() => handleCopy(curlExample, 'curl')}
                  className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  {copied === 'curl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied === 'curl' ? 'Copied' : 'Copy Command'}
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-[11px] overflow-x-auto leading-relaxed">
                {curlExample}
              </pre>
            </div>
          </div>
        </div>

        {/* Right: Inbound Feed */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-indigo-400" />
                Live Inbound Alerts Stream
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {webhooks.length} Received
              </span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-72">
              {webhooks.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs font-mono">
                  No webhook alerts received yet. Run the curl command above to test!
                </div>
              ) : (
                webhooks.map((wh) => (
                  <button
                    key={wh.id}
                    onClick={() => setSelectedIncident(wh)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs font-mono ${
                      selectedIncident?.id === wh.id
                        ? 'border-indigo-500/50 bg-indigo-950/20 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                      <span>[{wh.source}]</span>
                      <span>{new Date(wh.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="truncate text-[11px] text-slate-200">{wh.alert_text}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Webhook Incident Triage Report */}
      {selectedIncident?.triage_result && (
        <div className="mt-2">
          <div className="mb-2 text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
            Showing Triage Report for Webhook Alert: <strong>{selectedIncident.id}</strong>
          </div>
          <TriageReport result={selectedIncident.triage_result} />
        </div>
      )}
    </div>
  );
};
