'use client';

import { VehicleData, TransitAlert, SystemStats } from '@/types/transit';
import { useMemo } from 'react';
import { Train, AlertTriangle, Zap, Activity, Clock } from 'lucide-react';

interface KpiBarProps {
  vehiculos: VehicleData[];
  alertas: TransitAlert[];
  stats: SystemStats | null;
  conectado: boolean;
  lineFilter: string;
}

export default function KpiBar({ vehiculos, alertas, stats, conectado, lineFilter }: KpiBarProps) {
  const filtered = lineFilter === 'ALL' ? vehiculos : vehiculos.filter(v => v.lineId === lineFilter);
  const filteredAlerts = lineFilter === 'ALL' ? alertas : alertas.filter(a => a.lineId === lineFilter);

  const enRuta = filtered.filter(v => v.vehicleStatus === 'EN_RUTA').length;
  const conAlerta = filtered.filter(v => v.tieneAlerta).length;
  const pctEnRuta = filtered.length > 0 ? ((enRuta / filtered.length) * 100).toFixed(0) : '0';
  const avgSpeed = useMemo(() => {
    const speeds = filtered.filter(v => v.speedKmh != null && v.speedKmh > 0).map(v => v.speedKmh!);
    return speeds.length > 0 ? (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1) : '—';
  }, [filtered]);

  const kpis = [
    {
      label: 'Trenes monitorizados',
      value: filtered.length,
      sub: lineFilter === 'ALL' ? 'Todas las líneas' : `Línea ${lineFilter}`,
      icon: Train,
      accent: '#2563eb',
    },
    {
      label: 'Incidencias activas',
      value: filteredAlerts.length,
      sub: `${filteredAlerts.filter(a => a.severity === 'ALTA').length} alta severidad`,
      icon: AlertTriangle,
      accent: filteredAlerts.length > 10 ? '#dc2626' : filteredAlerts.length > 5 ? '#d97706' : '#16a34a',
    },
    {
      label: 'En ruta',
      value: `${pctEnRuta}%`,
      sub: `${enRuta} de ${filtered.length} trenes`,
      icon: Activity,
      accent: parseInt(pctEnRuta) > 70 ? '#16a34a' : '#d97706',
    },
    {
      label: 'Velocidad media',
      value: avgSpeed !== '—' ? `${avgSpeed}` : '—',
      sub: avgSpeed !== '—' ? 'km/h en circulación' : 'Sin datos',
      icon: Zap,
      accent: '#7c3aed',
    },
    {
      label: 'Conexión',
      value: conectado ? 'EN VIVO' : 'OFFLINE',
      sub: conectado ? 'Telemetría activa' : 'Reconectando...',
      icon: Clock,
      accent: conectado ? '#16a34a' : '#dc2626',
    },
  ];

  return (
    <div className="kpi-bar">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon;
        return (
          <div key={i} className="kpi-card" style={{ ['--kpi-accent' as any]: kpi.accent }}>
            <div className="kpi-card__icon"><Icon size={24} /></div>
            <div className="kpi-card__label">{kpi.label}</div>
            <div className="kpi-card__value" style={{ color: kpi.accent, fontSize: typeof kpi.value === 'string' && kpi.value.length > 5 ? '1.4rem' : '2rem' }}>
              {kpi.value}
            </div>
            <div className="kpi-card__sub">{kpi.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
