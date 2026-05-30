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
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
      fontSize: '0.72rem',
      color: '#0f172a',
    },
    labelStyle: { color: '#64748b', fontWeight: 600, fontSize: '0.65rem', marginBottom: '0.2rem' },
    cursor: { stroke: '#e2e8f0', strokeWidth: 1 },
  };

  return (
    <div className="chart-card" style={{ height: '100%' }}>
      <div className="chart-card__header">
        <div className="chart-card__title">📈 Actividad en tiempo real</div>
        <span className="chart-card__badge">Últimos 100 ciclos</span>
      </div>

      {history.length < 2 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, flexDirection: 'column', gap: '0.5rem' }}>
          <div className="mtp-map-loading-spinner" />
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Acumulando datos...</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={history} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTrenes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradAlertas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#dc2626" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip {...tooltipStyle} />
            <Legend
              wrapperStyle={{ fontSize: '0.68rem', color: '#475569', paddingTop: '0.5rem' }}
              formatter={(value) => value === 'trenes' ? 'Trenes activos' : 'Alertas activas'}
            />
            <Area
              type="monotone"
              dataKey="trenes"
              name="trenes"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#gradTrenes)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#2563eb' }}
            />
            <Area
              type="monotone"
              dataKey="alertas"
              name="alertas"
              stroke="#dc2626"
              strokeWidth={2}
              fill="url(#gradAlertas)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#dc2626' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
