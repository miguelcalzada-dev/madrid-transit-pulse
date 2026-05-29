'use client';

/**
 * StatsPanel.tsx - Panel de KPIs del sistema de transporte
 * Madrid Transit Pulse: Frontend
 *
 * Muestra métricas de resumen en tarjetas animadas:
 * - Total de vehículos monitorizados
 * - Vehículos con alerta activa
 * - Distribución por severidad
 * - Distribución EMT vs RENFE
 */

import clsx from 'clsx';
import { SystemStats } from '@/types/transit';

interface StatsPanelProps {
  stats: SystemStats | null;
  conectado: boolean;
}

interface KPICardProps {
  titulo:    string;
  valor:     string | number;
  subtitulo?: string;
  emoji:     string;
  variante?: 'normal' | 'alerta' | 'ok' | 'warning';
  cargando?: boolean;
}

const KPICard = ({ titulo, valor, subtitulo, emoji, variante = 'normal', cargando }: KPICardProps) => (
  <div className={clsx('mtp-kpi-card', `mtp-kpi-card--${variante}`)}>
    <div className="mtp-kpi-emoji">{emoji}</div>
    <div className="mtp-kpi-body">
      <h3 className="mtp-kpi-titulo">{titulo}</h3>
      {cargando ? (
        <div className="mtp-kpi-skeleton" />
      ) : (
        <p className="mtp-kpi-valor">{valor}</p>
      )}
      {subtitulo && <p className="mtp-kpi-subtitulo">{subtitulo}</p>}
    </div>
  </div>
);

export default function StatsPanel({ stats, conectado }: StatsPanelProps) {
  const cargando = !stats;

  const porcentajeAlerta = stats
    ? stats.totalVehiculos > 0
      ? ((stats.vehiculosConAlerta / stats.totalVehiculos) * 100).toFixed(1)
      : '0.0'
    : '–';

  const varianteAlerta = stats
    ? parseFloat(porcentajeAlerta) > 20 ? 'alerta'
    : parseFloat(porcentajeAlerta) > 10 ? 'warning' : 'ok'
    : 'normal';

  return (
    <div className="mtp-stats-panel">
      <KPICard
        emoji="🚍"
        titulo="Vehículos Activos"
        valor={cargando ? '–' : stats!.totalVehiculos}
        subtitulo="En tiempo real"
        cargando={cargando}
      />
      <KPICard
        emoji="⚠️"
        titulo="Con Alerta"
        valor={cargando ? '–' : `${stats!.vehiculosConAlerta} (${porcentajeAlerta}%)`}
        subtitulo="Anomalías detectadas"
        variante={varianteAlerta}
        cargando={cargando}
      />
      <KPICard
        emoji="🔴"
        titulo="Severidad Alta"
        valor={cargando ? '–' : stats!.alertasPorSeveridad.ALTA}
        subtitulo="Requieren atención inmediata"
        variante={stats && stats.alertasPorSeveridad.ALTA > 0 ? 'alerta' : 'normal'}
        cargando={cargando}
      />
      <KPICard
        emoji="🟠"
        titulo="Severidad Media"
        valor={cargando ? '–' : stats!.alertasPorSeveridad.MEDIA}
        subtitulo="En seguimiento"
        variante="warning"
        cargando={cargando}
      />
      {stats?.distribucionFuente && (
        <KPICard
          emoji="🚆"
          titulo="Alertas Renfe"
          valor={stats.distribucionFuente.RENFE || 0}
          subtitulo="Cercanías"
          cargando={cargando}
        />
      )}
    </div>
  );
}
