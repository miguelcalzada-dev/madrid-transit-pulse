'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { VehicleData } from '@/types/transit';
import { useMemo } from 'react';

const STATUS_CONFIG: Record<string, { label: string; color: string; lightColor: string }> = {
  EN_RUTA:           { label: 'En ruta',      color: '#16a34a', lightColor: '#dcfce7' },
  EN_PARADA:         { label: 'En parada',     color: '#d97706', lightColor: '#fef3c7' },
  FUERA_DE_SERVICIO: { label: 'Fuera serv.',   color: '#94a3b8', lightColor: '#f1f5f9' },
  DESCONOCIDO:       { label: 'Desconocido',   color: '#cbd5e1', lightColor: '#f8fafc' },
};

interface StatusDonutProps {
  vehiculos: VehicleData[];
}

export default function StatusDonut({ vehiculos }: StatusDonutProps) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {
      EN_RUTA: 0, EN_PARADA: 0, FUERA_DE_SERVICIO: 0, DESCONOCIDO: 0,
    };
    for (const v of vehiculos) {
      if (counts[v.vehicleStatus] !== undefined) counts[v.vehicleStatus]++;
      else counts.DESCONOCIDO++;
    }
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: STATUS_CONFIG[key]?.label ?? key,
        value,
        color: STATUS_CONFIG[key]?.color ?? '#94a3b8',
        lightColor: STATUS_CONFIG[key]?.lightColor ?? '#f1f5f9',
        pct: vehiculos.length > 0 ? ((value / vehiculos.length) * 100).toFixed(1) : '0.0',
      }));
  }, [vehiculos]);

  const total = vehiculos.length;
  const enRuta = data.find(d => d.name === 'En ruta')?.value ?? 0;
  const pctEnRuta = total > 0 ? ((enRuta / total) * 100).toFixed(1) : '0.0';

  const customTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.72rem', boxShadow: '0 4px 6px rgba(0,0,0,0.07)' }}>
        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.15rem' }}>{d.name}</div>
        <div style={{ color: '#64748b' }}>{d.value} trenes ({d.pct}%)</div>
      </div>
    );
  };

  return (
    <div className="chart-card" style={{ height: '100%' }}>
      <div className="chart-card__header">
        <div className="chart-card__title">📊 Estado de la flota</div>
        <span className="chart-card__badge">{total} trenes</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={customTooltip} />
          </PieChart>
        </ResponsiveContainer>

        {/* Centro del donut — info principal */}
        <div style={{ marginTop: '-100px', marginBottom: '100px', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{pctEnRuta}%</div>
          <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600, marginTop: '0.1rem' }}>EN RUTA</div>
        </div>

        {/* Leyenda manual */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '100%', marginTop: '0.5rem' }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.3rem 0.5rem', borderRadius: 6, background: d.lightColor }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 500 }}>{d.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
                <span style={{ fontSize: '0.6rem', color: '#94a3b8' }}>({d.pct}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
