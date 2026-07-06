import { Activity, BrainCircuit, GitMerge, Layers } from 'lucide-react';
import { LiveRunStats } from '../types';
import CyberPanel from './CyberPanel';

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
        <span className="flex items-center gap-1.5 text-cyber-muted uppercase tracking-wider">
          <Icon className="w-3 h-3" strokeWidth={1.5} />
          {label}
        </span>
        <span className="text-white tabular-nums font-medium">{value.toFixed(3)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}66` }}
        />
      </div>
    </div>
  );
}

export default function LiveModelPerformance({ stats, isRunning }: LiveModelPerformanceProps) {
  if (!stats || stats.processedRows === 0) {
    return (
      <CyberPanel
        title="Live Model Performance Assessment"
        subtitle="Idle"
        icon={Layers}
        accent="purple"
      >
        <p className="text-xs text-cyber-muted">
          Upload telemetry and start playback to see model scores during the run.
        </p>
      </CyberPanel>
    );
  }

  const progress = stats.totalRows > 0 ? (stats.processedRows / stats.totalRows) * 100 : 0;
  const alertRate = stats.processedRows > 0 ? (stats.anomalyRows / stats.processedRows) * 100 : 0;
  const accuracy =
    stats.groundTruthRows > 0 ? (stats.matchCount / stats.groundTruthRows) * 100 : null;

  return (
    <CyberPanel
      title="Live Model Performance Assessment"
      subtitle="Live scores"
      icon={Layers}
      accent="purple"
      headerExtra={
        isRunning ? (
          <span className="text-[9px] uppercase tracking-wider text-cyber-green bg-cyber-green/10 border border-cyber-green/25 px-2 py-0.5 rounded-full">
            Running
          </span>
        ) : undefined
      }
      bodyClassName="space-y-4 pt-2"
    >
      <div className="flex flex-wrap gap-4 text-xs">
        <span className="text-cyber-muted">
          Rows <span className="text-white tabular-nums font-medium">{stats.processedRows}/{stats.totalRows}</span>
        </span>
        <span className="text-cyber-muted">
          Alerts <span className="text-white tabular-nums font-medium">{stats.anomalyRows}</span>
          <span className="text-cyber-muted/70 ml-1">({alertRate.toFixed(0)}%)</span>
        </span>
        {accuracy !== null && (
          <span className="text-cyber-muted">
            Match <span className="text-white tabular-nums font-medium">{accuracy.toFixed(0)}%</span>
          </span>
        )}
      </div>

      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #00e5ff, #b44dff)',
            boxShadow: '0 0 12px rgba(0,229,255,0.4)',
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scoreBar('Isolation Forest', stats.latestIsolationForest, '#ff9f43', BrainCircuit)}
        {scoreBar('LSTM AutoEncoder', stats.latestLstm, '#39ff8c', Activity)}
        {scoreBar('Fuzzy Fusion', stats.latestFusion, '#00e5ff', GitMerge)}
      </div>
    </CyberPanel>
  );
}
