'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { VehicleData, TransitAlert } from '@/types/transit';
import { useMemo } from 'react';
import { LINE_CHART_COLORS, LINE_ORDER } from '@/data/lineColors';

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
      .map(l => ({ linea: l, trenes: counts[l] || 0, color: LINE_CHART_COLORS[l] || '#64748b' }));
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
      .map(([linea, count]) => ({ linea, count, color: LINE_CHART_COLORS[linea] || '#dc2626' }));
  }, [alertas]);

  const tooltipStyle = {
    contentStyle: {
      background: '#ffffff', border: '3px solid #111111', borderRadius: 0,
      boxShadow: '4px 4px 0 #111111', fontSize: '0.7rem', fontFamily: "'Space Mono', monospace", color: '#111111',
    },
    labelStyle: { color: '#555555', fontWeight: 700, marginBottom: '0.2rem', textTransform: 'uppercase' as const },
    cursor: { fill: '#ffe3d9' },
  };

  return (
    <div className="dashboard-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      {/* Trenes por línea */}
      <div className="chart-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="chart-card__header">
          <div className="chart-card__title">Trenes activos por línea</div>
          <span className="chart-card__badge">En tiempo real</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trenesPorLinea} margin={{ top: 12, right: 8, left: -20, bottom: 4 }}
            onClick={(d: any) => d?.activePayload && onLineClick(d.activePayload[0]?.payload?.linea)}>
            <CartesianGrid strokeDasharray="2 4" stroke="#d8d4cb" vertical={false} />
            <XAxis dataKey="linea" tick={{ fontSize: 11, fill: '#111111', fontWeight: 700, fontFamily: "'Space Mono', monospace" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#555555', fontFamily: "'Space Mono', monospace" }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} trenes`, 'Activos']} />
            <Bar dataKey="trenes" radius={[0, 0, 0, 0]} cursor="pointer">
              {trenesPorLinea.map(d => (
                <Cell key={d.linea}
                  fill={d.linea === activeFilter ? d.color : `${d.color}90`}
                  stroke={d.linea === activeFilter ? d.color : 'transparent'}
                  strokeWidth={2}
                />
              ))}
              <LabelList dataKey="trenes" position="top" style={{ fontSize: 10, fill: '#111111', fontWeight: 700, fontFamily: "'Space Mono', monospace" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', textAlign: 'center', marginTop: 'auto', paddingTop: '0.5rem' }}>
          Clic en una barra para filtrar · Total: {vehiculos.length} trenes
        </div>
      </div>


      {/* Alertas por línea */}
      <div className="chart-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="chart-card__header">
          <div className="chart-card__title">Incidencias por línea</div>
          <span className="chart-card__badge">
            {alertasPorLinea.reduce((acc, curr) => acc + curr.count, 0)} específicas
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {alertasPorLinea.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={alertasPorLinea} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#d8d4cb" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#555555', fontFamily: "'Space Mono', monospace" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="linea" tick={{ fontSize: 11, fill: '#111111', fontWeight: 700, fontFamily: "'Space Mono', monospace" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} incidencias`, 'Alertas']} />
                <Bar dataKey="count" radius={[0, 0, 0, 0]} barSize={20}>
                  {alertasPorLinea.map(d => (
                    <Cell key={d.linea} fill={d.color} fillOpacity={1} stroke="#111111" strokeWidth={1} />
                  ))}
                  <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: '#111111', fontWeight: 700, fontFamily: "'Space Mono', monospace" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.62rem', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '1.3rem' }}>✓</div>
                Líneas operativas
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
