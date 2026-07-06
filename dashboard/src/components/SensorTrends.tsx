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
  embedded?: boolean;
}

const TREND_SERIES: { id: string; label: string; color: string; icon: LucideIcon }[] = [
  { id: 'rpm', label: 'Engine RPM', color: '#00e5ff', icon: Gauge },
  { id: 'speed', label: 'Vehicle Speed', color: '#39ff8c', icon: Zap },
  { id: 'coolant_temp', label: 'Coolant Temp', color: '#ff9f43', icon: Thermometer },
  { id: 'oil_pressure', label: 'Oil Pressure', color: '#b44dff', icon: Droplet },
  { id: 'vibration_z', label: 'Vibration Z', color: '#ff3b5c', icon: Activity },
  { id: 'battery_voltage', label: 'Battery V', color: '#64d2ff', icon: Battery },
];

export default function SensorTrends({ sensors, tickLabels, embedded = false }: SensorTrendsProps) {
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

  const content = (
    <>
      <div className={`flex flex-wrap gap-1.5 ${embedded ? 'mb-4' : 'mb-4 pb-2 border-b border-white/5'}`}>
        {TREND_SERIES.map((s) => {
          const SeriesIcon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`px-2 py-1 rounded-lg text-[9px] uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1 ${
                visible.has(s.id)
                  ? 'border-cyber-cyan/40 bg-cyber-cyan/10 text-cyber-cyan'
                  : 'border-white/10 text-cyber-muted hover:text-white/70'
              }`}
            >
              <SeriesIcon className="w-3 h-3" strokeWidth={1.5} />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="t" stroke="rgba(0,229,255,0.15)" tick={{ fill: '#6b8aad', fontSize: 9 }} />
            <YAxis stroke="rgba(0,229,255,0.15)" tick={{ fill: '#6b8aad', fontSize: 9 }} width={40} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(8, 14, 24, 0.95)',
                border: '1px solid rgba(0, 229, 255, 0.15)',
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
    </>
  );

  if (embedded) return content;

  return (
    <div className="cyber-panel cyber-panel-cyan p-5 space-y-4">
      {content}
    </div>
  );
}
