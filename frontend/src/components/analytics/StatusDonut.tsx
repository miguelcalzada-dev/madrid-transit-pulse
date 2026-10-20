'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { VehicleData } from '@/types/transit';
import { useMemo } from 'react';

const STATUS_CONFIG: Record<string, { label: string; color: string; lightColor: string }> = {
  EN_RUTA:           { label: 'En ruta',      color: '#007a3d', lightColor: '#dff5e7' },
  EN_PARADA:         { label: 'En parada',     color: '#b86e00', lightColor: '#ffeccc' },
  FUERA_DE_SERVICIO: { label: 'Fuera serv.',   color: '#555555', lightColor: '#e2dfd8' },
  DESCONOCIDO:       { label: 'Desconocido',   color: '#8a867d', lightColor: '#f4f3f0' },
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
      <div style={{ background: '#ffffff', border: '3px solid #111111', borderRadius: 0, padding: '0.5rem 0.7rem', fontSize: '0.68rem', fontFamily: "'Space Mono', monospace", boxShadow: '4px 4px 0 #111111' }}>
        <div style={{ fontWeight: 700, color: '#111111', marginBottom: '0.15rem', textTransform: 'uppercase' }}>{d.name}</div>
        <div style={{ color: '#555555' }}>{d.value} trenes ({d.pct}%)</div>
      </div>
    );
  };

  return (
    <div className="chart-card" style={{ height: '100%' }}>
      <div className="chart-card__header">
        <div className="chart-card__title">Estado de la flota</div>
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
              paddingAngle={1}
              dataKey="value"
              stroke="#111111"
              strokeWidth={2}
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
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '1.4rem', fontWeight: 700, color: '#111111', lineHeight: 1 }}>{pctEnRuta}%</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', color: '#555555', fontWeight: 700, letterSpacing: '0.06em', marginTop: '0.15rem' }}>EN RUTA</div>
        </div>

        {/* Leyenda manual */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '100%', marginTop: '0.5rem' }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.28rem 0.45rem', border: '2px solid #111111', background: d.lightColor }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 8, height: 8, border: '1px solid #111111', background: d.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', textTransform: 'uppercase', color: '#333333', fontWeight: 700 }}>{d.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', fontWeight: 700, color: '#111111', fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', color: '#555555' }}>({d.pct}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
