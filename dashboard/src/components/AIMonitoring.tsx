import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from 'recharts';
import CyberPanel from './CyberPanel';
import {
  Loader2,
  AlertCircle,
  ShieldAlert,
  Activity,
  Cpu,
  CheckCircle,
  Zap,
  LineChart as LineChartIcon,
  BarChart3,
  Target,
  SlidersHorizontal,
  Grid3x3,
  type LucideIcon,
} from 'lucide-react';
import { fetchModelSummary } from '../api';
import GlassSelect from './GlassSelect';
import { AIPrediction, MetricCardData, ModelSummary, SystemLog, LiveRunStats } from '../types';
import LiveModelPerformance from './LiveModelPerformance';
import {
  buildModelMetricsView,
  getModelOptions,
  type ModelKey,
} from '../utils/modelMetrics';

interface AIMonitoringProps {
  predictions: AIPrediction[];
  logs: SystemLog[];
  threshold: number;
  onThresholdChange: (val: number) => void;
  modelConfidence: number;
  modelHealthScore: number;
  liveRunStats?: LiveRunStats | null;
  streamComplete?: boolean;
  isRunning?: boolean;
}

export default function AIMonitoring({
  predictions,
  logs,
  threshold,
  onThresholdChange,
  modelConfidence,
  modelHealthScore,
  liveRunStats = null,
  isRunning = false,
}: AIMonitoringProps) {
  const [activeMetricTab, setActiveMetricTab] = useState<'fusion' | 'individual'>('fusion');
  const [modelSummary, setModelSummary] = useState<ModelSummary | null>(null);
  const [selectedModelKey, setSelectedModelKey] = useState<ModelKey>('fuzzyFusion');
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    fetchModelSummary()
      .then((data) => {
        if (!cancelled) {
          setModelSummary(data);
          setSelectedModelKey(
            (data.dashboard?.primaryModel as ModelKey) ?? 'fuzzyFusion',
          );
          setSummaryError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setSummaryError(err.message);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const latestPred = predictions[predictions.length - 1] || {
    isAnomaly: false,
    confidence: modelConfidence,
    inferenceTimeMs: 18.5,
    isolationForestScore: 0,
    lstmScore: 0,
    fusionScore: 0
  };

  const activeAlertsCount = logs.filter(l => l.severity === 'critical' || l.severity === 'warning').length;
  const dashboard = modelSummary?.dashboard;
  const modelView = modelSummary ? buildModelMetricsView(modelSummary, selectedModelKey) : null;
  const modelOptions = modelSummary ? getModelOptions(modelSummary) : [];
  const performanceMetrics = modelView?.performanceMetrics ?? [];
  const featureImportance = dashboard?.featureImportance ?? [];
  const rocCurveData = modelView?.rocCurve ?? [];
  const confusionMatrix = modelView?.confusionMatrix;
  const selectedModelName = modelView?.displayName ?? 'Fuzzy Logic Fusion';
  const isFusionModel = selectedModelKey === 'fuzzyFusion';

  const kpis: MetricCardData[] = [
    {
      title: 'Current Status',
      value: latestPred.isAnomaly ? 'ANOMALOUS' : 'NOMINAL',
      subtext: latestPred.isAnomaly ? 'Requires Attention' : 'System nominal',
      status: latestPred.isAnomaly ? 'danger' : 'success',
      icon: 'ShieldAlert'
    },
    {
      title: 'Deviation Index',
      value: `${latestPred.confidence}%`,
      subtext: 'Current variance rate',
      status: latestPred.isAnomaly ? 'warning' : 'success',
      icon: 'Activity'
    },
    {
      title: 'Diagnostic Health',
      value: `${modelHealthScore}%`,
      subtext: 'Inference runtime OK',
      status: 'success',
      icon: 'Cpu'
    },
    {
      title: 'Detection Status',
      value: latestPred.isAnomaly ? 'CRITICAL ALERT' : 'ACTIVE MONITOR',
      subtext: 'Continuous telemetry scan',
      status: latestPred.isAnomaly ? 'danger' : 'info',
      icon: 'CheckCircle'
    },
    {
      title: 'Avg Cycle Response',
      value: `${latestPred.inferenceTimeMs} ms`,
      subtext: 'Main system chip',
      status: 'info',
      icon: 'Zap'
    },
    {
      title: 'Active Alerts Flagged',
      value: activeAlertsCount,
      subtext: 'Unresolved fault triggers',
      status: activeAlertsCount > 0 ? 'warning' : 'info',
      icon: 'AlertCircle'
    }
  ];

  const formatCount = (n: number) => n.toLocaleString();

  const KPI_ICONS: Record<string, LucideIcon> = {
    ShieldAlert,
    Activity,
    Cpu,
    CheckCircle,
    Zap,
    AlertCircle,
  };

  return (
    <div className="space-y-6">
      <LiveModelPerformance stats={liveRunStats} isRunning={isRunning} />

      {(summaryLoading || summaryError || modelOptions.length > 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 px-1">
          {(summaryLoading || summaryError) && (
            <div className="flex flex-wrap items-center gap-2 text-xs min-w-0 sm:mr-auto">
              {summaryLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                  <span className="text-[#9CA3AF]">Loading model performance data…</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
                  <span className="text-warning">{summaryError}</span>
                </>
              )}
            </div>
          )}
          {modelOptions.length > 0 && (
            <div className="w-full sm:w-64 shrink-0">
              <GlassSelect
                value={selectedModelKey}
                onChange={(v) => setSelectedModelKey(v as ModelKey)}
                options={modelOptions}
              />
            </div>
          )}
        </div>
      )}

      {performanceMetrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {performanceMetrics.map((met, idx) => (
            <div
              key={`model-${idx}`}
              className="cyber-action-card cyber-panel-cyan flex-col !items-start !gap-2 h-auto min-h-[6rem]"
            >
              <span className="text-[10px] uppercase tracking-widest text-cyber-muted font-medium">
                {met.label}
              </span>
              <span className="text-xl font-medium text-cyber-cyan tabular-nums">{met.value}</span>
              <span className="text-[9px] text-cyber-muted/70">{met.sub}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi, idx) => {
          let textCol = 'text-white';
          let borderCol = 'border-white/5';
          let bgCol = 'bg-white/[0.02]';

          if (kpi.status === 'success') {
            textCol = 'text-success';
          } else if (kpi.status === 'danger') {
            textCol = 'text-danger';
            borderCol = 'border-danger/20';
            bgCol = 'bg-danger/[0.02]';
          } else if (kpi.status === 'warning') {
            textCol = 'text-warning';
            borderCol = 'border-warning/10';
            bgCol = 'bg-warning/[0.01]';
          }

          return (
            <div
              key={idx}
              className={`cyber-action-card ${borderCol} ${bgCol} flex-col !items-start !gap-2 h-auto min-h-[7rem]`}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <span className="text-[10px] uppercase tracking-widest text-cyber-muted font-medium">
                  {kpi.title}
                </span>
                {KPI_ICONS[kpi.icon] && (
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.08] ${textCol}`}>
                    {(() => {
                      const KpiIcon = KPI_ICONS[kpi.icon];
                      return <KpiIcon className="w-4 h-4" strokeWidth={1.5} />;
                    })()}
                  </div>
                )}
              </div>
              <span className={`text-xl tracking-tight font-medium tabular-nums ${textCol}`}>
                {kpi.value}
              </span>
              <span className="text-[9px] text-cyber-muted">{kpi.subtext}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 space-y-5">
          <CyberPanel
            title="Diagnostic Timeline Analysis"
            subtitle="Model output"
            icon={LineChartIcon}
            accent="cyan"
            headerExtra={
              <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/[0.06]">
                <button
                  onClick={() => setActiveMetricTab('fusion')}
                  className={`px-3 py-1 text-[10px] uppercase rounded-lg transition-all cursor-pointer ${
                    activeMetricTab === 'fusion'
                      ? 'bg-cyber-cyan text-[#050a0f] font-semibold'
                      : 'text-cyber-muted hover:text-white'
                  }`}
                >
                  Unified
                </button>
                <button
                  onClick={() => setActiveMetricTab('individual')}
                  className={`px-3 py-1 text-[10px] uppercase rounded-lg transition-all cursor-pointer ${
                    activeMetricTab === 'individual'
                      ? 'bg-cyber-cyan text-[#050a0f] font-semibold'
                      : 'text-cyber-muted hover:text-white'
                  }`}
                >
                  Individual
                </button>
              </div>
            }
            bodyClassName="pt-2"
          >
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={predictions} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFusion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={latestPred.isAnomaly ? '#ff3b5c' : '#00e5ff'} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={latestPred.isAnomaly ? '#ff3b5c' : '#00e5ff'} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorForest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff9f43" stopOpacity={0.08}/>
                      <stop offset="95%" stopColor="#ff9f43" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLstm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#39ff8c" stopOpacity={0.08}/>
                      <stop offset="95%" stopColor="#39ff8c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="timestamp"
                    stroke="rgba(255,255,255,0.2)"
                    tick={{ fill: '#9CA3AF', fontSize: 9, fontFamily: 'Michroma, sans-serif' }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    stroke="rgba(255,255,255,0.2)"
                    tick={{ fill: '#9CA3AF', fontSize: 9, fontFamily: 'Michroma, sans-serif' }}
                    width={35}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(20, 20, 20, 0.9)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontFamily: 'Michroma, sans-serif',
                      fontSize: '11px'
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey={() => threshold}
                    stroke="#FF453A"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    name="Anomaly Threshold"
                    dot={false}
                  />

                  {activeMetricTab === 'fusion' ? (
                    <Area
                      type="monotone"
                      dataKey="fusionScore"
                      stroke={latestPred.isAnomaly ? '#ff3b5c' : '#00e5ff'}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorFusion)"
                      name="Unified Threshold Score"
                    />
                  ) : (
                    <>
                      <Area
                        type="monotone"
                        dataKey="isolationForestScore"
                        stroke="#FFB020"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#colorForest)"
                        name="Deviation Index"
                      />
                      <Area
                        type="monotone"
                        dataKey="lstmScore"
                        stroke="#30D158"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#colorLstm)"
                        name="Sequential Match Profile"
                      />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CyberPanel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-accent" strokeWidth={1.75} />
                <h3 className="cyber-panel-title text-white">
                  Key Influence Factors
                </h3>
              </div>
              <p className="cyber-panel-subtitle mb-4">Fleet data</p>
              <div className="h-56 w-full">
                {featureImportance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={featureImportance} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <XAxis type="number" stroke="rgba(255,255,255,0.15)" tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                      <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.15)" tick={{ fill: '#9CA3AF', fontSize: 9 }} width={75} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(20, 20, 20, 0.9)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          fontSize: '10px'
                        }}
                      />
                      <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                        {featureImportance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#5AC8FA' : 'rgba(90, 200, 250, 0.45)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[#9CA3AF]">
                    {summaryLoading ? 'Loading…' : 'No feature ranking available'}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-success" strokeWidth={1.75} />
                <h3 className="cyber-panel-title text-white">
                  Receiver Operating Characteristic
                </h3>
              </div>
              <p className="cyber-panel-subtitle mb-4">ROC curve</p>
              <div className="h-56 w-full">
                {rocCurveData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rocCurveData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <XAxis
                        type="number"
                        dataKey="fpr"
                        domain={[0, 1]}
                        stroke="rgba(255,255,255,0.15)"
                        tick={{ fill: '#9CA3AF', fontSize: 9 }}
                        name="FPR"
                      />
                      <YAxis
                        type="number"
                        dataKey="tpr"
                        domain={[0, 1]}
                        stroke="rgba(255,255,255,0.15)"
                        tick={{ fill: '#9CA3AF', fontSize: 9 }}
                        width={35}
                        name="TPR"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(20, 20, 20, 0.9)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          fontSize: '10px'
                        }}
                        formatter={(value: number, name: string) => [
                          value.toFixed(3),
                          name === 'tpr' ? 'True Positive Rate' : name,
                        ]}
                        labelFormatter={(fpr) => `FPR: ${Number(fpr).toFixed(3)}`}
                      />
                      <ReferenceLine
                        segment={[
                          { x: 0, y: 0 },
                          { x: 1, y: 1 },
                        ]}
                        stroke="rgba(255,255,255,0.15)"
                        strokeDasharray="3 3"
                      />
                      <Line
                        type="monotone"
                        dataKey="tpr"
                        stroke="#30D158"
                        strokeWidth={2.5}
                        dot={{ r: 3, strokeWidth: 0, fill: '#30D158' }}
                        name="tpr"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-[#9CA3AF]">
                    {summaryLoading ? 'Loading…' : 'No ROC data available'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-5">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
              <SlidersHorizontal className="w-4 h-4 text-accent" strokeWidth={1.75} />
              <h3 className="cyber-panel-title text-white">
                Sensitivity Calibration
              </h3>
            </div>

            <p className="cyber-panel-subtitle mb-3">Threshold</p>

            {isFusionModel ? (
              <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#9CA3AF]">Threshold</span>
                  <span className="text-white font-bold tabular-nums">{threshold.toFixed(4)}</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.99"
                  step="0.0001"
                  value={threshold}
                  onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-[9px] text-[#9CA3AF]">
                  <span>High sensitivity (0.10)</span>
                  <span>Calibrated ({modelView?.bestThreshold?.toFixed(4) ?? '0.9347'})</span>
                </div>
              </div>
            ) : (
              <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 p-4 rounded-xl text-xs text-[#9CA3AF] space-y-2">
                <p>
                  This slider only drives live alerts for <span className="text-white">Fuzzy Logic Fusion</span>.
                  Switch to that model to tune sensitivity during a run.
                </p>
                <p className="text-white/80 tabular-nums">
                  {selectedModelName} fixed threshold: {modelView?.thresholdLabel}
                </p>
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md space-y-4">
            <h3 className="cyber-panel-title text-white">
              System Performance Metrics
            </h3>
            <p className="cyber-panel-subtitle -mt-1 mb-1">Metrics</p>

            <div className="space-y-3.5">
              {performanceMetrics.length > 0 ? (
                performanceMetrics.map((met, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <div>
                      <span className="text-xs text-white block font-medium">{met.label}</span>
                      <span className="text-[10px] text-[#9CA3AF] block">{met.sub}</span>
                    </div>
                    <span className="text-sm font-semibold text-accent bg-accent/5 border border-accent/15 px-2.5 py-1 rounded-lg tabular-nums">
                      {met.value}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#9CA3AF] py-4 text-center">
                  {summaryLoading ? 'Loading metrics…' : 'Metrics unavailable'}
                </div>
              )}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4 text-accent" strokeWidth={1.75} />
              <h3 className="cyber-panel-title text-white">
                Diagnostic Confusion Matrix
              </h3>
            </div>
            <p className="cyber-panel-subtitle -mt-1 mb-1">Test set</p>

            {confusionMatrix ? (
              <div className="grid grid-cols-2 gap-1.5 text-center">
                <div className="bg-success/[0.03] border border-success/15 p-3 rounded-xl">
                  <span className="block text-[8px] text-[#9CA3AF] uppercase">True Positive (TP)</span>
                  <span className="block text-sm text-success font-bold mt-1">{formatCount(confusionMatrix.tp)}</span>
                  <span className="block text-[8px] text-[#9CA3AF]/60 mt-0.5">Anomalies Confirmed</span>
                </div>
                <div className="bg-danger/[0.02] border border-white/5 p-3 rounded-xl">
                  <span className="block text-[8px] text-[#9CA3AF] uppercase">False Positive (FP)</span>
                  <span className="block text-sm text-white/60 font-medium mt-1">{formatCount(confusionMatrix.fp)}</span>
                  <span className="block text-[8px] text-[#9CA3AF]/60 mt-0.5">False Flagged</span>
                </div>
                <div className="bg-danger/[0.02] border border-white/5 p-3 rounded-xl">
                  <span className="block text-[8px] text-[#9CA3AF] uppercase">False Negative (FN)</span>
                  <span className="block text-sm text-white/60 font-medium mt-1">{formatCount(confusionMatrix.fn)}</span>
                  <span className="block text-[8px] text-[#9CA3AF]/60 mt-0.5">Missed Alarm</span>
                </div>
                <div className="bg-[#181818] border border-white/5 p-3 rounded-xl">
                  <span className="block text-[8px] text-[#9CA3AF] uppercase">True Negative (TN)</span>
                  <span className="block text-sm text-white font-bold mt-1">{formatCount(confusionMatrix.tn)}</span>
                  <span className="block text-[8px] text-[#9CA3AF]/60 mt-0.5">Nominal Confirmed</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#9CA3AF] py-4 text-center">
                {summaryLoading ? 'Loading matrix…' : 'Matrix unavailable'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
