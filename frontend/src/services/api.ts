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
  target_url?: string;
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

/**
 * Streams real-time Server-Sent Events (SSE) representing
 * the agent's step-by-step reasoning trace.
 */
export async function streamTriageIncident(
  params: {
    alert_payload: string;
    target_url?: string;
    provider?: string;
    model_name?: string;
    enable_postgres?: boolean;
    enable_render?: boolean;
    enable_vercel?: boolean;
  },
  onStep: (step: { phase: string; step_num: number; message: string }) => void,
  onComplete: (result: TriageResult) => void,
  onError: (error: string) => void
) {
  try {
    const response = await fetch(`${API_BASE}/incidents/triage-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Streaming triage request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('ReadableStream not supported');

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        if (!block.trim()) continue;
        const blockLines = block.split('\n');
        let eventType = '';
        let eventData = '';

        for (const line of blockLines) {
          if (line.startsWith('event: ')) {
            eventType = line.replace('event: ', '').trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.replace('data: ', '').trim();
          }
        }

        if (eventType === 'step' && eventData) {
          try {
            const parsed = JSON.parse(eventData);
            onStep(parsed);
          } catch (e) {
            console.warn('Error parsing step event:', e);
          }
        } else if (eventType === 'complete' && eventData) {
          try {
            const parsed = JSON.parse(eventData);
            onComplete(parsed);
          } catch (e) {
            console.warn('Error parsing complete event:', e);
          }
        }
      }
    }
  } catch (err: any) {
    onError(err.message || 'Stream connection failed');
  }
}

/**
 * User Method 1: Edge HTTP & SSL Probe for User Websites
 */
export async function diagnoseUserWebsite(params: {
  target_url: string;
  error_logs?: string;
  provider?: string;
  model_name?: string;
}): Promise<{
  target_url: string;
  probe: any;
  triage_result: TriageResult;
}> {
  const resp = await fetch(`${API_BASE}/incidents/diagnose-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || 'Website diagnostic failed');
  }
  return resp.json();
}

/**
 * Chaos Engineering Sandbox APIs
 */
export async function fetchChaosScenarios(): Promise<Record<string, any>> {
  const resp = await fetch(`${API_BASE}/incidents/chaos/scenarios`);
  if (!resp.ok) throw new Error('Failed to fetch chaos scenarios');
  const data = await resp.json();
  return data.scenarios || {};
}

export async function triggerChaosScenario(scenarioKey: string): Promise<any> {
  const resp = await fetch(`${API_BASE}/incidents/chaos/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario: scenarioKey }),
  });
  if (!resp.ok) throw new Error('Failed to trigger chaos scenario');
  return resp.json();
}

/**
 * Human-in-the-Loop Remediation Executor
 */
export async function executeRemediationCommand(params: {
  command: string;
  command_type: string;
  dry_run?: boolean;
}): Promise<any> {
  const resp = await fetch(`${API_BASE}/incidents/remediation/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || 'Remediation execution rejected');
  }
  return resp.json();
}

/**
 * Auto-Postmortem Generator & Vector Store Learning Flywheel
 */
export async function generatePostmortemReport(params: {
  alert_payload: string;
  triage_report: string;
  remediation_notes?: string;
}): Promise<any> {
  const resp = await fetch(`${API_BASE}/incidents/postmortem/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || 'Postmortem generation failed');
  }
  return resp.json();
}

/**
 * Inbound Webhooks Feed
 */
export async function fetchRecentWebhooks(): Promise<any[]> {
  const resp = await fetch(`${API_BASE}/incidents/webhooks/recent`);
  if (!resp.ok) throw new Error('Failed to fetch webhooks');
  const data = await resp.json();
  return data.webhooks || [];
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
