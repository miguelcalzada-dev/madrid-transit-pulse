'use client';

import { VehicleData, TransitAlert, SystemStats } from '@/types/transit';
import { useMemo } from 'react';
import { Train, AlertTriangle, Activity, Clock } from 'lucide-react';

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

  const kpis = [
    {
      label: 'Trenes monitorizados',
      value: filtered.length,
      sub: lineFilter === 'ALL' ? 'Todas las líneas' : `Línea ${lineFilter}`,
      icon: Train,
      accent: '#ff3e00',
    },
    {
      label: 'Incidencias activas',
      value: filteredAlerts.length,
      sub: `${filteredAlerts.filter(a => a.severity === 'ALTA').length} alta severidad`,
      icon: AlertTriangle,
      accent: filteredAlerts.length > 10 ? '#e60000' : filteredAlerts.length > 5 ? '#b86e00' : '#007a3d',
    },
    {
      label: 'En ruta',
      value: `${pctEnRuta}%`,
      sub: `${enRuta} de ${filtered.length} trenes`,
      icon: Activity,
      accent: parseInt(pctEnRuta) > 70 ? '#007a3d' : '#b86e00',
    },
    {
      label: 'Con retraso',
      value: filtered.filter(v => (v.delaySeconds || 0) > 60).length,
      sub: `${filtered.filter(v => (v.delaySeconds || 0) > 180).length} retrasos graves`,
      icon: Clock,
      accent: '#e60000',
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
