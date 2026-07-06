import { useState, useEffect, useRef, useCallback } from 'react';
import { Cog, CloudSun, Car, ScrollText, TrendingUp } from 'lucide-react';
import Header from './components/Header';
import CyberPanel from './components/CyberPanel';
import MeshGradientBackground from './components/MeshGradientBackground';
import FleetStatusBar from './components/FleetStatusBar';
import LiveTelemetry from './components/LiveTelemetry';
import SystemActivity from './components/SystemActivity';
import VehicleModel from './components/VehicleModel';
import AIMonitoring from './components/AIMonitoring';
import EDAReport from './components/EDAReport';
import SensorTrends from './components/SensorTrends';
import {
  getInitialSensors,
  getInitialLogs,
  getInitialPredictions,
  sensorsFromInferenceRow,
  predictionFromInferenceRow,
  anomalyStateFromInferenceRow,
  logFromInferenceRow,
  DEFAULT_MODEL_THRESHOLD,
} from './simulation';
import { connectTelemetryStream, controlStream, uploadTestFile, fetchHealth, fetchModelSummary } from './api';
import { SensorData, SystemLog, AIPrediction, DataMode, ModelAnomalyState, LiveRunStats, InferenceRow, createLiveRunStats, accumulateLiveRunStats, rebuildLiveRunStats } from './types';

const EMPTY_ANOMALY: ModelAnomalyState = {
  isAnomaly: false,
  fusionScore: 0,
  confidence: 0,
  reason: null,
  subsystem: null,
  topSensor: null,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'live' | 'ai' | 'dataset'>('live');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(() => {
    try {
      return localStorage.getItem('automech-nav') !== 'hidden';
    } catch {
      return true;
    }
  });
  const [dataMode, setDataMode] = useState<DataMode>('upload');

  const [sensors, setSensors] = useState<Record<string, SensorData>>(getInitialSensors);
  const [logs, setLogs] = useState<SystemLog[]>(() => getInitialLogs());
  const [predictions, setPredictions] = useState<AIPrediction[]>(getInitialPredictions);
  const [modelAnomaly, setModelAnomaly] = useState<ModelAnomalyState>(EMPTY_ANOMALY);
  const [threshold, setThreshold] = useState<number>(DEFAULT_MODEL_THRESHOLD);
  const [simulationSpeed, setSimulationSpeed] = useState<'realtime' | 'accelerated' | 'paused'>('paused');

  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [trendLabels, setTrendLabels] = useState<string[]>([]);
  const [liveRunStats, setLiveRunStats] = useState<LiveRunStats | null>(null);
  const [streamComplete, setStreamComplete] = useState(false);
  const [mlBackendReady, setMlBackendReady] = useState<boolean | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const thresholdRef = useRef<number>(DEFAULT_MODEL_THRESHOLD);
  const inferenceRowsRef = useRef<InferenceRow[]>([]);
  const totalRowsRef = useRef(0);

  const lastPrediction = predictions[predictions.length - 1];
  const hasTelemetry = sessionId !== null;
  const vehicleStatus = modelAnomaly.isAnomaly ? ('anomaly' as const) : ('nominal' as const);
  const modelConfidence = lastPrediction ? lastPrediction.confidence : 0;
  const modelHealthScore = hasTelemetry ? (modelAnomaly.isAnomaly ? 92.5 : 99.8) : 0;

  useEffect(() => {
    thresholdRef.current = threshold;
  }, [threshold]);

  const setCalibratedThreshold = useCallback((value: number) => {
    thresholdRef.current = value;
    setThreshold(value);
  }, []);

  const handleThresholdChange = useCallback((value: number) => {
    thresholdRef.current = value;
    setThreshold(value);
  }, []);

  const reprocessUploadedRows = useCallback((activeThreshold: number) => {
    const rows = inferenceRowsRef.current;
    if (rows.length === 0) return;

    let sensors = getInitialSensors();
    for (const row of rows) {
      sensors = sensorsFromInferenceRow(sensors, row, activeThreshold);
    }
    setSensors(sensors);

    const lastRow = rows[rows.length - 1];
    const anomaly = anomalyStateFromInferenceRow(lastRow, activeThreshold);
    setModelAnomaly(anomaly);

    const recentRows = rows.slice(-40);
    setPredictions(recentRows.map((row) => predictionFromInferenceRow(row, activeThreshold)));

    const log = logFromInferenceRow(lastRow, activeThreshold);
    if (log) setLogs([log]);
    else if (!anomaly.isAnomaly) setLogs([]);

    setLiveRunStats(rebuildLiveRunStats(rows, totalRowsRef.current || rows.length, activeThreshold));
  }, []);

  const closeStream = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

  const applyInferenceRow = useCallback((row: Parameters<typeof sensorsFromInferenceRow>[1]) => {
    const activeThreshold = thresholdRef.current;
    inferenceRowsRef.current.push(row);
    setSensors((current) => sensorsFromInferenceRow(current, row, activeThreshold));
    const prediction = predictionFromInferenceRow(row, activeThreshold);
    const anomaly = anomalyStateFromInferenceRow(row, activeThreshold);
    setModelAnomaly(anomaly);
    setLiveRunStats((prev) =>
      prev ? accumulateLiveRunStats(prev, row, prediction.isAnomaly) : prev,
    );
    setPredictions((prev) => {
      const list = [...prev, prediction];
      if (list.length > 40) list.shift();
      return list;
    });
    const log = logFromInferenceRow(row, activeThreshold);
    if (log) {
      setLogs((prev) => [log, ...prev].slice(0, 5));
    } else if (!anomaly.isAnomaly) {
      setLogs([]);
    }
    const label = row.timestamp?.includes(' ')
      ? row.timestamp.split(' ')[1]?.substring(0, 8) || `${row.rowIndex}`
      : `${row.rowIndex}`;
    setTrendLabels((prev) => [...prev, label].slice(-30));
  }, []);

  const startUploadStream = useCallback((newSessionId: string, speed: typeof simulationSpeed) => {
    closeStream();
    sessionIdRef.current = newSessionId;
    setSessionId(newSessionId);
    setStreamComplete(false);
    setUploadProgress('Processing telemetry stream…');

    eventSourceRef.current = connectTelemetryStream(newSessionId, speed === 'paused' ? 'paused' : speed, {
      onSession: (data) => {
        setCalibratedThreshold(data.bestThreshold ?? DEFAULT_MODEL_THRESHOLD);
        totalRowsRef.current = data.total;
        inferenceRowsRef.current = [];
        setLiveRunStats((prev) =>
          prev
            ? { ...prev, totalRows: data.total }
            : createLiveRunStats(data.total),
        );
        setUploadProgress(`Streaming ${data.total} rows from ${data.fileName}`);
      },
      onRow: (row) => applyInferenceRow(row),
      onComplete: () => {
        setStreamComplete(true);
        setUploadProgress('Playback complete');
      },
      onError: (msg) => setUploadProgress(msg),
    });
  }, [applyInferenceRow, closeStream, setCalibratedThreshold, simulationSpeed]);

  const handleUploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress('Analyzing uploaded fleet data…');
    setUploadFileName(file.name);
    setDataMode('upload');
    closeStream();

    try {
      const result = await uploadTestFile(file);
      const calibrated = result.bestThreshold ?? DEFAULT_MODEL_THRESHOLD;
      setCalibratedThreshold(calibrated);
      inferenceRowsRef.current = [];
      totalRowsRef.current = result.totalProcessedRows;
      setSensors(getInitialSensors());
      setPredictions([]);
      setLogs([]);
      setModelAnomaly(EMPTY_ANOMALY);
      setTrendLabels([]);
      setLiveRunStats(createLiveRunStats(result.totalProcessedRows));
      setStreamComplete(false);
      setSimulationSpeed('realtime');
      setUploadProgress(
        result.anomalyRows === 0
          ? `Ready — ${result.totalProcessedRows} rows, no anomalies detected`
          : `Ready — ${result.totalProcessedRows} rows, ${result.anomalyRows} anomalies`,
      );
      startUploadStream(result.sessionId, 'realtime');
    } catch (err: any) {
      setUploadProgress(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (dataMode !== 'upload' || !sessionIdRef.current) return;
    const action = simulationSpeed === 'paused' ? 'pause' : 'play';
    controlStream(sessionIdRef.current, action, simulationSpeed).catch(() => undefined);
  }, [simulationSpeed, dataMode]);

  useEffect(() => () => closeStream(), [closeStream]);

  useEffect(() => {
    fetchHealth()
      .then((h) =>
        setMlBackendReady(
          h.ok &&
            (h.missingArtifacts?.length ?? 0) === 0 &&
            h.hasModelSummary !== false
        )
      )
      .catch(() => setMlBackendReady(false));

    fetchModelSummary()
      .then((summary) => {
        if (summary.dashboard?.bestThreshold) {
          setCalibratedThreshold(summary.dashboard.bestThreshold);
        }
      })
      .catch(() => undefined);
  }, [setCalibratedThreshold]);

  useEffect(() => {
    if (dataMode !== 'upload' || inferenceRowsRef.current.length === 0) return;
    reprocessUploadedRows(threshold);
  }, [threshold, dataMode, reprocessUploadedRows]);

  const handleDataModeChange = (mode: DataMode) => {
    setDataMode(mode);
    if (mode === 'simulation') {
      closeStream();
      setUploadProgress(null);
    }
  };

  const handleNavToggle = () => {
    setNavVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('automech-nav', next ? 'visible' : 'hidden');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleResetSimulation = () => {
    closeStream();
    setSensors(getInitialSensors());
    setLogs(getInitialLogs());
    setPredictions(getInitialPredictions());
    setModelAnomaly(EMPTY_ANOMALY);
    setTrendLabels([]);
    setSessionId(null);
    sessionIdRef.current = null;
    inferenceRowsRef.current = [];
    totalRowsRef.current = 0;
    setUploadProgress(null);
    setUploadFileName(null);
    setLiveRunStats(null);
    setStreamComplete(false);
  };

  return (
    <div className="relative min-h-screen text-white flex flex-col font-sans selection:bg-cyber-cyan/30 selection:text-white">
      <MeshGradientBackground />

      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        dataMode={dataMode}
        simulationSpeed={simulationSpeed}
        uploadFileName={uploadFileName}
        uploadProgress={uploadProgress}
        isUploading={isUploading}
        onDataModeChange={handleDataModeChange}
        onSpeedChange={setSimulationSpeed}
        onResetSimulation={handleResetSimulation}
        onUploadFile={handleUploadFile}
        modelConfidence={modelConfidence}
        mlBackendReady={mlBackendReady}
        settingsOpen={settingsOpen}
        onSettingsOpenChange={setSettingsOpen}
        navVisible={navVisible}
        onNavToggle={handleNavToggle}
      />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pb-6 flex flex-col gap-6">
          {activeTab === 'live' && (
            <div className="space-y-6">
              <FleetStatusBar
                vehicleStatus={vehicleStatus}
                hasTelemetry={hasTelemetry}
                activeAlerts={vehicleStatus === 'anomaly' ? 1 : 0}
              />
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                <div className="xl:col-span-5 flex flex-col gap-6">
                  <CyberPanel
                    title="Engine and Powertrain Telemetry"
                    subtitle="Powertrain"
                    icon={Cog}
                    accent="cyan"
                    className="xl:h-[440px]"
                    bodyClassName="flex flex-col min-h-0"
                  >
                    <LiveTelemetry
                      sensors={sensors}
                      sensorIds={['speed', 'rpm', 'vibration_z', 'coolant_temp', 'engine_load', 'throttle_pos', 'brake_pressure']}
                    />
                  </CyberPanel>
                  <CyberPanel
                    title="Electrical and Environmental Systems"
                    subtitle="Auxiliary"
                    icon={CloudSun}
                    accent="green"
                    className="xl:h-[440px]"
                    bodyClassName="flex flex-col min-h-0"
                  >
                    <LiveTelemetry
                      sensors={sensors}
                      sensorIds={['oil_pressure', 'fuel_rate', 'intake_temp', 'battery_voltage', 'ambient_temp', 'acc_x', 'acc_y']}
                    />
                  </CyberPanel>
                </div>

                <div className="xl:col-span-7 flex flex-col gap-6">
                  <CyberPanel
                    title="Vehicle Spatial Asset Monitor"
                    subtitle="Live subsystem localization"
                    icon={Car}
                    accent="purple"
                    className="xl:h-[440px] h-[360px]"
                    bodyClassName="flex flex-col min-h-0 p-3 pt-0"
                  >
                    <VehicleModel
                      isAnomalyActive={modelAnomaly.isAnomaly}
                      activeAnomalySubsystem={modelAnomaly.subsystem}
                    />
                  </CyberPanel>
                  <CyberPanel
                    title="System Activity Register"
                    subtitle="Events"
                    icon={ScrollText}
                    accent="orange"
                    className="xl:h-[440px] h-[360px]"
                    bodyClassName="flex flex-col min-h-0 overflow-hidden pt-0"
                    headerExtra={
                      logs.length > 0 ? (
                        <button
                          onClick={() => setLogs([])}
                          className="text-[9px] text-cyber-muted hover:text-white transition-all bg-white/[0.04] hover:bg-white/[0.08] px-2 py-1 rounded-lg border border-white/[0.08] cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          Clear
                        </button>
                      ) : undefined
                    }
                  >
                    <SystemActivity logs={logs} embedded />
                  </CyberPanel>
                </div>
              </div>

              <CyberPanel
                title="Multivariate Sensor Trends"
                subtitle="Timeline"
                icon={TrendingUp}
                accent="cyan"
                bodyClassName="pt-2"
              >
                <SensorTrends sensors={sensors} tickLabels={trendLabels} embedded />
              </CyberPanel>
            </div>
          )}

          {activeTab === 'ai' && (
            <AIMonitoring
              predictions={predictions}
              logs={logs}
              threshold={threshold}
              onThresholdChange={handleThresholdChange}
              modelConfidence={modelConfidence}
              modelHealthScore={modelHealthScore}
              liveRunStats={liveRunStats}
              streamComplete={streamComplete}
              isRunning={hasTelemetry && !streamComplete && simulationSpeed !== 'paused'}
            />
          )}

        {activeTab === 'dataset' && <EDAReport />}
      </main>

      <footer className="relative z-10 py-6 border-t border-cyber-cyan/5 text-center text-[10px] text-cyber-muted/60">
        AutoMech Fleet Health Monitor © 2026. All rights reserved.
      </footer>
    </div>
  );
}
