import { InferenceRow, EDASummary, ModelSummary } from './types';

const API_BASE = '';

export async function fetchEdaSummary(): Promise<EDASummary> {
  const res = await fetch(`${API_BASE}/api/eda`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to load EDA summary');
  }
  return res.json();
}

export async function fetchModelSummary(): Promise<ModelSummary> {
  const res = await fetch(`${API_BASE}/api/models`);
  const contentType = res.headers.get('content-type') ?? '';
  if (!res.ok) {
    const err = contentType.includes('application/json')
      ? await res.json().catch(() => ({ error: res.statusText }))
      : { error: `Model metrics API unavailable (${res.status}). Restart with npm run dev or npm start.` };
    throw new Error(err.error || 'Failed to load model summary');
  }
  if (!contentType.includes('application/json')) {
    throw new Error('Model metrics API unavailable. Start the Express server (npm run dev or npm start).');
  }
  return res.json();
}

export async function uploadTestFile(file: File): Promise<{
  sessionId: string;
  fileName: string;
  totalProcessedRows: number;
  anomalyRows: number;
  anomalyPercentage: number;
  bestThreshold: number;
}> {
  const formData = new FormData();
  formData.append('telemetryFile', file);
  const res = await fetch(`${API_BASE}/api/upload-test`, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.details || err.error || 'Upload failed');
  }
  return res.json();
}

export function connectTelemetryStream(
  sessionId: string,
  speed: 'realtime' | 'accelerated' | 'paused',
  handlers: {
    onSession?: (data: { total: number; bestThreshold: number; fileName: string }) => void;
    onRow?: (row: InferenceRow, index: number, total: number) => void;
    onComplete?: () => void;
    onError?: (message: string) => void;
  }
): EventSource {
  const es = new EventSource(`${API_BASE}/api/stream/${sessionId}?speed=${speed}`);

  es.addEventListener('session', (evt) => {
    const data = JSON.parse((evt as MessageEvent).data);
    handlers.onSession?.(data);
  });

  es.addEventListener('telemetry', (evt) => {
    const data = JSON.parse((evt as MessageEvent).data);
    handlers.onRow?.(data.row, data.index, data.total);
  });

  es.addEventListener('complete', () => {
    handlers.onComplete?.();
    es.close();
  });

  es.onerror = () => {
    handlers.onError?.('Stream connection lost');
    es.close();
  };

  return es;
}

export async function controlStream(
  sessionId: string,
  action: 'play' | 'pause' | 'reset',
  speed?: 'realtime' | 'accelerated' | 'paused'
): Promise<void> {
  await fetch(`${API_BASE}/api/stream/${sessionId}/control`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, speed }),
  });
}

export async function fetchHealth(): Promise<{
  ok: boolean;
  missingArtifacts: string[];
  hasEdaSummary?: boolean;
  hasModelSummary?: boolean;
  python?: string;
}> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('Health check failed');
  const data = await res.json();
  return {
    ok: data.ok ?? (data.missingArtifacts?.length === 0),
    missingArtifacts: data.missingArtifacts ?? [],
    hasEdaSummary: data.hasEdaSummary,
    hasModelSummary: data.hasModelSummary,
    python: data.python,
  };
}
