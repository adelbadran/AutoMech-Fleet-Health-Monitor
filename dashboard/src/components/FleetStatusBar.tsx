import {
  ShieldCheck,
  AlertTriangle,
  Wifi,
  Clock,
  type LucideIcon,
} from 'lucide-react';

interface FleetStatusBarProps {
  vehicleStatus: 'nominal' | 'anomaly';
  activeAlerts: number;
  hasTelemetry?: boolean;
}

const STATUS_ITEMS: {
  key: string;
  icon: LucideIcon;
  getValue: (props: FleetStatusBarProps) => string;
  accent?: boolean;
}[] = [
  {
    key: 'telemetry',
    icon: Wifi,
    getValue: (p) => (p.hasTelemetry ? 'Connected' : 'Standby'),
    accent: true,
  },
  {
    key: 'status',
    icon: ShieldCheck,
    getValue: (p) => (p.vehicleStatus === 'nominal' ? 'Normal' : 'Anomaly'),
  },
  {
    key: 'alerts',
    icon: AlertTriangle,
    getValue: (p) => String(p.activeAlerts),
  },
  {
    key: 'sync',
    icon: Clock,
    getValue: (p) =>
      p.hasTelemetry
        ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        : '—',
  },
];

export default function FleetStatusBar(props: FleetStatusBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {STATUS_ITEMS.map((item) => {
        const Icon = item.icon;
        const value = item.getValue(props);
        const isAlert = item.key === 'status' && props.vehicleStatus === 'anomaly';
        const hasAlerts = item.key === 'alerts' && props.activeAlerts > 0;

        return (
          <div
            key={item.key}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border backdrop-blur-md transition-colors ${
              isAlert || hasAlerts
                ? 'bg-danger/[0.06] border-danger/20'
                : item.accent
                  ? 'bg-accent/[0.06] border-accent/20'
                  : 'bg-white/[0.04] border-white/10'
            }`}
          >
            <div
              className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                isAlert || hasAlerts
                  ? 'bg-danger/15 text-danger'
                  : item.accent
                    ? 'bg-accent/15 text-accent'
                    : 'bg-white/5 text-white/70'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <p
              className={`text-sm font-semibold whitespace-nowrap tabular-nums ${
                isAlert || hasAlerts ? 'text-danger' : item.accent ? 'text-accent' : 'text-white'
              }`}
            >
              {value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
