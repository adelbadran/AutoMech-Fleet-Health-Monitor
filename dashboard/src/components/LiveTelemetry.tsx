import {
  Gauge,
  Zap,
  Thermometer,
  Droplet,
  Activity,
  Cpu,
  Fuel,
  Wind,
  Battery,
  Compass,
  Sun,
  CircleDot,
  ArrowUpDown,
  MoveHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { SensorData } from '../types';

interface LiveTelemetryProps {
  sensors: Record<string, SensorData>;
  title?: string;
  titleIcon?: LucideIcon;
  sensorIds?: string[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  rpm: Gauge,
  speed: Zap,
  coolant_temp: Thermometer,
  oil_pressure: Droplet,
  vibration_z: Activity,
  engine_load: Cpu,
  fuel_rate: Fuel,
  intake_temp: Wind,
  battery_voltage: Battery,
  throttle_pos: Compass,
  ambient_temp: Sun,
  brake_pressure: CircleDot,
  acc_x: ArrowUpDown,
  acc_y: MoveHorizontal,
};

function Sparkline({ history, status }: { history: number[]; status: string }) {
  if (history.length < 2) return null;

  const width = 70;
  const height = 24;
  const padding = 2;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min === 0 ? 1 : max - min;

  const points = history
    .map((val, index) => {
      const x = (index / (history.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((val - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    })
    .join(' ');

  let strokeColor = '#00e5ff';
  if (status === 'warning') strokeColor = '#ff9f43';
  if (status === 'danger') strokeColor = '#ff3b5c';

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function LiveTelemetry({ sensors, sensorIds }: LiveTelemetryProps) {
  const availableSensors = sensorIds
    ? Object.values(sensors).filter((sensor) => sensorIds.includes(sensor.id))
    : Object.values(sensors);

  return (
    <div className="flex flex-col h-full justify-between -m-1">
      <div className="flex flex-col gap-2 flex-1 justify-evenly min-h-0 overflow-y-auto pr-0.5">
        {availableSensors.map((sensor) => {
          const IconComponent = ICON_MAP[sensor.id] || Gauge;
          const { status } = sensor;

          let borderStyle = 'border-white/[0.06]';
          let bgStyle = 'bg-white/[0.02] hover:bg-cyber-cyan/[0.03]';
          let statusText = 'Nominal';
          let statusColor = 'text-cyber-muted';
          let valueColor = 'text-white';
          let iconBoxClass = 'cyber-icon-box-sm bg-white/[0.04] text-cyber-muted border border-white/[0.08]';

          if (status === 'warning') {
            borderStyle = 'border-cyber-orange/25';
            bgStyle = 'bg-cyber-orange/[0.04] hover:bg-cyber-orange/[0.06]';
            statusText = 'Out of range';
            statusColor = 'text-cyber-orange';
            valueColor = 'text-cyber-orange';
            iconBoxClass = 'cyber-icon-box-sm cyber-icon-box-orange animate-glow-warning';
          } else if (status === 'danger') {
            borderStyle = 'border-cyber-red/30';
            bgStyle = 'bg-cyber-red/[0.05] hover:bg-cyber-red/[0.08]';
            statusText = 'Critical';
            statusColor = 'text-cyber-red';
            valueColor = 'text-cyber-red';
            iconBoxClass = 'cyber-icon-box-sm cyber-icon-box-red animate-glow-danger';
          }

          return (
            <div
              key={sensor.id}
              id={`sensor-card-${sensor.id}`}
              className={`py-2.5 px-3 rounded-xl border ${borderStyle} ${bgStyle} transition-all duration-300 flex items-center justify-between gap-3`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={`flex items-center justify-center shrink-0 ${iconBoxClass}`}>
                  <IconComponent className="w-3.5 h-3.5" strokeWidth={1.5} />
                </div>
                <span className="text-[11px] font-medium text-white truncate max-w-[120px]">
                  {sensor.name}
                </span>
              </div>

              <div className="hidden sm:flex items-center justify-center flex-1 px-4">
                <Sparkline history={sensor.history} status={status} />
              </div>

              <div className="flex flex-col items-end shrink-0 min-w-[70px]">
                <span className={`text-[11px] tracking-tight font-semibold whitespace-nowrap tabular-nums ${valueColor}`}>
                  {sensor.value.toLocaleString()}
                  <span className="text-[8px] text-cyber-muted font-normal ml-0.5 uppercase">{sensor.unit}</span>
                </span>
                {(status === 'warning' || status === 'danger') && (
                  <span className={`text-[7px] uppercase tracking-wider ${statusColor} flex items-center gap-1 mt-0.5`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status === 'danger' ? 'bg-cyber-red' : 'bg-cyber-orange'}`} />
                    {statusText}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
