import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ModelSelector } from './components/ModelSelector';
import { IncidentInput } from './components/IncidentInput';
import { TelemetryPanel } from './components/TelemetryPanel';
import { TriageReport } from './components/TriageReport';
import { RunbookBrowser } from './components/RunbookBrowser';
import {
  IncidentPreset,
  TriageResult,
  LiveTelemetryResponse,
  ModelsStatus
} from './types';
import {
  fetchIncidentPresets,
  triageIncident,
  fetchLiveTelemetry,
  fetchModelsStatus,
  switchModel,
  fetchRunbooks
} from './services/api';
import { Terminal, Shield, BookOpen, Layers } from 'lucide-react';

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
  const [activeView, setActiveView] = useState<'triage' | 'knowledge'>('triage');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTelemetryLoading, setIsTelemetryLoading] = useState<boolean>(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

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

    try {
      const result = await triageIncident({
        alert_payload: alertText,
        provider: selectedProvider,
        model_name: selectedModel,
        enable_postgres: enablePostgres,
        enable_render: enableRender,
        enable_vercel: enableVercel,
      });
      setTriageResult(result);
      if (result.live_telemetry) {
        setTelemetry(result.live_telemetry);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Incident triage failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans">
      <Header
        modelsStatus={modelsStatus}
        telemetry={telemetry}
        totalChunks={totalChunks}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('triage')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                activeView === 'triage'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Terminal className="w-4 h-4" />
              Live Incident Triage & Telemetry
            </button>
            <button
              onClick={() => setActiveView('knowledge')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                activeView === 'knowledge'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Runbook & Postmortem Knowledge Base ({totalChunks} Chunks)
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        {/* View 1: Triage Dashboard */}
        {activeView === 'triage' && (
          <div className="flex flex-col gap-6">
            {/* Model & Source Configuration Bar */}
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

            {/* SRE Triage Report Output */}
            {triageResult && (
              <div className="mt-2">
                <TriageReport result={triageResult} />
              </div>
            )}
          </div>
        )}

        {/* View 2: Knowledge Base Browser */}
        {activeView === 'knowledge' && (
          <div>
            <RunbookBrowser />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 py-4 text-center text-xs font-mono text-slate-500">
        DevOps Incident Copilot &bull; Autonomous RAG + MCP Architecture &bull; Powered by Google Gemini &amp; Neon PostgreSQL
      </footer>
    </div>
  );
};
