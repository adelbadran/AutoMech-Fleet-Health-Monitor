import { useEffect, useState } from 'react';
import {
  Loader2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  BookMarked,
  Database,
  ShieldCheck,
  AlertCircle,
  Copy,
  PieChart,
  BarChart3,
  LineChart,
  GitCompare,
  TrendingUp,
  Layers,
  FlaskConical,
  Lightbulb,
  FileSpreadsheet,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import GlassSelect from './GlassSelect';
import { fetchEdaSummary } from '../api';
import { EDASummary } from '../types';
import {
  SectionEvidence,
  needsFeaturePicker,
  needsSensorPicker,
  type SectionId,
} from './EDAReportSections';

const REPORT_SECTIONS = [
  { id: 'executive-summary', title: 'Fleet Overview', summary: 'What is the business context of our vehicle health telemetry?' },
  { id: 'data-dictionary', title: 'Sensor Catalog', summary: 'Which vehicle signals are we monitoring, and what do they mean?' },
  { id: 'dataset-overview', title: 'Data Volume', summary: 'How much data do we have, and what does it look like in practice?' },
  { id: 'data-quality', title: 'Data Integrity', summary: 'Is the data reliable enough for analytics and predictive maintenance?' },
  { id: 'missing-values', title: 'Missing Values', summary: 'Are there missing sensor readings that could affect decisions?' },
  { id: 'duplicate-analysis', title: 'Duplicate Records', summary: 'Do we have duplicate or repeated records that could skew results?' },
  { id: 'target-distribution', title: 'Fault Rate Analysis', summary: 'How often do vehicles operate normally versus reporting a fault?' },
  { id: 'descriptive-statistics', title: 'Operating Ranges', summary: 'What are the typical operating ranges for each sensor?' },
  { id: 'histograms', title: 'Distribution Profiles', summary: 'How are sensor values distributed across the fleet?' },
  { id: 'outlier-analysis', title: 'Unusual Readings', summary: 'Which sensors show extreme readings we should investigate?' },
  { id: 'correlation', title: 'Sensor Relationships', summary: 'Which sensors move together, and which relate to fault events?' },
  { id: 'feature-vs-target', title: 'Normal vs Fault Comparison', summary: 'How do key sensors behave differently under normal vs fault conditions?' },
  { id: 'time-series', title: 'Temporal Trends', summary: 'How do sensor readings evolve over the monitoring period?' },
  { id: 'rolling-statistics', title: 'Short-term Trends', summary: 'Are there short-term shifts or instability in sensor behavior?' },
  { id: 'distribution-comparison', title: 'Condition Separation', summary: 'Can we visually separate healthy operation from fault patterns?' },
  { id: 'statistical-tests', title: 'Statistical Validation', summary: 'Which sensor differences between normal and fault are statistically proven?' },
  { id: 'key-findings', title: 'Key Insights', summary: 'What are the actionable takeaways from this analysis?' },
  { id: 'export-dataset', title: 'Prepared Datasets', summary: 'What clean datasets are ready for modeling and reporting?' },
] as const;

const SECTION_ICONS: Record<(typeof REPORT_SECTIONS)[number]['id'], LucideIcon> = {
  'executive-summary': LayoutDashboard,
  'data-dictionary': BookMarked,
  'dataset-overview': Database,
  'data-quality': ShieldCheck,
  'missing-values': AlertCircle,
  'duplicate-analysis': Copy,
  'target-distribution': PieChart,
  'descriptive-statistics': BarChart3,
  histograms: BarChart3,
  'outlier-analysis': AlertCircle,
  correlation: GitCompare,
  'feature-vs-target': Layers,
  'time-series': LineChart,
  'rolling-statistics': TrendingUp,
  'distribution-comparison': Layers,
  'statistical-tests': FlaskConical,
  'key-findings': Lightbulb,
  'export-dataset': FileSpreadsheet,
};

function getSectionSummary(eda: EDASummary, sectionId: (typeof REPORT_SECTIONS)[number]['id']): string {
  const sigTests = eda.statisticalTests.filter((t) => t.significant).length;
  const topOutlier = [...eda.outlierAnalysis].sort((a, b) => b.outlierPercent - a.outlierPercent)[0];
  const topCorr = eda.correlation.topPositive[0];

  switch (sectionId) {
    case 'executive-summary':
      return `We analyzed ${eda.datasetOverview.shape.rows.toLocaleString()} observations across ${eda.datasetOverview.shape.columns} fields (${eda.datasetOverview.memoryUsageMb} MB). ${eda.executiveSummary.topNotes.join(' ')}`;
    case 'data-dictionary':
      return `The fleet telemetry covers ${eda.dataDictionary.length} signals spanning engine performance, electrical health, braking, fuel, and motion.`;
    case 'dataset-overview':
      return `The dataset contains ${eda.datasetOverview.shape.rows.toLocaleString()} rows and ${eda.datasetOverview.columnNames.length} columns (${eda.datasetOverview.dtypesSummary}).`;
    case 'data-quality':
      return eda.dataQualityReport.note;
    case 'missing-values':
      return eda.missingValues.every((m) => m.count === 0)
        ? 'No missing values were detected — sensor coverage is complete across all features.'
        : `${eda.missingValues.reduce((s, m) => s + m.count, 0).toLocaleString()} missing values were found.`;
    case 'duplicate-analysis':
      return eda.duplicateAnalysis.duplicateRows === 0
        ? 'No duplicate rows were found — each observation is unique.'
        : `${eda.duplicateAnalysis.duplicateRows.toLocaleString()} duplicate rows detected.`;
    case 'target-distribution':
      return `${eda.targetDistribution.normal.toLocaleString()} normal (${(100 - eda.targetDistribution.faultRatePercent).toFixed(2)}%) vs ${eda.targetDistribution.fault.toLocaleString()} fault (${eda.targetDistribution.faultRatePercent.toFixed(2)}%).`;
    case 'descriptive-statistics':
      return `Range charts for ${eda.descriptiveStatistics.length} numeric sensors summarize median, spread, and typical limits.`;
    case 'histograms':
      return `Select a sensor to view its distribution profile, density curve, and typical range.`;
    case 'outlier-analysis':
      return topOutlier
        ? `${topOutlier.label} has the highest unusual reading rate (${topOutlier.outlierPercent.toFixed(2)}%).`
        : 'Unusual reading rates per sensor are summarized below.';
    case 'correlation':
      return topCorr
        ? `Strongest positive link: ${topCorr.label1} × ${topCorr.label2} (r=${topCorr.correlation.toFixed(4)}).`
        : 'Correlations highlight co-moving sensors and fault-related patterns.';
    case 'feature-vs-target':
      return `Compare normal vs fault profiles for priority sensors using range charts and density overlays.`;
    case 'time-series':
      return `Time-ordered traces (downsampled every ${eda.timeSeries.sampleStep} rows) show operational dynamics.`;
    case 'rolling-statistics':
      return `Rolling mean and volatility (window=${eda.rollingStatistics.windowSize}) highlight sustained shifts vs noise.`;
    case 'distribution-comparison':
      return `Density overlays for normal vs fault groups — wider separation means stronger diagnostic signal.`;
    case 'statistical-tests':
      return `${sigTests} of ${eda.statisticalTests.length} features show statistically significant differences between normal and fault conditions.`;
    case 'key-findings':
      return `${eda.keyFindings.length} evidence-based conclusions ready for stakeholder review.`;
    case 'export-dataset':
      return eda.exportCleanDataset.message;
    default:
      return '';
  }
}

const cardClass = 'p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md';

function InsightSection({
  id,
  title,
  summary,
  detail,
  sectionIcon: SectionIcon,
  children,
  className = cardClass,
}: {
  id: string;
  title: string;
  summary: string;
  detail: string;
  sectionIcon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={className}>
      <div className="mb-5 pb-4 border-b border-white/10">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <SectionIcon className="w-5 h-5 text-accent" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-base sm:text-lg text-white leading-snug">{title}</h3>
            <p className="text-sm text-white/60 mt-1">{summary}</p>
          </div>
        </div>
      </div>
      <div>
        <p className="text-sm text-white/90 leading-relaxed mb-5 pl-4 border-l-2 border-[#2a9d8f]/40">{detail}</p>
        <div className="space-y-4">{children}</div>
      </div>
    </section>
  );
}

export default function EDAReport() {
  const [eda, setEda] = useState<EDASummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionId>('executive-summary');
  const [selectedFeature, setSelectedFeature] = useState('');
  const [selectedSensor, setSelectedSensor] = useState('');

  useEffect(() => {
    fetchEdaSummary()
      .then((data) => {
        setEda(data);
        if (data.histograms.length > 0) setSelectedFeature(data.histograms[0].column);
        const sensor =
          data.featureVsTarget.sensors[0]?.column ?? data.timeSeries.sensors[0] ?? '';
        setSelectedSensor(sensor);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
        <p className="text-sm text-[#9CA3AF]">Loading fleet analytics…</p>
      </div>
    );
  }

  if (error || !eda) {
    return (
      <div className="p-6 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-sm space-y-2">
        <p>{error || 'Analytics data is currently unavailable.'}</p>
        <p className="text-[#9CA3AF] text-xs">
          Please ensure the monitoring service is running and analytics data has been prepared.
        </p>
      </div>
    );
  }

  const sectionIndex = REPORT_SECTIONS.findIndex((s) => s.id === selectedSection);
  const section = REPORT_SECTIONS[sectionIndex] ?? REPORT_SECTIONS[0];
  const sectionNum = sectionIndex + 1;

  const featureOptions = eda.histograms.map((h) => ({ value: h.column, label: h.label }));
  const sensorOptions = (
    eda.featureVsTarget.sensors.length > 0
      ? eda.featureVsTarget.sensors
      : eda.timeSeries.sensors.map((col) => ({ column: col, label: col }))
  ).map((s) => ({ value: s.column, label: s.label }));

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-br from-accent/10 via-white/[0.03] to-transparent border border-accent/20">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-3 min-w-0">
            <BookOpen className="w-6 h-6 text-accent shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-xl text-white">{eda.title}</h2>
              <p className="text-[10px] text-[#9CA3AF] mt-2 tabular-nums">
                Last updated {eda.generatedAt}
              </p>
            </div>
          </div>
          <div className="flex gap-8">
            <div className="text-right">
              <span className="text-[10px] uppercase text-[#9CA3AF] block font-medium">Observations</span>
              <span className="text-2xl text-white tabular-nums">{eda.datasetOverview.shape.rows.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-[#9CA3AF] block font-medium">Fault rate</span>
              <span className="text-2xl text-[#e76f51] tabular-nums">{eda.targetDistribution.faultRatePercent}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-end gap-4">
          <GlassSelect
            value={selectedSection}
            onChange={(v) => setSelectedSection(v as SectionId)}
            options={REPORT_SECTIONS.map((s) => ({
              value: s.id,
              label: s.title,
            }))}
          />
          <div className="flex items-center gap-2 shrink-0 pb-0.5">
            <button
              type="button"
              onClick={() => setSelectedSection(REPORT_SECTIONS[Math.max(0, sectionIndex - 1)].id)}
              disabled={sectionIndex === 0}
              className="p-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors"
              aria-label="Previous section"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] uppercase tracking-widest text-[#9CA3AF] px-2 whitespace-nowrap tabular-nums">
              {sectionNum} of {REPORT_SECTIONS.length}
            </span>
            <button
              type="button"
              onClick={() =>
                setSelectedSection(REPORT_SECTIONS[Math.min(REPORT_SECTIONS.length - 1, sectionIndex + 1)].id)
              }
              disabled={sectionIndex === REPORT_SECTIONS.length - 1}
              className="p-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors"
              aria-label="Next section"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {(needsFeaturePicker(selectedSection) || needsSensorPicker(selectedSection)) && (
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-white/10">
            {needsFeaturePicker(selectedSection) && (
              <GlassSelect
                value={selectedFeature}
                onChange={setSelectedFeature}
                options={featureOptions}
              />
            )}
            {needsSensorPicker(selectedSection) && (
              <GlassSelect
                value={selectedSensor}
                onChange={setSelectedSensor}
                options={sensorOptions}
              />
            )}
          </div>
        )}
      </div>

      <InsightSection
        key={selectedSection}
        id={section.id}
        title={section.title}
        summary={section.summary}
        detail={getSectionSummary(eda, section.id)}
        sectionIcon={SECTION_ICONS[section.id]}
      >
        <SectionEvidence
          eda={eda}
          sectionId={selectedSection}
          selectedFeature={selectedFeature}
          selectedSensor={selectedSensor}
        />
      </InsightSection>
    </div>
  );
}
