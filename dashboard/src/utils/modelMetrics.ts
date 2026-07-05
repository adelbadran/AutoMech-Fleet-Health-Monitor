import {
  ModelConfusionMatrix,
  ModelPerformanceMetric,
  ModelRocPoint,
  ModelSummary,
} from '../types';

export const MODEL_KEYS = ['isolationForest', 'lstmAutoencoder', 'fuzzyFusion'] as const;
export type ModelKey = (typeof MODEL_KEYS)[number];

export interface ModelMetricsView {
  key: ModelKey;
  displayName: string;
  performanceMetrics: ModelPerformanceMetric[];
  confusionMatrix: ModelConfusionMatrix | null;
  rocCurve: ModelRocPoint[];
  bestThreshold: number | null;
  thresholdLabel: string;
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function buildModelMetricsView(
  summary: ModelSummary,
  modelKey: string,
): ModelMetricsView | null {
  const model = summary.models[modelKey];
  if (!model) return null;

  const metrics = model.metrics as Record<string, unknown>;
  const accuracy = asNumber(metrics.accuracy);
  const precisionAnomaly = asNumber(metrics.precisionAnomaly);
  const recallAnomaly = asNumber(metrics.recallAnomaly);
  const f1Anomaly = asNumber(metrics.f1Anomaly);
  const rocAuc = asNumber(metrics.rocAuc);
  const confusionMatrix = metrics.confusionMatrix as ModelConfusionMatrix | undefined;

  const performanceMetrics: ModelPerformanceMetric[] = [];
  if (accuracy != null) {
    performanceMetrics.push({ label: 'Accuracy', value: pct(accuracy), sub: 'Test set' });
  }
  if (precisionAnomaly != null) {
    performanceMetrics.push({ label: 'Precision', value: pct(precisionAnomaly), sub: 'Anomaly class' });
  }
  if (recallAnomaly != null) {
    performanceMetrics.push({ label: 'Recall', value: pct(recallAnomaly), sub: 'Sensitivity' });
  }
  if (f1Anomaly != null) {
    performanceMetrics.push({ label: 'F1 Score', value: pct(f1Anomaly), sub: 'Anomaly harmonic mean' });
  }
  if (rocAuc != null) {
    performanceMetrics.push({ label: 'ROC AUC', value: rocAuc.toFixed(3), sub: model.displayName });
  }

  const bestThreshold =
    asNumber(metrics.bestThreshold) ??
    asNumber(metrics.anomalyThreshold) ??
    (modelKey === 'fuzzyFusion' ? asNumber(summary.dashboard.bestThreshold) : null);

  let thresholdLabel = 'Not applicable';
  if (bestThreshold != null) {
    thresholdLabel =
      modelKey === 'isolationForest'
        ? `IF score: ${bestThreshold.toFixed(4)}`
        : `Threshold: ${bestThreshold.toFixed(4)}`;
  }

  return {
    key: modelKey as ModelKey,
    displayName: model.displayName,
    performanceMetrics,
    confusionMatrix: confusionMatrix ?? null,
    rocCurve: model.rocCurve ?? [],
    bestThreshold,
    thresholdLabel,
  };
}

export function getModelOptions(summary: ModelSummary) {
  return MODEL_KEYS.filter((key) => summary.models[key]).map((key) => ({
    value: key,
    label: summary.models[key].displayName,
  }));
}
