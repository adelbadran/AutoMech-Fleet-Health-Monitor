import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type CyberAccent = 'cyan' | 'purple' | 'green' | 'orange' | 'red';

const ACCENT_CLASS: Record<CyberAccent, { box: string; title: string; panel: string }> = {
  cyan: {
    box: 'cyber-icon-box-cyan',
    title: 'text-cyber-cyan',
    panel: 'cyber-panel-cyan',
  },
  purple: {
    box: 'cyber-icon-box-purple',
    title: 'text-cyber-purple',
    panel: 'cyber-panel-purple',
  },
  green: {
    box: 'cyber-icon-box-green',
    title: 'text-cyber-green',
    panel: 'cyber-panel-green',
  },
  orange: {
    box: 'cyber-icon-box-orange',
    title: 'text-cyber-orange',
    panel: 'cyber-panel-orange',
  },
  red: {
    box: 'cyber-icon-box-red',
    title: 'text-cyber-red',
    panel: 'cyber-panel-red',
  },
};

interface CyberPanelProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  accent?: CyberAccent;
  className?: string;
  bodyClassName?: string;
  headerExtra?: ReactNode;
  children: ReactNode;
}

export default function CyberPanel({
  title,
  subtitle,
  icon: Icon,
  accent = 'cyan',
  className = '',
  bodyClassName = '',
  headerExtra,
  children,
}: CyberPanelProps) {
  const styles = ACCENT_CLASS[accent];

  return (
    <section className={`cyber-panel ${styles.panel} ${className}`}>
      <header className="cyber-panel-header">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`cyber-icon-box cyber-icon-box-md ${styles.box}`}>
            <Icon className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className={`cyber-panel-title ${styles.title}`}>
              {title}
            </h2>
            {subtitle && (
              <p className="cyber-panel-subtitle truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {headerExtra}
      </header>
      <div className={`cyber-panel-body ${bodyClassName}`}>{children}</div>
    </section>
  );
}

interface CyberActionCardProps {
  title: string;
  subtitle: string;
  value: string;
  icon: LucideIcon;
  accent?: CyberAccent;
  alert?: boolean;
}

export function CyberActionCard({
  title,
  subtitle,
  value,
  icon: Icon,
  accent = 'cyan',
  alert = false,
}: CyberActionCardProps) {
  const styles = ACCENT_CLASS[alert ? 'red' : accent];

  return (
    <div className={`cyber-action-card ${styles.panel}`}>
      <div className={`cyber-icon-box cyber-icon-box-sm ${styles.box}`}>
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`cyber-card-title ${styles.title}`}>{title}</p>
        <p className="cyber-card-subtitle truncate">{subtitle}</p>
      </div>
      <p className={`cyber-card-value shrink-0 ${alert ? 'text-cyber-red' : 'text-white/90'}`}>
        {value}
      </p>
    </div>
  );
}
