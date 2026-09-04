import {
  IncidentPreset,
  TriageResult,
  LiveTelemetryResponse,
  RunbookDocument,
  ModelsStatus
} from '../types';

const API_BASE = '/api';

export async function fetchIncidentPresets(): Promise<IncidentPreset[]> {
  const resp = await fetch(`${API_BASE}/incidents/presets`);
  if (!resp.ok) throw new Error('Failed to fetch presets');
  const data = await resp.json();
  return data.presets || [];
}

export async function triageIncident(params: {
  alert_payload: string;
  provider?: string;
  model_name?: string;
  enable_postgres?: boolean;
  enable_render?: boolean;
  enable_vercel?: boolean;
}): Promise<TriageResult> {
  const resp = await fetch(`${API_BASE}/incidents/triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || 'Incident triage request failed');
  }
  return resp.json();
}

export async function fetchLiveTelemetry(sources?: {
  postgres?: boolean;
  render?: boolean;
  vercel?: boolean;
}): Promise<LiveTelemetryResponse> {
  const params = new URLSearchParams();
  if (sources?.postgres !== undefined) params.set('postgres', String(sources.postgres));
  if (sources?.render !== undefined) params.set('render', String(sources.render));
  if (sources?.vercel !== undefined) params.set('vercel', String(sources.vercel));

  const resp = await fetch(`${API_BASE}/incidents/telemetry?${params.toString()}`);
  if (!resp.ok) throw new Error('Failed to fetch live telemetry');
  return resp.json();
}

export async function fetchRunbooks(docType?: string): Promise<{
  documents: RunbookDocument[];
  vector_store_stats: any;
}> {
  const url = docType ? `${API_BASE}/runbooks?doc_type=${docType}` : `${API_BASE}/runbooks`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to fetch runbooks');
  return resp.json();
}

export async function fetchRunbookDetail(filename: string): Promise<{
  filename: string;
  title: string;
  tags: string[];
  content: string;
}> {
  const resp = await fetch(`${API_BASE}/runbooks/${filename}`);
  if (!resp.ok) throw new Error('Failed to fetch document content');
  return resp.json();
}

export async function fetchModelsStatus(): Promise<ModelsStatus> {
  const resp = await fetch(`${API_BASE}/models/status`);
  if (!resp.ok) throw new Error('Failed to fetch models status');
  return resp.json();
}

export async function switchModel(provider: string, model_name?: string): Promise<any> {
  const resp = await fetch(`${API_BASE}/models/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, model_name }),
  });
  if (!resp.ok) throw new Error('Failed to switch model');
  return resp.json();
}

export async function triggerReindex(): Promise<any> {
  const resp = await fetch(`${API_BASE}/runbooks/reindex`, { method: 'POST' });
  if (!resp.ok) throw new Error('Failed to reindex knowledge base');
  return resp.json();
}
