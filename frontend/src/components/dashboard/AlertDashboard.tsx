'use client';

/**
 * AlertDashboard.tsx - Panel de alertas en tiempo real
 * Madrid Transit Pulse: Frontend
 *
 * Renderiza la lista dinámica de anomalías detectadas por Spark.
 * Se actualiza en tiempo real a través del hook useTransitData (Socket.io).
 *
 * Incluye:
 *   - Filtros por severidad y fuente (EMT/RENFE)
 *   - Badge animado para alertas nuevas
 *   - Tarjetas con información detallada por alerta
 *   - Paginación virtual (las más recientes primero)
 */

import { useState, useMemo } from 'react';
import { TransitAlert, Severity, DataSource } from '@/types/transit';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

// ============================================================
// Props
// ============================================================

interface AlertDashboardProps {
  alertas:         TransitAlert[];
  conectado:       boolean;
  ultimaActualizacion: Date | null;
  onVehiculoClick?: (vehicleId: string) => void;
}

// ============================================================
// Configuración visual por severidad
// ============================================================

const CONFIG_SEVERIDAD: Record<Severity, { label: string; clase: string; emoji: string }> = {
  ALTA:  { label: 'Alta',  clase: 'mtp-badge-alta',  emoji: '🔴' },
  MEDIA: { label: 'Media', clase: 'mtp-badge-media', emoji: '🟠' },
  BAJA:  { label: 'Baja',  clase: 'mtp-badge-baja',  emoji: '🟡' },
};

const CONFIG_TIPO_ALERTA: Record<string, string> = {
  posible_retraso_grave:  'Posible retraso grave',
  servicio_interrumpido:  'Servicio interrumpido',
  anomalia_ruta:          'Anomalía en ruta',
};

// ============================================================
// Subcomponente: Tarjeta de alerta individual
// ============================================================

interface AlertCardProps {
  alerta:          TransitAlert;
  esNueva:         boolean;
  onClick:         () => void;
}

const AlertCard = ({ alerta, esNueva, onClick }: AlertCardProps) => {
  const configSev = CONFIG_SEVERIDAD[alerta.severity] || CONFIG_SEVERIDAD.BAJA;

  return (
    <article
      className={clsx('mtp-alert-card', {
        'mtp-alert-card--new':  esNueva,
        'mtp-alert-card--alta': alerta.severity === 'ALTA',
      })}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Alerta en línea ${alerta.lineId}: ${CONFIG_TIPO_ALERTA[alerta.alertType] || alerta.alertType}`}
    >
      {/* Borde lateral de color por severidad */}
      <div className={clsx('mtp-alert-card__severity-bar', configSev.clase)} />

      <div className="mtp-alert-card__body">
        {/* Fila 1: línea + fuente + severidad */}
        <div className="mtp-alert-card__row-top">
          <div className="mtp-alert-card__line-info">
            <span className="mtp-alert-card__source-icon">
              🚆
            </span>
            <span className="mtp-alert-card__line-id">Línea {alerta.lineId}</span>
            {alerta.lineName && (
              <span className="mtp-alert-card__line-name">{alerta.lineName}</span>
            )}
          </div>

          <div className="mtp-alert-card__badges">
            {esNueva && <span className="mtp-badge-nuevo">NUEVO</span>}
            <span className={clsx('mtp-severity-badge', configSev.clase)}>
              {configSev.emoji} {configSev.label}
            </span>
          </div>
        </div>

        {/* Fila 2: tipo de alerta */}
        <p className="mtp-alert-card__type">
          {CONFIG_TIPO_ALERTA[alerta.alertType] || alerta.alertType}
        </p>

        {/* Fila 3: descripción */}
        {alerta.description && (
          <p className="mtp-alert-card__description">{alerta.description}</p>
        )}

        {/* Fila 4: métricas */}
        <div className="mtp-alert-card__metrics">
          {alerta.delaySeconds !== undefined && (
            <span className="mtp-metric">
              ⏱ +{Math.floor(alerta.delaySeconds / 60)}m {alerta.delaySeconds % 60}s
            </span>
          )}

          <span className="mtp-metric mtp-metric--vehicle">
            🆔 {alerta.vehicleId}
          </span>
        </div>

        {/* Fila 5: timestamp */}
        <time
          className="mtp-alert-card__time"
          dateTime={alerta.detectedAt}
          title={new Date(alerta.detectedAt).toLocaleString('es-ES')}
        >
          {formatDistanceToNow(new Date(alerta.detectedAt), {
            addSuffix: true,
            locale: es,
          })}
        </time>
      </div>
    </article>
  );
};

// ============================================================
// Componente Principal: AlertDashboard
// ============================================================

const ALERTAS_POR_PAGINA = 15;

export default function AlertDashboard({
  alertas,
  conectado,
  ultimaActualizacion,
  onVehiculoClick,
}: AlertDashboardProps) {

  // ---- Filtros de usuario ----
  const [filtroSeveridad, setFiltroSeveridad] = useState<Severity | 'TODAS'>('TODAS');
  const [filtroFuente,    setFiltroFuente]    = useState<DataSource | 'TODAS'>('TODAS');
  const [pagina,          setPagina]          = useState(1);

  // IDs de las últimas 5 alertas recibidas (para efecto "NUEVO")
  const idsNuevas = useMemo(() => {
    return new Set(alertas.slice(0, 5).map(a => a._id));
  }, [alertas]);

  // Alertas filtradas según la selección del usuario
  const alertasFiltradas = useMemo(() => {
    return alertas.filter(alerta => {
      if (filtroSeveridad !== 'TODAS' && alerta.severity !== filtroSeveridad) return false;
      if (filtroFuente    !== 'TODAS' && alerta.source   !== filtroFuente)    return false;
      return true;
    });
  }, [alertas, filtroSeveridad, filtroFuente]);

  // Paginación
  const totalPaginas     = Math.ceil(alertasFiltradas.length / ALERTAS_POR_PAGINA);
  const alertasPaginadas = alertasFiltradas.slice(
    (pagina - 1) * ALERTAS_POR_PAGINA,
    pagina * ALERTAS_POR_PAGINA
  );

  // Reset de página al cambiar filtros
  const cambiarFiltroSeveridad = (s: Severity | 'TODAS') => {
    setFiltroSeveridad(s);
    setPagina(1);
  };
  const cambiarFiltroFuente = (f: DataSource | 'TODAS') => {
    setFiltroFuente(f);
    setPagina(1);
  };

  // Conteos para los badges de los filtros
  const conteoPorSeveridad = useMemo(() => {
    const conteo: Record<string, number> = { ALTA: 0, MEDIA: 0, BAJA: 0 };
    alertas.forEach(a => { conteo[a.severity] = (conteo[a.severity] || 0) + 1; });
    return conteo;
  }, [alertas]);

  return (
    <section className="mtp-alert-dashboard" aria-label="Panel de alertas en tiempo real">

      {/* ---- Cabecera ---- */}
      <header className="mtp-dashboard-header">
        <div className="mtp-dashboard-title-row">
          <h2 className="mtp-dashboard-title">
            <span className="mtp-title-icon">⚠️</span>
            Alertas en Tiempo Real
          </h2>

          {/* Indicador de conexión WebSocket */}
          <div className={clsx('mtp-ws-indicator', { 'mtp-ws-indicator--on': conectado })}>
            <span className="mtp-ws-dot" />
            <span>{conectado ? 'En vivo' : 'Reconectando...'}</span>
          </div>
        </div>

        {/* Última actualización */}
        {ultimaActualizacion && (
          <p className="mtp-last-update">
            Última actualización:{' '}
            {formatDistanceToNow(ultimaActualizacion, { addSuffix: true, locale: es })}
          </p>
        )}

        {/* Resumen rápido */}
        <div className="mtp-severity-summary">
          {(['ALTA', 'MEDIA', 'BAJA'] as Severity[]).map(sev => (
            <div key={sev} className={clsx('mtp-sev-pill', `mtp-sev-pill--${sev.toLowerCase()}`)}>
              <span>{CONFIG_SEVERIDAD[sev].emoji}</span>
              <span>{conteoPorSeveridad[sev] ?? 0}</span>
              <span>{CONFIG_SEVERIDAD[sev].label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ---- Filtros ---- */}
      <div className="mtp-filters" role="group" aria-label="Filtros de alertas">
        {/* Filtro severidad */}
        <div className="mtp-filter-group">
          <label className="mtp-filter-label">Severidad</label>
          <div className="mtp-filter-buttons">
            {(['TODAS', 'ALTA', 'MEDIA', 'BAJA'] as const).map(sev => (
              <button
                key={sev}
                className={clsx('mtp-filter-btn', {
                  'mtp-filter-btn--active': filtroSeveridad === sev,
                })}
                onClick={() => cambiarFiltroSeveridad(sev)}
              >
                {sev === 'TODAS' ? 'Todas' : `${CONFIG_SEVERIDAD[sev].emoji} ${sev}`}
                {sev !== 'TODAS' && conteoPorSeveridad[sev] > 0 && (
                  <span className="mtp-filter-count">{conteoPorSeveridad[sev]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro fuente */}
        <div className="mtp-filter-group">
          <label className="mtp-filter-label">Fuente</label>
          <div className="mtp-filter-buttons">
            {(['TODAS', 'RENFE'] as const).map(fuente => (
              <button
                key={fuente}
                className={clsx('mtp-filter-btn', {
                  'mtp-filter-btn--active': filtroFuente === fuente,
                })}
                onClick={() => cambiarFiltroFuente(fuente)}
              >
                {fuente === 'TODAS' ? 'Todas' : '🚆 Renfe'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Lista de alertas ---- */}
      <div className="mtp-alerts-list" aria-live="polite" aria-atomic="false">
        {alertasPaginadas.length === 0 ? (
          <div className="mtp-empty-state">
            <span className="mtp-empty-icon">✅</span>
            <p className="mtp-empty-title">Sin alertas activas</p>
            <p className="mtp-empty-subtitle">
              {conectado
                ? 'El sistema está monitorizando. Las anomalías aparecerán aquí.'
                : 'Conectando con el servidor...'}
            </p>
          </div>
        ) : (
          alertasPaginadas.map(alerta => (
            <AlertCard
              key={alerta._id}
              alerta={alerta}
              esNueva={idsNuevas.has(alerta._id)}
              onClick={() => onVehiculoClick?.(alerta.vehicleId)}
            />
          ))
        )}
      </div>

      {/* ---- Paginación ---- */}
      {totalPaginas > 1 && (
        <nav className="mtp-pagination" aria-label="Paginación de alertas">
          <button
            className="mtp-page-btn"
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
          >
            ← Anterior
          </button>
          <span className="mtp-page-info">
            {pagina} / {totalPaginas}
          </span>
          <button
            className="mtp-page-btn"
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
          >
            Siguiente →
          </button>
        </nav>
      )}

      {/* ---- Total ---- */}
      <footer className="mtp-dashboard-footer">
        {alertasFiltradas.length} alerta{alertasFiltradas.length !== 1 ? 's' : ''} encontrada{alertasFiltradas.length !== 1 ? 's' : ''}
        {alertasFiltradas.length !== alertas.length && ` (de ${alertas.length} totales)`}
      </footer>
    </section>
  );
}
