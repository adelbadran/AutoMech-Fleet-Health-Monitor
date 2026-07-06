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
  BellRing,
  Server,
  Gauge,
} from 'lucide-react';
import { SystemLog } from '../types';

interface SystemActivityProps {
  logs: SystemLog[];
  embedded?: boolean;
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

export default function SystemActivity({ logs, embedded = false }: SystemActivityProps) {
  return (
    <div className={`flex flex-col h-full ${embedded ? '' : 'p-4'}`}>
      <div className="overflow-y-auto pr-1 flex-1 space-y-2 min-h-0">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-cyber-muted">
            <div className="cyber-icon-box cyber-icon-box-cyan mb-3 opacity-60">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <p className="text-xs uppercase tracking-widest">Waiting for live data…</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4.5 top-2 bottom-2 w-px bg-cyber-cyan/10" />
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {logs.map((log) => {
                  const Icon = LOG_ICON_MAP[log.iconName] || Activity;

                  let bgStyle = 'bg-white/[0.02] hover:bg-cyber-cyan/[0.03] border-white/[0.06]';
                  let iconBox = 'bg-white/[0.04] text-cyber-muted border border-white/[0.08]';
                  let textColor = 'text-white/85';
                  let pulseEffect = '';

                  if (log.severity === 'critical') {
                    bgStyle = 'bg-cyber-red/[0.06] hover:bg-cyber-red/10 border-cyber-red/20';
                    iconBox = 'cyber-icon-box-red';
                    textColor = 'text-white font-medium';
                    pulseEffect = 'shadow-[0_0_15px_rgba(255,59,92,0.12)]';
                  } else if (log.severity === 'warning') {
                    bgStyle = 'bg-cyber-orange/[0.05] hover:bg-cyber-orange/10 border-cyber-orange/20';
                    iconBox = 'cyber-icon-box-orange';
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
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r-md bg-cyber-red" />
                      )}

                      <div className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBox}`}>
                        <Icon className="w-4 h-4" strokeWidth={1.5} />
                        {log.severity === 'critical' && (
                          <span className="absolute -inset-0.5 rounded-xl border border-cyber-red/40 animate-ping opacity-75" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[9px] uppercase tracking-widest text-cyber-muted">
                            {log.severity === 'critical' ? 'Critical' : log.severity === 'warning' ? 'Warning' : 'System'}
                          </span>
                          <span className="text-[9px] text-cyber-muted bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                            {log.timestamp}
                          </span>
                        </div>
                        <p className={`text-xs ${textColor} leading-relaxed font-sans`}>{log.message}</p>
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
