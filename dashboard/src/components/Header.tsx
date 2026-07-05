import { useState, useRef, useEffect, type LucideIcon } from 'react';
import {
  Settings,
  RefreshCw,
  SlidersHorizontal,
  Upload,
  Radio,
  FlaskConical,
  Loader2,
  X,
  LayoutDashboard,
  Activity,
  Database,
} from 'lucide-react';
import { DataMode } from '../types';

type AppTab = 'live' | 'ai' | 'dataset';

const APP_TABS: { id: AppTab; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { id: 'live', label: 'Live Monitoring', shortLabel: 'Live', icon: LayoutDashboard },
  { id: 'ai', label: 'Predictive Diagnostics', shortLabel: 'AI', icon: Activity },
  { id: 'dataset', label: 'Fleet Analytics', shortLabel: 'Fleet', icon: Database },
];

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  dataMode: DataMode;
  simulationSpeed: 'realtime' | 'accelerated' | 'paused';
  uploadFileName: string | null;
  uploadProgress: string | null;
  isUploading: boolean;
  onDataModeChange: (mode: DataMode) => void;
  onSpeedChange: (speed: 'realtime' | 'accelerated' | 'paused') => void;
  onResetSimulation: () => void;
  onUploadFile: (file: File) => void;
  modelConfidence: number;
  mlBackendReady: boolean | null;
}

export default function Header({
  activeTab,
  onTabChange,
  dataMode,
  simulationSpeed,
  uploadFileName,
  uploadProgress,
  isUploading,
  onDataModeChange,
  onSpeedChange,
  onResetSimulation,
  onUploadFile,
  modelConfidence,
  mlBackendReady,
}: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (!showSettings) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showSettings]);

  const statusColor =
    mlBackendReady === true ? 'bg-success' : mlBackendReady === false ? 'bg-danger' : 'bg-white/30';

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-6 pt-3 pb-4">
      <div className="max-w-7xl mx-auto relative" ref={dockRef}>
        <div className="app-top-dock flex items-center gap-1 sm:gap-1.5 p-1">
          <div className="flex items-center gap-2 pl-2 sm:pl-2.5 pr-1 sm:pr-2 py-1 shrink-0">
            <img
              src="/automech-logo.png"
              alt="AutoMech"
              className="h-5 w-5 object-contain shrink-0 mix-blend-lighten opacity-90"
            />
            <span className="font-display text-[10px] sm:text-[11px] tracking-wide text-white/80 hidden min-[420px]:inline">
              AutoMech
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor}`}
              title={
                mlBackendReady === true
                  ? 'Diagnostics online'
                  : mlBackendReady === false
                    ? 'Diagnostics offline'
                    : 'Connecting…'
              }
            />
          </div>

          <div className="hidden sm:block w-px h-4 bg-white/[0.08] shrink-0" />

          <nav className="flex-1 flex items-center justify-center gap-0.5 min-w-0 p-0.5" aria-label="Main navigation">
            {APP_TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`app-top-tab ${isActive ? 'app-top-tab-active' : ''}`}
                >
                  <TabIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-black' : 'text-white/45'}`} />
                  <span className="hidden md:inline truncate">{tab.label}</span>
                  <span className="md:hidden truncate">{tab.shortLabel}</span>
                </button>
              );
            })}
          </nav>

          <div className="hidden sm:block w-px h-4 bg-white/[0.08] shrink-0" />

          <button
            type="button"
            onClick={() => setShowSettings((prev) => !prev)}
            className={`app-top-settings ${showSettings ? 'app-top-settings-active' : ''}`}
            aria-label={showSettings ? 'Close settings' : 'Open settings'}
            aria-expanded={showSettings}
          >
            {showSettings ? <X className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showSettings && (
          <div className="app-top-settings-panel">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h3 className="font-display text-xs tracking-wider text-white flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
                Data Source & Controls
              </h3>
            </div>

            <div className="space-y-2 mb-5">
              <label className="text-[10px] text-[#9CA3AF] uppercase tracking-widest block font-medium">
                Data source
              </label>
              <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => onDataModeChange('simulation')}
                  className={`py-2 text-[10px] tracking-wide uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    dataMode === 'simulation'
                      ? 'bg-accent text-black font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  Live Demo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDataModeChange('upload');
                    if (mlBackendReady !== false) {
                      setTimeout(() => fileInputRef.current?.click(), 150);
                    }
                  }}
                  className={`py-2 text-[10px] tracking-wide uppercase rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    dataMode === 'upload'
                      ? 'bg-accent text-black font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  Upload Data
                </button>
              </div>
            </div>

            {dataMode === 'upload' && (
              <div className="space-y-2 mb-5">
                <label className="text-[10px] text-[#9CA3AF] uppercase tracking-widest block font-medium">
                  Telemetry file
                </label>
                {mlBackendReady === false && (
                  <p className="text-[10px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-2.5 py-2">
                    Diagnostics service offline. Please restart the monitoring application.
                  </p>
                )}
                {mlBackendReady === true && (
                  <p className="text-[10px] text-success">Diagnostics engine ready</p>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-dashed border-white/15 hover:border-accent/40 text-xs text-white/80 cursor-pointer disabled:opacity-40"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 text-accent" />
                  )}
                  {uploadFileName || 'Upload telemetry CSV'}
                </button>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                {uploadProgress && <p className="text-[10px] text-accent">{uploadProgress}</p>}
                <p className="text-[9px] text-[#9CA3AF]">
                  Upload fleet telemetry for anomaly detection and health scoring.
                </p>
              </div>
            )}

            <div className="space-y-2 mb-5">
              <label className="text-[10px] text-[#9CA3AF] uppercase tracking-widest block font-medium">
                Playback speed
              </label>
              <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                {(['paused', 'realtime', 'accelerated'] as const).map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => onSpeedChange(speed)}
                    className={`py-1.5 text-[10px] tracking-wide uppercase rounded-lg transition-all cursor-pointer ${
                      simulationSpeed === speed
                        ? 'bg-accent text-black font-semibold'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {speed === 'paused' ? 'Pause' : speed === 'realtime' ? '1× Live' : '5× Fast'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 mb-5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <label className="text-[10px] text-[#9CA3AF] uppercase tracking-widest block font-medium">
                Detection status
              </label>
              <div className="text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#9CA3AF]">Confidence</span>
                  <span className="text-white tabular-nums">{modelConfidence.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onResetSimulation();
                setShowSettings(false);
              }}
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset telemetry
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
