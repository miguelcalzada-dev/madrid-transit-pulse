'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { VehicleData, TransitAlert } from '@/types/transit';
import { useMemo } from 'react';

const LINE_COLORS: Record<string, string> = {
  C1: '#e8614c', C2: '#4d9bd9', C3: '#f39c27', C4: '#6db33f',
  C5: '#9b59b6', C7: '#e74c3c', C8: '#1abc9c', C9: '#7f8c8d', C10: '#2980b9',
};

const LINE_ORDER = ['C1', 'C2', 'C3', 'C4', 'C5', 'C7', 'C8', 'C9', 'C10'];

interface LineBarChartProps {
  vehiculos: VehicleData[];
  alertas: TransitAlert[];
  activeFilter: string;
  onLineClick: (lineId: string) => void;
}

export default function LineBarChart({ vehiculos, alertas, activeFilter, onLineClick }: LineBarChartProps) {
  // Trenes por línea
  const trenesPorLinea = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of vehiculos) {
      counts[v.lineId] = (counts[v.lineId] || 0) + 1;
    }
    return LINE_ORDER
      .filter(l => counts[l] !== undefined)
      .map(l => ({ linea: l, trenes: counts[l] || 0, color: LINE_COLORS[l] || '#64748b' }));
  }, [vehiculos]);

  // Velocidad media por línea
  const velocidadPorLinea = useMemo(() => {
    const sums: Record<string, { total: number; count: number }> = {};
    for (const v of vehiculos) {
      if (v.speedKmh != null) {
        if (!sums[v.lineId]) sums[v.lineId] = { total: 0, count: 0 };
        sums[v.lineId].total += v.speedKmh;
        sums[v.lineId].count += 1;
      }
    }
    return LINE_ORDER
      .filter(l => sums[l])
      .map(l => ({ linea: l, velocidad: Math.round(sums[l].total / sums[l].count), color: LINE_COLORS[l] || '#64748b' }));
  }, [vehiculos]);

  // Alertas por línea (Excluyendo 'CERCANIAS')
  const alertasPorLinea = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of alertas) {
      if (a.lineId === 'CERCANIAS') continue; // EXCLUIR CERCANIAS
      counts[a.lineId] = (counts[a.lineId] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 9)
      .map(([linea, count]) => ({ linea, count, color: LINE_COLORS[linea] || '#dc2626' }));
  }, [alertas]);

  const tooltipStyle = {
    contentStyle: {
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.07)', fontSize: '0.72rem', color: '#0f172a',
    },
    labelStyle: { color: '#475569', fontWeight: 600, marginBottom: '0.2rem' },
    cursor: { fill: '#f8fafc' },
  };

  return (
    <div className="dashboard-grid-3col">
      {/* Trenes por línea */}
      <div className="chart-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="chart-card__header">
          <div className="chart-card__title">🚆 Trenes activos por línea</div>
          <span className="chart-card__badge">En tiempo real</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trenesPorLinea} margin={{ top: 12, right: 8, left: -20, bottom: 4 }}
            onClick={(d: any) => d?.activePayload && onLineClick(d.activePayload[0]?.payload?.linea)}>
            <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="linea" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} trenes`, 'Activos']} />
            <Bar dataKey="trenes" radius={[4, 4, 0, 0]} cursor="pointer">
              {trenesPorLinea.map(d => (
                <Cell key={d.linea}
                  fill={d.linea === activeFilter ? d.color : `${d.color}90`}
                  stroke={d.linea === activeFilter ? d.color : 'transparent'}
                  strokeWidth={2}
                />
              ))}
              <LabelList dataKey="trenes" position="top" style={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center', marginTop: 'auto', paddingTop: '0.5rem' }}>
          Clic en una barra para filtrar · Total: {vehiculos.length} trenes
        </div>
      </div>

      {/* Velocidad media por línea */}
      <div className="chart-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="chart-card__header">
          <div className="chart-card__title">⚡ Velocidad media por línea</div>
          <span className="chart-card__badge">km/h promedio</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={velocidadPorLinea} margin={{ top: 12, right: 8, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="linea" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} km/h`, 'Velocidad media']} />
              <Bar dataKey="velocidad" radius={[4, 4, 0, 0]}>
                {velocidadPorLinea.map(d => (
                  <Cell key={d.linea} fill={d.color} fillOpacity={0.75} />
                ))}
                <LabelList dataKey="velocidad" position="top" style={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} formatter={(v: any) => `${v}`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alertas por línea */}
      <div className="chart-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="chart-card__header">
          <div className="chart-card__title">⚠️ Incidencias por línea</div>
          <span className="chart-card__badge">
            {alertasPorLinea.reduce((acc, curr) => acc + curr.count, 0)} específicas
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {alertasPorLinea.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={alertasPorLinea} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="linea" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} incidencias`, 'Alertas']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                  {alertasPorLinea.map(d => (
                    <Cell key={d.linea} fill={d.color} fillOpacity={0.8} />
                  ))}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem' }}>✅</div>
                Líneas operativas
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
