import { CyberActionCard } from './CyberPanel';
import {
  ShieldCheck,
  AlertTriangle,
  Wifi,
  Clock,
} from 'lucide-react';

interface FleetStatusBarProps {
  vehicleStatus: 'nominal' | 'anomaly';
  activeAlerts: number;
  hasTelemetry?: boolean;
}

export default function FleetStatusBar({
  vehicleStatus,
  activeAlerts,
  hasTelemetry = false,
}: FleetStatusBarProps) {
  const isAnomaly = vehicleStatus === 'anomaly';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <CyberActionCard
        title="Telemetry"
        subtitle="Link"
        value={hasTelemetry ? 'Connected' : 'Standby'}
        icon={Wifi}
        accent="cyan"
      />
      <CyberActionCard
        title="Status"
        subtitle="Health"
        value={isAnomaly ? 'Anomaly' : 'Nominal'}
        icon={ShieldCheck}
        accent="green"
        alert={isAnomaly}
      />
      <CyberActionCard
        title="Alerts"
        subtitle="Active"
        value={String(activeAlerts)}
        icon={AlertTriangle}
        accent="purple"
        alert={activeAlerts > 0}
      />
      <CyberActionCard
        title="Sync"
        subtitle="Time"
        value={
          hasTelemetry
            ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
            : '—'
        }
        icon={Clock}
        accent="orange"
      />
    </div>
  );
}
