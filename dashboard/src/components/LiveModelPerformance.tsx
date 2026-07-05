import { Activity, BrainCircuit, GitMerge, Layers } from 'lucide-react';
import { LiveRunStats } from '../types';

interface LiveModelPerformanceProps {
  stats: LiveRunStats | null;
  isRunning: boolean;
}

function scoreBar(label: string, value: number, color: string, icon: typeof Activity) {
  const Icon = icon;
  const pct = Math.min(100, Math.max(0, value * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="flex items-center gap-1.5 text-[#9CA3AF] uppercase tracking-wider">
          <Icon className="w-3 h-3" strokeWidth={1.75} />
          {label}
        </span>
        <span className="text-white tabular-nums font-medium">{value.toFixed(3)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function LiveModelPerformance({ stats, isRunning }: LiveModelPerformanceProps) {
  if (!stats || stats.processedRows === 0) {
    return (
      <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-4 h-4 text-accent" strokeWidth={1.75} />
          <h3 className="font-display font-medium text-sm text-white uppercase tracking-wider">
            Live Model Performance
          </h3>
        </div>
        <p className="text-xs text-[#9CA3AF]">Upload telemetry and start playback to see model scores during the run.</p>
      </div>
    );
  }

  const progress = stats.totalRows > 0 ? (stats.processedRows / stats.totalRows) * 100 : 0;
  const alertRate = stats.processedRows > 0 ? (stats.anomalyRows / stats.processedRows) * 100 : 0;
  const accuracy =
    stats.groundTruthRows > 0 ? (stats.matchCount / stats.groundTruthRows) * 100 : null;

  return (
    <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent" strokeWidth={1.75} />
          <h3 className="font-display font-medium text-sm text-white uppercase tracking-wider">
            Live Model Performance
          </h3>
          {isRunning && (
            <span className="text-[9px] uppercase tracking-wider text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
              Running
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="text-[#9CA3AF]">
            Rows <span className="text-white tabular-nums font-medium">{stats.processedRows}/{stats.totalRows}</span>
          </span>
          <span className="text-[#9CA3AF]">
            Alerts <span className="text-white tabular-nums font-medium">{stats.anomalyRows}</span>
            <span className="text-[#9CA3AF]/70 ml-1">({alertRate.toFixed(0)}%)</span>
          </span>
          {accuracy !== null && (
            <span className="text-[#9CA3AF]">
              Match <span className="text-white tabular-nums font-medium">{accuracy.toFixed(0)}%</span>
            </span>
          )}
        </div>
      </div>

      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-accent/80 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scoreBar('Isolation Forest', stats.latestIsolationForest, '#FFB020', BrainCircuit)}
        {scoreBar('LSTM AutoEncoder', stats.latestLstm, '#30D158', Activity)}
        {scoreBar('Fuzzy Fusion', stats.latestFusion, '#5AC8FA', GitMerge)}
      </div>
    </div>
  );
}
