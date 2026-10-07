import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ModelSelector } from './components/ModelSelector';
import { IncidentInput } from './components/IncidentInput';
import { TelemetryPanel } from './components/TelemetryPanel';
import { TriageReport } from './components/TriageReport';
import { RunbookBrowser } from './components/RunbookBrowser';
import { AgentTerminal, ReasoningStep } from './components/AgentTerminal';
import { WebsiteInspector } from './components/WebsiteInspector';
import { ChaosSimulator } from './components/ChaosSimulator';
import { WebhookHub } from './components/WebhookHub';
import {
  IncidentPreset,
  TriageResult,
  LiveTelemetryResponse,
  ModelsStatus
} from './types';
import {
  fetchIncidentPresets,
  streamTriageIncident,
  fetchLiveTelemetry,
  fetchModelsStatus,
  switchModel,
  fetchRunbooks
} from './services/api';
import {
  Terminal,
  Globe,
  Flame,
  Webhook,
  BookOpen
} from 'lucide-react';

export const App: React.FC = () => {
  const [modelsStatus, setModelsStatus] = useState<ModelsStatus | null>(null);
  const [telemetry, setTelemetry] = useState<LiveTelemetryResponse | null>(null);
  const [presets, setPresets] = useState<IncidentPreset[]>([]);
  const [totalChunks, setTotalChunks] = useState<number>(89);

  // Form State
  const [alertText, setAlertText] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-flash-latest');
  const [enablePostgres, setEnablePostgres] = useState<boolean>(true);
  const [enableRender, setEnableRender] = useState<boolean>(true);
  const [enableVercel, setEnableVercel] = useState<boolean>(true);

  // UI state
  const [activeView, setActiveView] = useState<'triage' | 'website' | 'webhook' | 'chaos' | 'knowledge'>('triage');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTelemetryLoading, setIsTelemetryLoading] = useState<boolean>(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Agent Streaming State
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);

  // Initial Data Fetch
  useEffect(() => {
    const initApp = async () => {
      try {
        const [models, pre, tel, rb] = await Promise.all([
          fetchModelsStatus().catch(() => null),
          fetchIncidentPresets().catch(() => []),
          fetchLiveTelemetry().catch(() => null),
          fetchRunbooks().catch(() => null),
        ]);

        if (models) {
          setModelsStatus(models);
          setSelectedProvider(models.current_provider || 'gemini');
          setSelectedModel(models.current_model || 'gemini-flash-latest');
        }
        if (pre) setPresets(pre);
        if (tel) setTelemetry(tel);
        if (rb?.vector_store_stats?.total_chunks) {
          setTotalChunks(rb.vector_store_stats.total_chunks);
        }

        // Set default preset into textarea for immediate convenience
        if (pre && pre.length > 0) {
          setAlertText(pre[0].payload);
        }
      } catch (err) {
        console.error('App init error:', err);
      }
    };
    initApp();
  }, []);

  const handleRefreshTelemetry = async () => {
    setIsTelemetryLoading(true);
    try {
      const tel = await fetchLiveTelemetry({
        postgres: enablePostgres,
        render: enableRender,
        vercel: enableVercel,
      });
      setTelemetry(tel);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTelemetryLoading(false);
    }
  };

  const handleProviderChange = async (provider: string) => {
    setSelectedProvider(provider);
    const newModel = provider === 'gemini' ? 'gemini-flash-latest' : 'llama3.1';
    setSelectedModel(newModel);
    try {
      await switchModel(provider, newModel);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    try {
      await switchModel(selectedProvider, model);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSelectPreset = (p: IncidentPreset) => {
    setAlertText(p.payload);
  };

  const handleTriageSubmit = async () => {
    if (!alertText.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    setReasoningSteps([]);
    setTriageResult(null);

    await streamTriageIncident(
      {
        alert_payload: alertText,
        provider: selectedProvider,
        model_name: selectedModel,
        enable_postgres: enablePostgres,
        enable_render: enableRender,
        enable_vercel: enableVercel,
      },
      (step) => {
        setReasoningSteps((prev) => [...prev, step]);
      },
      (result) => {
        setTriageResult(result);
        if (result.live_telemetry) {
          setTelemetry(result.live_telemetry);
        }
        setIsLoading(false);
      },
      (err) => {
        setErrorMsg(err || 'Incident triage streaming failed');
        setIsLoading(false);
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans">
      <Header
        modelsStatus={modelsStatus}
        telemetry={telemetry}
        totalChunks={totalChunks}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2 gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveView('triage')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeView === 'triage'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              Live Incident Triage
            </button>

            <button
              onClick={() => setActiveView('website')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeView === 'website'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              Diagnose My Website
            </button>

            <button
              onClick={() => setActiveView('webhook')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeView === 'webhook'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Webhook className="w-3.5 h-3.5 text-indigo-400" />
              Inbound Webhook
            </button>

            <button
              onClick={() => setActiveView('chaos')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeView === 'chaos'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              Chaos Sandbox
            </button>

            <button
              onClick={() => setActiveView('knowledge')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeView === 'knowledge'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              Knowledge Base ({totalChunks})
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        {/* View 1: Main Triage Dashboard with Streaming Terminal */}
        {activeView === 'triage' && (
          <div className="flex flex-col gap-6">
            <ModelSelector
              status={modelsStatus}
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              onProviderChange={handleProviderChange}
              onModelChange={handleModelChange}
              enablePostgres={enablePostgres}
              enableRender={enableRender}
              enableVercel={enableVercel}
              onTogglePostgres={setEnablePostgres}
              onToggleRender={setEnableRender}
              onToggleVercel={setEnableVercel}
            />

            {/* Split Screen: Input on left / Telemetry on right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 flex flex-col gap-4">
                <IncidentInput
                  alertText={alertText}
                  onChangeAlertText={setAlertText}
                  presets={presets}
                  onSelectPreset={handleSelectPreset}
                  onSubmit={handleTriageSubmit}
                  isLoading={isLoading}
                />
              </div>

              <div className="lg:col-span-5 flex flex-col gap-4">
                <TelemetryPanel
                  telemetry={telemetry}
                  isLoading={isTelemetryLoading}
                  onRefresh={handleRefreshTelemetry}
                />
              </div>
            </div>

            {/* Live Streaming Agent Reasoning Terminal (SSE) */}
            <AgentTerminal steps={reasoningSteps} isActive={isLoading} />

            {/* SRE Triage Report Output */}
            {triageResult && (
              <div className="mt-2">
                <TriageReport
                  result={triageResult}
                  onPostmortemAdded={(newTotal) => setTotalChunks(newTotal)}
                />
              </div>
            )}
          </div>
        )}

        {/* View 2: User Method 1 - Website & API Prober */}
        {activeView === 'website' && (
          <div>
            <WebsiteInspector />
          </div>
        )}

        {/* View 3: User Method 2 - Inbound Webhook Automation */}
        {activeView === 'webhook' && (
          <div>
            <WebhookHub />
          </div>
        )}

        {/* View 4: Chaos Engineering Simulator */}
        {activeView === 'chaos' && (
          <div>
            <ChaosSimulator />
          </div>
        )}

        {/* View 5: Knowledge Base Browser */}
        {activeView === 'knowledge' && (
          <div>
            <RunbookBrowser />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 py-4 text-center text-xs font-mono text-slate-500">
        DevOps Incident Copilot &bull; Autonomous RAG + MCP Architecture &bull; Powered by Google Gemini, Neon PostgreSQL, Render &amp; Vercel
      </footer>
    </div>
  );
};
