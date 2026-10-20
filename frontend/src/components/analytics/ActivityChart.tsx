'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DataPoint {
  time: string;
  trenes: number;
  alertas: number;
}

interface ActivityChartProps {
  history: DataPoint[];
}

export default function ActivityChart({ history }: ActivityChartProps) {
  const tooltipStyle = {
    contentStyle: {
      background: '#ffffff',
      border: '3px solid #111111',
      borderRadius: 0,
      boxShadow: '4px 4px 0 #111111',
      fontSize: '0.7rem',
      fontFamily: "'Space Mono', monospace",
      color: '#111111',
    },
    labelStyle: { color: '#555555', fontWeight: 700, fontSize: '0.62rem', marginBottom: '0.2rem', textTransform: 'uppercase' as const },
    cursor: { stroke: '#111111', strokeWidth: 1 },
  };

  return (
    <div className="chart-card" style={{ height: '100%' }}>
      <div className="chart-card__header">
        <div className="chart-card__title">Actividad en tiempo real</div>
        <span className="chart-card__badge">Últimos 100 ciclos</span>
      </div>

      {history.length < 2 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, flexDirection: 'column', gap: '0.5rem' }}>
          <div className="mtp-map-loading-spinner" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Acumulando datos...</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={history} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTrenes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ff3e00" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ff3e00" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradAlertas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#111111" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#111111" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="#d8d4cb" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#555555', fontFamily: "'Space Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#555555', fontFamily: "'Space Mono', monospace" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip {...tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: '0.6rem', fontFamily: "'Space Mono', monospace", color: '#333333', paddingTop: '0.5rem', textTransform: 'uppercase' }}
              formatter={(value) => value === 'trenes' ? 'Trenes activos' : 'Alertas activas'}
            />
            <Area
              type="monotone"
              dataKey="trenes"
              name="trenes"
              stroke="#ff3e00"
              strokeWidth={2.5}
              fill="url(#gradTrenes)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 1, stroke: '#111111', fill: '#ff3e00' }}
            />
            <Area
              type="monotone"
              dataKey="alertas"
              name="alertas"
              stroke="#111111"
              strokeWidth={2}
              fill="url(#gradAlertas)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 1, stroke: '#111111', fill: '#ffffff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
