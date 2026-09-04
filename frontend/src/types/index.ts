export interface IncidentPreset {
  id: string;
  title: string;
  category: string;
  severity: string;
  payload: string;
}

export interface RetrievedSource {
  id: string;
  text: string;
  metadata: {
    filename?: string;
    title?: string;
    type?: string;
    section?: string;
    tags?: string | string[];
  };
  similarity_score: number;
}

export interface PostgresTelemetry {
  source: string;
  db_host: string;
  execution_time_ms: number;
  connected: boolean;
  pool: {
    connected: boolean;
    pool_utilization_pct: number;
    is_saturated: boolean;
    telemetry: {
      total_connections?: number;
      active_connections?: number;
      idle_connections?: number;
      idle_in_transaction?: number;
      max_connections?: number;
    };
    error?: string;
  };
  slow_queries: {
    connected: boolean;
    slow_queries_count: number;
    queries: Array<{
      pid: number;
      usename: string;
      duration_seconds: number;
      state: string;
      query_sample: string;
    }>;
  };
  locks: {
    connected: boolean;
    lock_contention_detected: boolean;
    blocked_count: number;
    locks: Array<{
      blocked_pid: number;
      blocked_user: string;
      blocking_pid: number;
      blocking_user: string;
      waiting_seconds: number;
      blocked_statement: string;
      blocking_statement: string;
    }>;
  };
}

export interface RenderTelemetry {
  source: string;
  service_id: string;
  service_url: string;
  connected: boolean;
  execution_time_ms: number;
  logs_count: number;
  service_info?: {
    service_name?: string;
    status?: string;
    updated_at?: string;
  };
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
}

export interface VercelTelemetry {
  source: string;
  project_id: string;
  project_name: string;
  connected: boolean;
  execution_time_ms: number;
  events_count: number;
  events: Array<{
    timestamp: string;
    level: string;
    state?: string;
    url?: string;
    message: string;
  }>;
}

export interface LiveTelemetryResponse {
  timestamp: number;
  sources: {
    postgres?: PostgresTelemetry;
    render?: RenderTelemetry;
    vercel?: VercelTelemetry;
  };
}

export interface TriageResult {
  status: string;
  alert: string;
  provider_used: string;
  model_used: string;
  triage_report: string;
  retrieved_sources: RetrievedSource[];
  live_telemetry: LiveTelemetryResponse;
  performance_timings: {
    rag_search_ms?: number;
    telemetry_mcp_ms?: number;
    llm_synthesis_ms?: number;
    total_execution_ms?: number;
  };
}

export interface RunbookDocument {
  filename: string;
  title: string;
  type: 'runbook' | 'postmortem';
  tags: string[];
  size_bytes: number;
}

export interface ModelsStatus {
  current_provider: string;
  current_model: string;
  providers: {
    gemini: {
      available: boolean;
      default_model: string;
      supported_models: string[];
    };
    ollama: {
      available: boolean;
      base_url: string;
      installed_models: string[];
      default_model: string;
    };
  };
}
