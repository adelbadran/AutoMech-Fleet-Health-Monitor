import type { ReactNode } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { EDASummary, EDABoxPlotStats } from '../types';

const cardClass = 'p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md';
const tooltipStyle = {
  backgroundColor: 'rgba(20,20,20,0.92)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  fontSize: '10px',
  fontFamily: 'Michroma, system-ui, sans-serif',
};
const TARGET_COLORS = ['#2a9d8f', '#e76f51'];
const CHART_TEAL = '#2a9d8f';
const CHART_CORAL = '#e76f51';
const CHART_SKY = '#5AC8FA';
const CHART_DARK = '#264653';

export type SectionId =
  | 'executive-summary'
  | 'data-dictionary'
  | 'dataset-overview'
  | 'data-quality'
  | 'missing-values'
  | 'duplicate-analysis'
  | 'target-distribution'
  | 'descriptive-statistics'
  | 'histograms'
  | 'outlier-analysis'
  | 'correlation'
  | 'feature-vs-target'
  | 'time-series'
  | 'rolling-statistics'
  | 'distribution-comparison'
  | 'statistical-tests'
  | 'key-findings'
  | 'export-dataset';

function fmt(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  if (Math.abs(v) < 1e-10 && v !== 0) return v.toExponential(2);
  return String(v);
}

function corrColor(val: number): string {
  if (val === 1) return 'bg-[#141414] text-white border-white/20';
  if (val > 0.8) return 'bg-[#5AC8FA]/30 text-[#5AC8FA] border-[#5AC8FA]/25';
  if (val > 0.5) return 'bg-[#5AC8FA]/18 text-[#5AC8FA]/90 border-white/5';
  if (val > 0.2) return 'bg-[#5AC8FA]/10 text-[#5AC8FA]/70 border-white/5';
  if (val < -0.5) return 'bg-[#FF453A]/18 text-[#FF453A]/90 border-white/5';
  return 'bg-white/[0.02] text-[#9CA3AF]/70 border-white/5';
}

function BoxPlotSvg({
  stats,
  color = CHART_TEAL,
  width = 280,
  height = 56,
  compact = false,
}: {
  stats: EDABoxPlotStats | null;
  color?: string;
  width?: number;
  height?: number;
  compact?: boolean;
}) {
  if (!stats || stats.q1 == null || stats.median == null || stats.q3 == null) {
    return (
      <div className="flex items-center justify-center text-[10px] text-[#9CA3AF]" style={{ width, height }}>
        No distribution stats
      </div>
    );
  }
  const vals = [stats.min, stats.whiskerLow, stats.q1, stats.median, stats.q3, stats.whiskerHigh, stats.max].filter(
    (v): v is number => v != null
  );
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const range = hi - lo || 1;
  const pad = compact ? 4 : 12;
  const plotW = width - pad * 2;
  const cy = height / 2;
  const boxH = compact ? 16 : 24;
  const toX = (v: number) => pad + ((v - lo) / range) * plotW;
  const xWhLo = toX(stats.whiskerLow ?? stats.q1);
  const xQ1 = toX(stats.q1);
  const xMed = toX(stats.median);
  const xQ3 = toX(stats.q3);
  const xWhHi = toX(stats.whiskerHigh ?? stats.q3);

  return (
    <svg width={width} height={height} className="overflow-visible mx-auto block" aria-hidden="true">
      <line x1={xWhLo} y1={cy} x2={xWhHi} y2={cy} stroke={color} strokeWidth={1.5} opacity={0.8} />
      <line x1={xWhLo} y1={cy - boxH / 3} x2={xWhLo} y2={cy + boxH / 3} stroke={color} strokeWidth={1.5} />
      <line x1={xWhHi} y1={cy - boxH / 3} x2={xWhHi} y2={cy + boxH / 3} stroke={color} strokeWidth={1.5} />
      <rect
        x={xQ1}
        y={cy - boxH / 2}
        width={Math.max(xQ3 - xQ1, 2)}
        height={boxH}
        fill={`${color}33`}
        stroke={color}
        strokeWidth={1.5}
      />
      <line x1={xMed} y1={cy - boxH / 2} x2={xMed} y2={cy + boxH / 2} stroke="#fff" strokeWidth={2} />
    </svg>
  );
}

function ChartFrame({
  height = 300,
  children,
  empty,
  emptyLabel = 'No chart data available.',
  title,
}: {
  height?: number;
  children?: ReactNode;
  empty?: boolean;
  emptyLabel?: string;
  title?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm overflow-hidden">
      {title && (
        <div className="px-4 py-2.5 border-b border-white/10 bg-white/[0.02]">
          <p className="text-[10px] uppercase tracking-widest text-[#9CA3AF]">{title}</p>
        </div>
      )}
      {empty ? (
        <div className="flex items-center justify-center px-6" style={{ height }}>
          <p className="text-xs text-[#9CA3AF] text-center">{emptyLabel}</p>
        </div>
      ) : (
        <div className="w-full p-3" style={{ height }}>
          {children}
        </div>
      )}
    </div>
  );
}

function PreviewTable({
  rows,
  columnNames,
}: {
  rows: Record<string, string | number | null>[];
  columnNames: string[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-[10px]">
        <thead className="bg-white/[0.03]">
          <tr className="text-[#9CA3AF] uppercase border-b border-white/10">
            {columnNames.map((col) => (
              <th key={col} className="py-2.5 px-3 text-left whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-white">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-white/[0.02]">
              {columnNames.map((col) => (
                <td key={col} className="py-2 px-3 whitespace-nowrap">
                  {String(row[col] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function mergeKdeOverlay(normalKde: { x: number; y: number }[], faultKde: { x: number; y: number }[]) {
  const map = new Map<number, { x: number; normal: number; fault: number }>();
  normalKde.forEach((p) => map.set(p.x, { x: p.x, normal: p.y, fault: 0 }));
  faultKde.forEach((p) => {
    const row = map.get(p.x);
    if (row) row.fault = p.y;
    else map.set(p.x, { x: p.x, normal: 0, fault: p.y });
  });
  return Array.from(map.values()).sort((a, b) => a.x - b.x);
}

export function SectionEvidence({
  eda,
  sectionId,
  selectedFeature,
  selectedSensor,
}: {
  eda: EDASummary;
  sectionId: SectionId;
  selectedFeature: string;
  selectedSensor: string;
}) {
  const featureHist =
    eda.histograms.find((h) => h.column === selectedFeature) ?? eda.histograms[0];
  const bins = featureHist?.bins ?? [];
  const kde = featureHist?.kde ?? [];
  const boxPlot = featureHist?.boxPlot ?? null;

  const compareSensor =
    eda.featureVsTarget.sensors.find((s) => s.column === selectedSensor) ??
    eda.featureVsTarget.sensors[0];

  const rollingSensor =
    eda.rollingStatistics.sensors.find((s) => s.column === selectedSensor) ??
    eda.rollingStatistics.sensors[0];

  const distSensor =
    eda.distributionComparison.sensors.find((s) => s.column === selectedSensor) ??
    eda.distributionComparison.sensors[0];

  const pieData = [
    { name: 'Normal', value: eda.targetDistribution.normal },
    { name: 'Fault', value: eda.targetDistribution.fault },
  ];

  switch (sectionId) {
    case 'executive-summary':
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Observations', value: eda.datasetOverview.shape.rows.toLocaleString() },
              { label: 'Features', value: String(eda.datasetOverview.shape.columns) },
              { label: 'Memory', value: `${eda.datasetOverview.memoryUsageMb} MB` },
              { label: 'Fault rate', value: `${eda.targetDistribution.faultRatePercent}%` },
            ].map((kpi) => (
              <div key={kpi.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <p className="text-[10px] uppercase text-[#9CA3AF] mb-1">{kpi.label}</p>
                <p className="text-xl text-white">{kpi.value}</p>
              </div>
            ))}
          </div>
          <ul className="space-y-2">
            {eda.executiveSummary.topNotes.map((note) => (
              <li key={note} className="text-sm text-white/85 pl-4 border-l-2 border-accent/30">
                {note}
              </li>
            ))}
          </ul>
        </div>
      );

    case 'data-dictionary':
      return (
        <PreviewTable
          rows={eda.dataDictionary.map((r) => ({ Feature: r.feature, Description: r.description, Unit: r.unit }))}
          columnNames={['Feature', 'Description', 'Unit']}
        />
      );

    case 'dataset-overview':
      return (
        <div className="space-y-5">
          <div className={`${cardClass} grid grid-cols-2 lg:grid-cols-4 gap-4 text-[11px]`}>
            <div>
              <span className="text-[10px] uppercase text-[#9CA3AF] block mb-1">Record count</span>
              <span className="text-white">
                ({eda.datasetOverview.shape.rows.toLocaleString()}, {eda.datasetOverview.shape.columns})
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#9CA3AF] block mb-1">Memory</span>
              <span className="text-white">{eda.datasetOverview.memoryUsageMb} MB</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#9CA3AF] block mb-1">Field types</span>
              <span className="text-white">{eda.datasetOverview.dtypesSummary}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-[#9CA3AF] block mb-1">Columns</span>
              <span className="text-white">{eda.datasetOverview.columnNames.length}</span>
            </div>
          </div>
          <div className={cardClass}>
            <p className="text-[10px] uppercase text-[#9CA3AF] mb-3">Sample records</p>
            <PreviewTable rows={eda.datasetOverview.head} columnNames={eda.datasetOverview.columnNames} />
          </div>
        </div>
      );

    case 'data-quality':
      return (
        <ChartFrame
          title="Data quality scorecard"
          height={320}
          empty={false}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { metric: 'Missing', value: eda.dataQualityReport.missingValues },
                { metric: 'Duplicates', value: eda.dataQualityReport.duplicateRows },
                { metric: 'Dup timestamps', value: eda.dataQualityReport.duplicateTimestamp ?? 0 },
                { metric: 'Infinite', value: eda.dataQualityReport.infiniteValues },
              ]}
              margin={{ top: 12, right: 12, left: 0, bottom: 40 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="metric" stroke="rgba(255,255,255,0.15)" tick={{ fill: '#9CA3AF', fontSize: 9 }} />
              <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fill: '#9CA3AF', fontSize: 9 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill={CHART_TEAL} opacity={0.85} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      );

    case 'missing-values': {
      const hasMissing = eda.missingValues.some((m) => m.count > 0);
      return (
        <ChartFrame title="Missing values by column" height={340} empty={!hasMissing} emptyLabel="No missing values — full sensor coverage.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={eda.missingValues} margin={{ top: 12, right: 12, left: 0, bottom: 72 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="rgba(255,255,255,0.15)"
                tick={{ fill: '#9CA3AF', fontSize: 8 }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={70}
              />
              <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fill: '#9CA3AF', fontSize: 9 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={CHART_DARK} opacity={0.85} name="Missing count" />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      );
    }

    case 'duplicate-analysis':
      return (
        <ChartFrame title="Duplicate record summary" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { label: 'Duplicate rows', count: eda.duplicateAnalysis.duplicateRows },
                { label: 'Dup. timestamps', count: eda.duplicateAnalysis.duplicatedTimestamps ?? 0 },
              ]}
              margin={{ top: 12, right: 12, left: 0, bottom: 24 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" stroke="rgba(255,255,255,0.15)" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fill: '#9CA3AF', fontSize: 9 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={CHART_SKY} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      );

    case 'target-distribution':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ChartFrame title="Normal vs fault counts" height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { label: 'Normal', count: eda.targetDistribution.normal },
                  { label: 'Fault', count: eda.targetDistribution.fault },
                ]}
                margin={{ top: 12, right: 12, left: 0, bottom: 24 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={CHART_TEAL} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <ChartFrame title="Class balance" height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={TARGET_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
      );

    case 'descriptive-statistics':
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {eda.histograms.map((h) => (
            <div key={h.column} className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <p className="text-[10px] text-white mb-3 truncate" title={h.label}>
                {h.label}
              </p>
              <BoxPlotSvg stats={h.boxPlot} width={240} height={52} />
              {h.boxPlot?.median != null && (
                <p className="text-[9px] text-[#9CA3AF] text-center mt-2">Median: {fmt(h.boxPlot.median)}</p>
              )}
            </div>
          ))}
        </div>
      );

    case 'histograms':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartFrame title="Histogram" height={300} empty={bins.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bins.map((b, i) => ({ i, count: b.count, mid: (b.binStart + b.binEnd) / 2 }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="mid" hide />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} width={48} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={CHART_DARK} opacity={0.9} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
            <ChartFrame title="Density curve" height={300} empty={kde.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kde} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="x" hide />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} width={48} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="y" stroke={CHART_CORAL} fill={CHART_CORAL} fillOpacity={0.35} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartFrame>
            <ChartFrame title="Box plot" height={300} empty={!boxPlot}>
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <BoxPlotSvg stats={boxPlot} width={280} height={64} />
                {boxPlot && (
                  <p className="text-[10px] text-[#9CA3AF]">
                    Typical range: {fmt(boxPlot.q1)} – {fmt(boxPlot.q3)} · Median: {fmt(boxPlot.median)}
                  </p>
                )}
              </div>
            </ChartFrame>
          </div>
        </div>
      );

    case 'outlier-analysis':
      return (
        <div className="space-y-5">
          <ChartFrame title="Unusual reading rate by sensor" height={360}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eda.outlierAnalysis} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 4 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 8 }} />
                <YAxis type="category" dataKey="label" width={130} tick={{ fill: '#9CA3AF', fontSize: 8 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v.toFixed(4)}%`} />
                <Bar dataKey="outlierPercent" fill={CHART_CORAL} opacity={0.85} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {eda.outlierAnalysis.slice(0, 6).map((row) => {
              const bp =
                eda.histograms.find((h) => h.column === row.column)?.boxPlot ??
                ({
                  min: row.lowerBound,
                  q1: row.q1,
                  median: row.median,
                  q3: row.q3,
                  max: row.upperBound,
                  whiskerLow: row.lowerBound,
                  whiskerHigh: row.upperBound,
                } as EDABoxPlotStats);
              return (
                <div key={row.column} className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                  <p className="text-[9px] text-white truncate mb-1">{row.label}</p>
                  <p className="text-[9px] text-[#e76f51] mb-2">{row.outlierPercent.toFixed(2)}%</p>
                  <BoxPlotSvg stats={bp} color={CHART_SKY} width={200} height={44} compact />
                </div>
              );
            })}
          </div>
        </div>
      );

    case 'correlation':
      return (
        <div className="space-y-5">
          <div className="overflow-auto max-h-[480px] rounded-xl border border-white/10 p-2 bg-white/[0.03] backdrop-blur-sm">
            <div
              className="inline-grid gap-px text-[8px] min-w-max"
              style={{ gridTemplateColumns: `120px repeat(${eda.correlation.columns.length}, 48px)` }}
            >
              <div />
              {eda.correlation.labels.map((label) => (
                <div key={label} className="text-[#9CA3AF] font-bold py-1 truncate text-center px-0.5" title={label}>
                  {label.split(' ')[0]}
                </div>
              ))}
              {eda.correlation.matrix.map((row, i) => (
                <div key={eda.correlation.columns[i]} className="contents">
                  <div className="text-[#9CA3AF] font-bold py-2 pr-2 truncate self-center" title={eda.correlation.labels[i]}>
                    {eda.correlation.labels[i]}
                  </div>
                  {row.map((val, j) => (
                    <div
                      key={`${i}-${j}`}
                      className={`h-9 flex items-center justify-center rounded border ${corrColor(val)}`}
                      title={`${eda.correlation.labels[i]} × ${eda.correlation.labels[j]}: ${val}`}
                    >
                      {val.toFixed(2)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartFrame title="Top positive correlations" height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={eda.correlation.topPositive.map((p) => ({
                    label: `${p.label1.split(' ')[0]}×${p.label2.split(' ')[0]}`,
                    correlation: p.correlation,
                  }))}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                  <XAxis type="number" domain={[-1, 1]} tick={{ fill: '#9CA3AF', fontSize: 8 }} />
                  <YAxis type="category" dataKey="label" width={100} tick={{ fill: '#9CA3AF', fontSize: 7 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="correlation" fill={CHART_SKY} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
            <ChartFrame title="Top negative correlations" height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={eda.correlation.topNegative.map((p) => ({
                    label: `${p.label1.split(' ')[0]}×${p.label2.split(' ')[0]}`,
                    correlation: p.correlation,
                  }))}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                  <XAxis type="number" domain={[-1, 1]} tick={{ fill: '#9CA3AF', fontSize: 8 }} />
                  <YAxis type="category" dataKey="label" width={100} tick={{ fill: '#9CA3AF', fontSize: 7 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="correlation" fill={CHART_CORAL} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </div>
        </div>
      );

    case 'feature-vs-target': {
      if (!compareSensor) {
        return <ChartFrame empty emptyLabel="No sensor comparison data." height={200} />;
      }
      const kdeOverlay = mergeKdeOverlay(compareSensor.normalKde ?? [], compareSensor.faultKde ?? []);
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartFrame title={`${compareSensor.label} — box plots`} height={320}>
            <div className="h-full flex flex-col justify-center gap-4 px-2">
              <div>
                <p className="text-[9px] text-[#2a9d8f] mb-1">Normal operation</p>
                <BoxPlotSvg stats={compareSensor.normalBox} color={CHART_TEAL} width={320} height={56} />
              </div>
              <div>
                <p className="text-[9px] text-[#e76f51] mb-1">Fault condition</p>
                <BoxPlotSvg stats={compareSensor.faultBox} color={CHART_CORAL} width={320} height={56} />
              </div>
            </div>
          </ChartFrame>
          <ChartFrame title="Density overlay" height={320} empty={kdeOverlay.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kdeOverlay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="x" hide />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} width={48} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Area type="monotone" dataKey="normal" stroke={CHART_TEAL} fill={CHART_TEAL} fillOpacity={0.35} dot={false} name="Normal" />
                <Area type="monotone" dataKey="fault" stroke={CHART_CORAL} fill={CHART_CORAL} fillOpacity={0.35} dot={false} name="Fault" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
      );
    }

    case 'time-series': {
      const points = eda.timeSeries.points ?? [];
      const data = points.map((p, i) => ({
        i,
        value: typeof p[selectedSensor] === 'number' ? (p[selectedSensor] as number) : null,
      }));
      return (
        <ChartFrame
          title={`${selectedSensor} over time (every ${eda.timeSeries.sampleStep} rows)`}
          height={360}
          empty={data.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="i" hide />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} width={48} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="value" stroke={CHART_SKY} dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      );
    }

    case 'rolling-statistics': {
      const rollData = (rollingSensor?.points ?? []).map((p, i) => ({
        i,
        mean: p.rollingMean,
        std: p.rollingStd,
      }));
      return (
        <ChartFrame
          title={`${rollingSensor?.label ?? selectedSensor} · rolling window ${eda.rollingStatistics.windowSize}`}
          height={360}
          empty={rollData.length === 0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rollData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="i" hide />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} width={48} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Line type="monotone" dataKey="mean" stroke={CHART_DARK} dot={false} name="Rolling mean" />
              <Line type="monotone" dataKey="std" stroke={CHART_CORAL} dot={false} name="Rolling std" />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      );
    }

    case 'distribution-comparison': {
      const distData = (distSensor?.normalBins ?? []).map((nb, i) => ({
        bin: i,
        normal: nb.density,
        fault: distSensor?.faultBins[i]?.density ?? 0,
      }));
      return (
        <ChartFrame title={`${distSensor?.label ?? selectedSensor} · normal vs fault density`} height={360} empty={distData.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={distData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="bin" hide />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 9 }} width={48} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Line type="monotone" dataKey="normal" stroke={CHART_TEAL} dot={false} name="Normal" strokeWidth={2} />
              <Line type="monotone" dataKey="fault" stroke={CHART_CORAL} dot={false} name="Fault" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      );
    }

    case 'statistical-tests':
      return (
        <ChartFrame title="Statistical comparison" height={420}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={eda.statisticalTests.map((t) => ({
                ...t,
                negLogP: t.pValue != null && t.pValue > 0 ? -Math.log10(t.pValue) : 0,
              }))}
              layout="vertical"
              margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
            >
              <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: '#9CA3AF', fontSize: 8 }}
                label={{ value: 'Significance level', position: 'insideBottom', offset: -2, fill: '#9CA3AF', fontSize: 9 }}
              />
              <YAxis type="category" dataKey="label" width={140} tick={{ fill: '#9CA3AF', fontSize: 7 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(_v: number, _n: string, props: { payload?: { pValue?: number | null } }) => [
                  props.payload?.pValue != null ? props.payload.pValue.toExponential(2) : '—',
                  'Probability',
                ]}
              />
              <ReferenceLine x={-Math.log10(0.05)} stroke={CHART_TEAL} strokeDasharray="4 4" />
              <Bar dataKey="negLogP" radius={[0, 4, 4, 0]}>
                {eda.statisticalTests.map((entry) => (
                  <Cell key={entry.column} fill={entry.significant ? CHART_TEAL : '#9CA3AF'} opacity={0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      );

    case 'key-findings':
      return (
        <ul className="space-y-3">
          {eda.keyFindings.map((finding, i) => (
            <li key={finding} className="flex gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="shrink-0 w-7 h-7 rounded-lg bg-accent/15 text-accent text-[10px] flex items-center justify-center border border-accent/25">
                {i + 1}
              </span>
              <span className="text-sm text-white/90 leading-relaxed">{finding}</span>
            </li>
          ))}
        </ul>
      );

    case 'export-dataset':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              file: eda.exportCleanDataset.cleanedDatasetFile,
              cols: eda.exportCleanDataset.cleanedDatasetColumns,
            },
            {
              file: eda.exportCleanDataset.dashboardDatasetFile,
              cols: eda.exportCleanDataset.dashboardDatasetColumns,
            },
          ].map((d) => (
            <div key={d.file} className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
              <p className="text-accent text-sm mb-2">{d.file}</p>
              <p className="text-[#9CA3AF] text-xs mb-3">{eda.exportCleanDataset.rowCount.toLocaleString()} rows</p>
              <p className="text-[10px] text-[#9CA3AF] leading-relaxed break-all">{d.cols.join(', ')}</p>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

export function needsFeaturePicker(sectionId: SectionId): boolean {
  return sectionId === 'histograms';
}

export function needsSensorPicker(sectionId: SectionId): boolean {
  return ['feature-vs-target', 'time-series', 'rolling-statistics', 'distribution-comparison'].includes(sectionId);
}
