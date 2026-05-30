'use client';

import { useTransitData } from '@/hooks/useTransitData';
import { useEffect, useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import KpiBar from '@/components/analytics/KpiBar';
import LineBarChart from '@/components/analytics/LineBarChart';
import ActivityChart from '@/components/analytics/ActivityChart';
import StatusDonut from '@/components/analytics/StatusDonut';
import TrainDataGrid from '@/components/analytics/TrainDataGrid';
import GlobalFilters from '@/components/analytics/GlobalFilters';

interface HistoryPoint {
  time: string;
  all: { trenes: number; alertas: number };
  byLine: Record<string, { trenes: number; alertas: number }>;
}

export default function DashboardPage() {
  const { alertas: rawAlertas, vehiculos, stats, conectado, ultimaActualizacion, error } = useTransitData();
  const alertas = useMemo(() => rawAlertas, [rawAlertas]);
  const [lineFilter, setLineFilter] = useState('ALL');
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  // Construir historial de actividad
  useEffect(() => {
    if (vehiculos.length === 0) return;
    setHistory(prev => {
      const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const byLine: Record<string, { trenes: number; alertas: number }> = {};
      vehiculos.forEach(v => {
        if (!byLine[v.lineId]) byLine[v.lineId] = { trenes: 0, alertas: 0 };
        byLine[v.lineId].trenes++;
      });
      alertas.forEach(a => {
        if (a.lineId && a.lineId !== 'CERCANIAS') {
          if (!byLine[a.lineId]) byLine[a.lineId] = { trenes: 0, alertas: 0 };
          byLine[a.lineId].alertas++;
        }
      });

      const point: HistoryPoint = { 
        time: now, 
        all: { trenes: vehiculos.length, alertas: alertas.length },
        byLine
      };
      
      const next = [...prev, point];
      return next.length > 100 ? next.slice(-100) : next;
    });
  }, [vehiculos, alertas]);

  // Trenes y alertas filtradas
  const vehiculosFiltrados = useMemo(
    () => lineFilter === 'ALL' ? vehiculos : vehiculos.filter(v => v.lineId === lineFilter),
    [vehiculos, lineFilter]
  );

  const alertasFiltradas = useMemo(
    () => lineFilter === 'ALL' ? alertas : alertas.filter(a => a.lineId === lineFilter),
    [alertas, lineFilter]
  );

  // Counts por línea para los filtros
  const trainsPerLine = useMemo(() => {
    const m: Record<string, number> = {};
    vehiculos.forEach(v => { m[v.lineId] = (m[v.lineId] || 0) + 1; });
    return m;
  }, [vehiculos]);

  const alertsPerLine = useMemo(() => {
    const m: Record<string, number> = {};
    alertas.forEach(a => {
      if (!a.lineId || a.lineId === 'CERCANIAS') return;
      m[a.lineId] = (m[a.lineId] || 0) + 1;
    });
    return m;
  }, [alertas]);

  // Última actualización
  const lastUpdate = ultimaActualizacion
    ? new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(ultimaActualizacion)
    : null;

  return (
    <main className="analytics-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Centro de Control
          </h1>
          <p className="dashboard-subtitle" style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Monitorización en tiempo real — Red Cercanías Madrid
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {lastUpdate && (
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.2rem 0.5rem', borderRadius: 5 }}>
              Actualizado: {lastUpdate}
            </span>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.3rem 0.7rem', borderRadius: '999px',
            background: conectado ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${conectado ? '#bbf7d0' : '#fecaca'}`,
            fontSize: '0.68rem', fontWeight: 700,
            color: conectado ? '#15803d' : '#dc2626',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', animation: 'pulse-dot 2s infinite' }} />
            {conectado ? 'TELEMETRÍA EN VIVO' : 'SIN CONEXIÓN'}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mtp-error-banner" style={{ marginBottom: '1rem', borderRadius: 8 }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* KPI Bar */}
      <KpiBar
        vehiculos={vehiculos}
        alertas={alertas}
        stats={stats}
        conectado={conectado}
        lineFilter={lineFilter}
      />

      {/* Filtros globales */}
      <GlobalFilters
        activeFilter={lineFilter}
        onFilterChange={setLineFilter}
        trainsPerLine={trainsPerLine}
        alertsPerLine={alertsPerLine}
      />

      {/* Primera fila de gráficos — Actividad y Donut */}
      <div className="dashboard-grid-top">
        <ActivityChart history={history.map(h => ({
          time: h.time,
          trenes: lineFilter === 'ALL' ? h.all.trenes : (h.byLine[lineFilter]?.trenes || 0),
          alertas: lineFilter === 'ALL' ? h.all.alertas : (h.byLine[lineFilter]?.alertas || 0)
        }))} />
        
        <StatusDonut vehiculos={vehiculosFiltrados} />
      </div>

      {/* Segunda fila de gráficos — Líneas (Trenes, Velocidad, Incidencias) */}
      <div style={{ marginBottom: '1.2rem' }}>
        <LineBarChart
          vehiculos={vehiculosFiltrados}
          alertas={alertasFiltradas}
          activeFilter={lineFilter}
          onLineClick={(l) => setLineFilter(l === lineFilter ? 'ALL' : l)}
        />
      </div>

      {/* Tabla de trenes */}
      <TrainDataGrid vehiculos={vehiculos} lineFilter={lineFilter} />

      {/* Footer */}
      <div style={{ fontSize: '0.6rem', color: '#cbd5e1', textAlign: 'center', padding: '0.75rem 0', borderTop: '1px solid #f1f5f9', marginTop: '0.5rem' }}>
        Madrid Transit Pulse · Datos: Renfe Cercanías GTFS-RT · Actualización cada 25s
      </div>
    </main>
  );
}
