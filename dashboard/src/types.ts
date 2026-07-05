export interface SensorData {
  id: string;
  name: string;
  value: number;
  unit: string;
  minNormal: number;
  maxNormal: number;
  subsystem: 'Engine' | 'Battery' | 'Brakes' | 'Suspension' | 'Oil system';
  status: 'normal' | 'warning' | 'danger';
  history: number[];
}

export interface SystemLog {
  id: string;
  timestamp: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  subsystem?: 'Engine' | 'Battery' | 'Brakes' | 'Suspension' | 'Oil system';
  iconName: string;
}

export interface AIPrediction {
  timestamp: string;
  isolationForestScore: number;
  lstmScore: number;
  fusionScore: number;
  isAnomaly: boolean;
  confidence: number;
  inferenceTimeMs: number;
}

export interface ModelAnomalyState {
  isAnomaly: boolean;
  fusionScore: number;
  confidence: number;
  reason: string | null;
  subsystem: 'Engine' | 'Battery' | 'Brakes' | 'Suspension' | 'Oil system' | null;
  topSensor: string | null;
}

export interface InferenceRow {
  rowIndex: number;
  timestamp: string;
  Engine_RPM: number;
  Vehicle_Speed: number;
  Coolant_Temp: number;
  Oil_Pressure: number;
  Vibration_Z: number;
  Engine_Load: number;
  Battery_Voltage: number;
  Throttle_Position: number;
  Brake_Pressure: number;
  Fuel_Rate: number;
  Intake_Air_Temp: number;
  Ambient_Temp: number;
  Acceleration_X: number;
  Acceleration_Y: number;
  isolationForestScore: number;
  lstmScore: number;
  fusionScore: number;
  isAnomaly: boolean;
  confidence: number;
  anomalySubsystem: string;
  anomalyReason: string;
  groundTruthAnomaly?: boolean;
}

export type DataMode = 'simulation' | 'upload';

export interface LiveRunStats {
  totalRows: number;
  processedRows: number;
  anomalyRows: number;
  latestIsolationForest: number;
  latestLstm: number;
  latestFusion: number;
  avgIsolationForest: number;
  avgLstm: number;
  avgFusion: number;
  groundTruthRows: number;
  matchCount: number;
}

export function createLiveRunStats(totalRows: number): LiveRunStats {
  return {
    totalRows,
    processedRows: 0,
    anomalyRows: 0,
    latestIsolationForest: 0,
    latestLstm: 0,
    latestFusion: 0,
    avgIsolationForest: 0,
    avgLstm: 0,
    avgFusion: 0,
    groundTruthRows: 0,
    matchCount: 0,
  };
}

export function accumulateLiveRunStats(
  stats: LiveRunStats,
  row: InferenceRow,
  isAnomaly: boolean,
): LiveRunStats {
  const n = stats.processedRows + 1;
  const hasGroundTruth = row.groundTruthAnomaly !== undefined;
  const predictedAnomaly = isAnomaly;
  const actualAnomaly = row.groundTruthAnomaly === true;

  return {
    ...stats,
    processedRows: n,
    anomalyRows: stats.anomalyRows + (isAnomaly ? 1 : 0),
    latestIsolationForest: row.isolationForestScore,
    latestLstm: row.lstmScore,
    latestFusion: row.fusionScore,
    avgIsolationForest: (stats.avgIsolationForest * stats.processedRows + row.isolationForestScore) / n,
    avgLstm: (stats.avgLstm * stats.processedRows + row.lstmScore) / n,
    avgFusion: (stats.avgFusion * stats.processedRows + row.fusionScore) / n,
    groundTruthRows: stats.groundTruthRows + (hasGroundTruth ? 1 : 0),
    matchCount:
      stats.matchCount + (hasGroundTruth && predictedAnomaly === actualAnomaly ? 1 : 0),
  };
}

export function rebuildLiveRunStats(
  rows: InferenceRow[],
  totalRows: number,
  threshold: number,
): LiveRunStats {
  let stats = createLiveRunStats(totalRows);
  for (const row of rows) {
    stats = accumulateLiveRunStats(stats, row, row.fusionScore >= threshold);
  }
  return stats;
}

export interface EDAHistogramBin {
  binStart: number;
  binEnd: number;
  count: number;
}

export interface EDADensityBin {
  binStart: number;
  binEnd: number;
  density: number;
}

export interface EDABoxPlotStats {
  min: number | null;
  q1: number | null;
  median: number | null;
  q3: number | null;
  max: number | null;
  whiskerLow: number | null;
  whiskerHigh: number | null;
}

export interface EDAKdePoint {
  x: number;
  y: number;
}

export interface EDAGroupStats {
  mean: number | null;
  median: number | null;
  std: number | null;
  min: number | null;
  max: number | null;
}

export interface EDASummary {
  title: string;
  subtitle: string;
  sourceNotebook: string;
  datasetPath: string;
  generatedAt: string;
  executiveSummary: {
    metrics: { metric: string; value: string | number | Record<string, unknown> }[];
    topNotes: string[];
  };
  dataDictionary: { feature: string; description: string; unit: string }[];
  datasetOverview: {
    head: Record<string, string | number | null>[];
    sample: Record<string, string | number | null>[];
    shape: { rows: number; columns: number };
    schema: { column: string; label: string; dtype: string; nonNull: number; nullCount: number }[];
    dtypesSummary: string;
    memoryUsageMb: number;
    columnNames: string[];
  };
  dataQualityReport: {
    missingValues: number;
    duplicateRows: number;
    duplicateTimestamp: number | null;
    constantColumns: string[];
    nearConstantColumns: string[];
    infiniteValues: number;
    memoryUsageMb: number;
    note: string;
  };
  missingValues: { column: string; label: string; count: number }[];
  duplicateAnalysis: {
    duplicateRows: number;
    duplicatedTimestamps: number | null;
  };
  targetDistribution: {
    normal: number;
    fault: number;
    faultRatePercent: number;
    note: string;
  };
  descriptiveStatistics: {
    column: string;
    label: string;
    mean: number | null;
    median: number | null;
    std: number | null;
    min: number | null;
    max: number | null;
    skewness: number | null;
    kurtosis: number | null;
  }[];
  histograms: {
    column: string;
    label: string;
    bins: EDAHistogramBin[];
    kde: EDAKdePoint[];
    boxPlot: EDABoxPlotStats | null;
  }[];
  outlierAnalysis: {
    column: string;
    label: string;
    outlierCount: number;
    outlierPercent: number;
    lowerBound: number | null;
    upperBound: number | null;
    q1: number | null;
    median: number | null;
    q3: number | null;
  }[];
  correlation: {
    columns: string[];
    labels: string[];
    matrix: number[][];
    topPositive: {
      feature1: string;
      feature2: string;
      label1: string;
      label2: string;
      correlation: number;
    }[];
    topNegative: {
      feature1: string;
      feature2: string;
      label1: string;
      label2: string;
      correlation: number;
    }[];
  };
  featureVsTarget: {
    sensors: {
      column: string;
      label: string;
      normal: EDAGroupStats;
      fault: EDAGroupStats;
      normalBox: EDABoxPlotStats | null;
      faultBox: EDABoxPlotStats | null;
      normalKde: EDAKdePoint[];
      faultKde: EDAKdePoint[];
    }[];
  };
  timeSeries: {
    sampleStep: number;
    sensors: string[];
    points: {
      timestamp: string;
      isFault: number;
      [key: string]: string | number | null;
    }[];
  };
  rollingStatistics: {
    windowSize: number;
    sampleStep: number;
    sensors: {
      column: string;
      label: string;
      points: { timestamp: string; rollingMean: number | null; rollingStd: number | null }[];
    }[];
  };
  distributionComparison: {
    sensors: {
      column: string;
      label: string;
      normalBins: EDADensityBin[];
      faultBins: EDADensityBin[];
    }[];
  };
  statisticalTests: {
    column: string;
    label: string;
    pValue: number | null;
    significant: boolean;
  }[];
  keyFindings: string[];
  exportCleanDataset: {
    cleanedDatasetFile: string;
    dashboardDatasetFile: string;
    cleanedDatasetColumns: string[];
    dashboardDatasetColumns: string[];
    rowCount: number;
    message: string;
  };
}

export interface MetricCardData {
  title: string;
  value: string | number;
  subtext: string;
  status: 'normal' | 'warning' | 'danger' | 'info' | 'success';
  icon: string;
}

export interface ModelPerformanceMetric {
  label: string;
  value: string;
  sub: string;
}

export interface ModelConfusionMatrix {
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface ModelRocPoint {
  fpr: number;
  tpr: number;
}

export interface ModelFeatureImportance {
  name: string;
  column: string;
  importance: number;
  pValue?: number;
}

export interface ModelSummary {
  title: string;
  subtitle: string;
  generatedAt: string;
  sourceNotebooks: string[];
  dashboard: {
    primaryModel: string;
    bestThreshold: number;
    performanceMetrics: ModelPerformanceMetric[];
    confusionMatrix: ModelConfusionMatrix;
    rocCurve: ModelRocPoint[];
    featureImportance: ModelFeatureImportance[];
  };
  trainingParams: Record<string, Record<string, unknown>>;
  models: Record<string, {
    displayName: string;
    sourceNotebook: string;
    metrics: Record<string, unknown>;
    rocCurve?: ModelRocPoint[];
  }>;
}

export interface SimulationState {
  sensors: Record<string, SensorData>;
  logs: SystemLog[];
  predictions: AIPrediction[];
  modelAnomaly: ModelAnomalyState;
  modelConfidence: number;
  modelHealthScore: number;
  threshold: number;
  simulationSpeed: 'realtime' | 'accelerated' | 'paused';
  dataMode: DataMode;
}
