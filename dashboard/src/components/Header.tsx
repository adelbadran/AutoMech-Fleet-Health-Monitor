import { useRef, useEffect } from 'react';
import {
  RefreshCw,
  SlidersHorizontal,
  Upload,
  Radio,
  FlaskConical,
  Loader2,
  X,
} from 'lucide-react';
import { DataMode } from '../types';
import type { AppTab } from './AppTopNav';
import AppTopNav from './AppTopNav';

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
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  navVisible: boolean;
  onNavToggle: () => void;
}

const TAB_LABELS: Record<AppTab, string> = {
  live: 'Live Monitoring',
  ai: 'Predictive Diagnostics',
  dataset: 'Fleet Analytics',
};

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
  settingsOpen,
  onSettingsOpenChange,
  navVisible,
  onNavToggle,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadFile(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (!settingsOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        onSettingsOpenChange(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [settingsOpen, onSettingsOpenChange]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="app-header w-full px-4 sm:px-6 pt-3 pb-2">
      <div className="max-w-7xl mx-auto">
        <div className="welcome-bar">
          <h1 className="welcome-title font-display">
            Welcome back, <span className="welcome-accent">Fleet Commander</span>
          </h1>
          <p className="welcome-sub">
            {TAB_LABELS[activeTab]} · {today.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="nav-slot">
        <AppTopNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          onOpenSettings={() => onSettingsOpenChange(!settingsOpen)}
          settingsOpen={settingsOpen}
          mlBackendReady={mlBackendReady}
          visible={navVisible}
          onToggleVisible={onNavToggle}
        />
      </div>

      {settingsOpen && (
        <div className="header-settings-layer" ref={settingsRef}>
          <button
            type="button"
            className="header-settings-backdrop"
            aria-label="Close controls"
            onClick={() => onSettingsOpenChange(false)}
          />
          <div className="app-top-settings-panel">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h3 className="font-display text-xs tracking-wider text-white flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyber-cyan" />
                Controls
              </h3>
              <button
                type="button"
                onClick={() => onSettingsOpenChange(false)}
                className="top-nav-icon-btn"
                aria-label="Close controls"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 mb-5">
              <label className="text-[10px] text-cyber-muted uppercase tracking-widest block font-medium">
                Data source
              </label>
              <div className="grid grid-cols-2 gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => onDataModeChange('simulation')}
                  className={`py-2 text-[10px] tracking-wide uppercase rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    dataMode === 'simulation'
                      ? 'bg-cyber-cyan text-[#050a0f] font-semibold'
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
                  className={`py-2 text-[10px] tracking-wide uppercase rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    dataMode === 'upload'
                      ? 'bg-cyber-cyan text-[#050a0f] font-semibold'
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
                <label className="text-[10px] text-cyber-muted uppercase tracking-widest block font-medium">
                  Telemetry file
                </label>
                {mlBackendReady === false && (
                  <p className="text-[10px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-2.5 py-2">
                    Diagnostics offline — restart the app.
                  </p>
                )}
                {mlBackendReady === true && (
                  <p className="text-[10px] text-success">Engine ready</p>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyber-cyan/5 border border-dashed border-cyber-cyan/25 hover:border-cyber-cyan/45 text-xs text-white/80 cursor-pointer disabled:opacity-40"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 text-cyber-cyan" />
                  )}
                  {uploadFileName || 'Upload CSV'}
                </button>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                {uploadProgress && <p className="text-[10px] text-cyber-cyan">{uploadProgress}</p>}
              </div>
            )}

            <div className="space-y-2 mb-5">
              <label className="text-[10px] text-cyber-muted uppercase tracking-widest block font-medium">
                Playback
              </label>
              <div className="grid grid-cols-3 gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
                {(['paused', 'realtime', 'accelerated'] as const).map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => onSpeedChange(speed)}
                    className={`py-1.5 text-[10px] tracking-wide uppercase rounded-lg transition-colors cursor-pointer ${
                      simulationSpeed === speed
                        ? 'bg-cyber-cyan text-[#050a0f] font-semibold'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {speed === 'paused' ? 'Pause' : speed === 'realtime' ? '1×' : '5×'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 mb-5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex justify-between text-[11px]">
                <span className="text-cyber-muted">Confidence</span>
                <span className="text-white tabular-nums">{modelConfidence.toFixed(1)}%</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onResetSimulation();
                onSettingsOpenChange(false);
              }}
              className="w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/08 text-white text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
