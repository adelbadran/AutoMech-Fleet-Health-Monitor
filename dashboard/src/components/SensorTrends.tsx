import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Gauge,
  Zap,
  Thermometer,
  Droplet,
  Activity,
  Battery,
  type LucideIcon,
} from 'lucide-react';
import { SensorData } from '../types';

interface SensorTrendsProps {
  sensors: Record<string, SensorData>;
  tickLabels?: string[];
}

const TREND_SERIES: { id: string; label: string; color: string; icon: LucideIcon }[] = [
  { id: 'rpm', label: 'Engine RPM', color: '#5AC8FA', icon: Gauge },
  { id: 'speed', label: 'Vehicle Speed', color: '#30D158', icon: Zap },
  { id: 'coolant_temp', label: 'Coolant Temp', color: '#FFB020', icon: Thermometer },
  { id: 'oil_pressure', label: 'Oil Pressure', color: '#BF5AF2', icon: Droplet },
  { id: 'vibration_z', label: 'Vibration Z', color: '#FF453A', icon: Activity },
  { id: 'battery_voltage', label: 'Battery V', color: '#64D2FF', icon: Battery },
];

export default function SensorTrends({ sensors, tickLabels }: SensorTrendsProps) {
  const [visible, setVisible] = useState<Set<string>>(
    () => new Set(TREND_SERIES.map((s) => s.id)),
  );

  const chartData = useMemo(() => {
    const maxLen = Math.max(...TREND_SERIES.map((s) => sensors[s.id]?.history.length || 0), 1);
    return Array.from({ length: maxLen }, (_, i) => {
      const point: Record<string, string | number> = {
        t: tickLabels?.[i] ?? `${i + 1}`,
      };
      TREND_SERIES.forEach((s) => {
        const hist = sensors[s.id]?.history ?? [];
        point[s.id] = hist[i] ?? hist[hist.length - 1] ?? 0;
      });
      return point;
    });
  }, [sensors, tickLabels]);

  const toggle = (id: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          <h3 className="font-display font-medium text-sm text-white uppercase tracking-wider">
            Live Sensor Trends
          </h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TREND_SERIES.map((s) => {
            const SeriesIcon = s.icon;
            return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`px-2 py-1 rounded-lg text-[9px] uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1 ${
                visible.has(s.id)
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-white/10 text-white/40 hover:text-white/70'
              }`}
            >
              <SeriesIcon className="w-3 h-3" strokeWidth={1.75} />
              {s.label}
            </button>
            );
          })}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" stroke="rgba(255,255,255,0.15)" tick={{ fill: '#9CA3AF', fontSize: 9 }} />
            <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fill: '#9CA3AF', fontSize: 9 }} width={40} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(20,20,20,0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontFamily: 'Michroma, system-ui, sans-serif',
                fontSize: '10px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Michroma, system-ui, sans-serif' }} />
            {TREND_SERIES.filter((s) => visible.has(s.id)).map((s) => (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.id}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
