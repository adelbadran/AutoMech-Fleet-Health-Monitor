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
  Cog,
  CloudSun,
  Radio,
  type LucideIcon,
} from 'lucide-react';
import { SensorData } from '../types';

interface LiveTelemetryProps {
  sensors: Record<string, SensorData>;
  title?: string;
  titleIcon?: LucideIcon;
  sensorIds?: string[];
}

const ICON_MAP: Record<string, any> = {
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

function Sparkline({ history, status, minNormal, maxNormal }: { history: number[]; status: string; minNormal: number; maxNormal: number }) {
  if (history.length < 2) return null;

  const width = 70;
  const height = 24;
  const padding = 2;

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min === 0 ? 1 : max - min;

  const points = history.map((val, index) => {
    const x = (index / (history.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((val - min) / range) * (height - padding * 2) - padding;
    return `${x},${y}`;
  }).join(' ');

  let strokeColor = '#5AC8FA';
  if (status === 'warning') strokeColor = '#FFB020';
  if (status === 'danger') strokeColor = '#FF453A';

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

export default function LiveTelemetry({ sensors, title = "Live Telemetry", titleIcon: TitleIcon = Radio, sensorIds }: LiveTelemetryProps) {
  const availableSensors = sensorIds
    ? Object.values(sensors).filter((sensor) => sensorIds.includes(sensor.id))
    : Object.values(sensors);

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <TitleIcon className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
          </div>
          <h2 className="font-display font-semibold text-[11px] text-[#5AC8FA] uppercase tracking-wider truncate">
            {title}
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 flex-1 mt-3 justify-evenly min-h-0 overflow-y-auto">
        {availableSensors.map((sensor) => {
          const IconComponent = ICON_MAP[sensor.id] || Gauge;
          const { status } = sensor;

          let borderStyle = 'border-white/5';
          let bgStyle = 'bg-white/[0.02] hover:bg-white/[0.04]';
          let statusText = 'Nominal';
          let statusColor = 'text-[#9CA3AF]/60';
          let valueColor = 'text-white';

          if (status === 'warning') {
            borderStyle = 'border-warning/30';
            bgStyle = 'bg-warning/[0.03] hover:bg-warning/[0.05]';
            statusText = 'Out of range';
            statusColor = 'text-warning';
            valueColor = 'text-warning';
          } else if (status === 'danger') {
            borderStyle = 'border-danger/30';
            bgStyle = 'bg-danger/[0.04] hover:bg-danger/[0.06]';
            statusText = 'Critical';
            statusColor = 'text-danger';
            valueColor = 'text-danger';
          }

          return (
            <div
              key={sensor.id}
              id={`sensor-card-${sensor.id}`}
              className={`py-2.5 px-3 rounded-xl border ${borderStyle} ${bgStyle} transition-all duration-300 flex items-center justify-between gap-3`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                  status === 'danger'
                    ? 'bg-danger/20 text-danger animate-glow-danger border border-danger/30'
                    : status === 'warning'
                    ? 'bg-warning/20 text-warning animate-glow-warning border border-warning/30'
                    : 'bg-white/5 text-[#9CA3AF]/80'
                }`}>
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-white block truncate max-w-[120px]">
                    {sensor.name}
                  </span>
                </div>
              </div>

              <div className="hidden sm:flex items-center justify-center flex-1 px-4">
                <Sparkline
                  history={sensor.history}
                  status={status}
                  minNormal={sensor.minNormal}
                  maxNormal={sensor.maxNormal}
                />
              </div>

              <div className="flex items-center gap-2 text-right shrink-0">
                <div className="flex flex-col items-end justify-center min-w-[70px]">
                  <span className={`text-[11px] tracking-tight font-semibold whitespace-nowrap tabular-nums ${valueColor}`}>
                    {sensor.value.toLocaleString()}
                    <span className="text-[8px] text-[#9CA3AF]/50 font-normal ml-0.5 uppercase">
                      {sensor.unit}
                    </span>
                  </span>
                  {(status === 'warning' || status === 'danger') && (
                    <span className={`text-[7px] uppercase tracking-wider ${statusColor} flex items-center gap-1 mt-0.5`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        status === 'danger'
                          ? 'bg-danger animate-glow-danger'
                          : 'bg-warning animate-glow-warning'
                      }`} />
                      {statusText}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
