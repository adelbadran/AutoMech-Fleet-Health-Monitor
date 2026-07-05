import { AnimatePresence, motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Cpu,
  Wifi,
  AlertTriangle,
  Binary,
  ShieldCheck,
  Zap,
  RotateCcw,
  ScrollText,
  Trash2,
  BellRing,
  Server,
  Gauge,
} from 'lucide-react';
import { SystemLog } from '../types';

interface SystemActivityProps {
  logs: SystemLog[];
  onClearLogs: () => void;
}

const LOG_ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  Cpu,
  Wifi,
  AlertTriangle,
  Binary,
  ShieldCheck,
  Zap,
  RotateCcw,
  BellRing,
  Server,
  Gauge,
};

export default function SystemActivity({ logs, onClearLogs }: SystemActivityProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <ScrollText className="w-4 h-4 text-accent" strokeWidth={1.75} />
          </div>
          <h2 className="font-display font-medium text-sm text-white uppercase tracking-wider">
            System Activity Log
          </h2>
        </div>
        <button
          onClick={onClearLogs}
          className="text-[10px] text-[#9CA3AF] hover:text-white transition-all bg-white/5 hover:bg-white/10 px-2 py-1 rounded border border-white/5 cursor-pointer flex items-center gap-1.5"
        >
          <Trash2 className="w-3 h-3" />
          Clear
        </button>
      </div>

      <div className="overflow-y-auto pr-1 flex-1 space-y-2 min-h-0">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#9CA3AF]">
            <Activity className="w-8 h-8 opacity-20 mb-2 animate-pulse text-accent" />
            <p className="text-xs uppercase tracking-widest">Waiting for live data…</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4.5 top-2 bottom-2 w-px bg-white/5" />

            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {logs.map((log) => {
                  const Icon = LOG_ICON_MAP[log.iconName] || Activity;
                  
                  let bgStyle = 'bg-white/[0.01] hover:bg-white/[0.03] border-white/5';
                  let iconColor = 'text-[#9CA3AF]';
                  let textColor = 'text-white/85';
                  let pulseEffect = '';

                  if (log.severity === 'critical') {
                    bgStyle = 'bg-danger/5 hover:bg-danger/10 border-danger/20';
                    iconColor = 'text-danger';
                    textColor = 'text-white font-medium';
                    pulseEffect = 'shadow-[0_0_15px_rgba(255,69,58,0.1)]';
                  } else if (log.severity === 'warning') {
                    bgStyle = 'bg-warning/5 hover:bg-warning/10 border-warning/20';
                    iconColor = 'text-warning';
                    textColor = 'text-white/95';
                  }

                  return (
                    <motion.div
                      key={log.id}
                      layout
                      initial={{ opacity: 0, y: -20, scale: 0.95, filter: 'blur(5px)' }}
                      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                      className={`relative p-3 rounded-xl border ${bgStyle} ${pulseEffect} flex items-start gap-3 transition-colors`}
                    >
                      {log.severity === 'critical' && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r-md bg-danger" />
                      )}

                      <div className={`relative z-10 w-9 h-9 rounded-full bg-[#181818] border border-white/5 flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                        {log.severity === 'critical' && (
                          <span className="absolute -inset-0.5 rounded-full border border-danger/40 animate-ping opacity-75" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[9px] uppercase tracking-widest text-[#9CA3AF]/60">
                            {log.severity === 'critical' ? 'Critical' : log.severity === 'warning' ? 'Warning' : 'System'}
                          </span>
                          <span className="text-[9px] text-[#9CA3AF]/60 bg-white/5 px-1.5 py-0.5 rounded">
                            {log.timestamp}
                          </span>
                        </div>
                        <p className={`text-xs ${textColor} leading-relaxed font-sans`}>
                          {log.message}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
