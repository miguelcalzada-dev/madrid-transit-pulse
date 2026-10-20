'use client';

import { useTransitData } from '@/hooks/useTransitData';
import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Filter } from 'lucide-react';
import { LINE_COLORS, getLineColor } from '@/data/lineColors';

const SEV_CONFIG = {
  ALTA:  { label: 'Alta',  color: '#e60000', bg: '#ffe5e5', border: '#111111' },
  MEDIA: { label: 'Media', color: '#b86e00', bg: '#ffeccc', border: '#111111' },
  BAJA:  { label: 'Baja',  color: '#007a3d', bg: '#dff5e7', border: '#111111' },
};

type SevFilter = 'TODAS' | 'ALTA' | 'MEDIA' | 'BAJA';

export default function AlertasPage() {
  const { alertas, conectado, ultimaActualizacion } = useTransitData();
  const [lineFilter, setLineFilter] = useState('TODAS');
  const [sevFilter, setSevFilter] = useState<SevFilter>('TODAS');
  const [search, setSearch] = useState('');

  // Obtener líneas únicas para los filtros (solo las que tienen incidencias)
  const lineas = useMemo(() => {
    const s = new Set(alertas.map(a => a.lineId));
    const list = Array.from(s).filter(Boolean).sort();
    return ['TODAS', ...list];
  }, [alertas]);

  // Filtrar alertas
  const alertasFiltradas = useMemo(() => {
    return alertas.filter(a => {
      if (lineFilter !== 'TODAS' && a.lineId !== lineFilter) return false;
      if (sevFilter !== 'TODAS' && a.severity !== sevFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!a.description?.toLowerCase().includes(q) && !a.lineId.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [alertas, lineFilter, sevFilter, search]);

  // Agrupar por línea
  const agrupadas = useMemo(() => {
    const groups: Record<string, typeof alertas> = {};
    
    // Si se ha forzado un filtro específico (aunque ya no debería poder seleccionarse si está vacío),
    // creamos su grupo para que muestre el mensaje de "0 incidencias".
    if (lineFilter !== 'TODAS') {
      groups[lineFilter] = [];
    }

    for (const a of alertasFiltradas) {
      if (!groups[a.lineId]) groups[a.lineId] = [];
      groups[a.lineId].push(a);
    }
    // Ordenar: alfabéticamente; dentro de cada grupo: ALTA primero
    const order = Object.entries(groups).sort(([a], [b]) => {
      return a.localeCompare(b);
    });
    order.forEach(([, list]) => list.sort((a, b) => {
      const sevOrder = { ALTA: 0, MEDIA: 1, BAJA: 2 };
      return (sevOrder[a.severity] ?? 1) - (sevOrder[b.severity] ?? 1);
    }));
    return order;
  }, [alertasFiltradas]);

  // Conteos por severidad
  const cntSev = useMemo(() => {
    const c = { ALTA: 0, MEDIA: 0, BAJA: 0 };
    alertas.forEach(a => { if (c[a.severity] !== undefined) c[a.severity]++; });
    return c;
  }, [alertas]);

  const lastUpdate = ultimaActualizacion
    ? formatDistanceToNow(ultimaActualizacion, { addSuffix: true, locale: es })
    : null;

  return (
    <main className="analytics-page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            Incidencias en Tiempo Real
          </h1>
          <p className="dashboard-subtitle">
            Alertas oficiales de Renfe Cercanías Madrid · {alertas.length} incidencias activas
          </p>
        </div>
        <div className="dashboard-header__meta">
          {lastUpdate && <span className="mtp-timestamp">Actualizado {lastUpdate}</span>}
          <div className={`mtp-connection-badge ${conectado ? 'mtp-connected' : 'mtp-disconnected'}`}>
            <span className="mtp-connection-dot" />
            {conectado ? 'En vivo' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Resumen severidades */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.4rem' }}>
        {(Object.entries(SEV_CONFIG) as [keyof typeof SEV_CONFIG, typeof SEV_CONFIG[keyof typeof SEV_CONFIG]][]).map(([key, cfg]) => (
          <div key={key} className="mtp-sev-card" style={{ background: cfg.bg, borderLeftColor: cfg.color }}>
            <div className="mtp-sev-card__label" style={{ color: cfg.color }}>
              Severidad {cfg.label}
            </div>
            <div className="mtp-sev-card__value">
              {cntSev[key]}
            </div>
            <div className="mtp-sev-card__sub">incidencias</div>
          </div>
        ))}
        <div className="mtp-sev-card" style={{ borderLeftColor: 'var(--accent-primary)' }}>
          <div className="mtp-sev-card__label" style={{ color: 'var(--accent-primary)' }}>
            Total incidencias
          </div>
          <div className="mtp-sev-card__value">
            {alertas.length}
          </div>
          <div className="mtp-sev-card__sub">alertas en vivo</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Filter size={12} />
          <span className="global-filters__label">Filtros:</span>
        </div>

        {/* Línea */}
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          {lineas.map(l => {
            const lc = l === 'TODAS' ? null : LINE_COLORS[l];
            const active = lineFilter === l;
            return (
              <button key={l}
                className={`filter-chip ${active ? 'filter-chip--active' : ''}`}
                style={!active && lc ? { background: lc.bg, borderColor: lc.border, color: lc.text } : undefined}
                onClick={() => setLineFilter(l)}
              >
                {l === 'TODAS' ? 'Todas las líneas' : l}
              </button>
            );
          })}
        </div>

        <div style={{ width: 2, height: 20, background: '#111111' }} />

        {/* Severidad */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {(['TODAS', 'ALTA', 'MEDIA', 'BAJA'] as const).map(s => (
            <button key={s} className={`filter-chip ${sevFilter === s ? 'filter-chip--active' : ''}`} onClick={() => setSevFilter(s)}>
              {s === 'TODAS' ? 'Todas' : (
                <>
                  <span style={{ width: 6, height: 6, border: '1px solid #111111', background: SEV_CONFIG[s]?.color, display: 'inline-block' }} />
                  {SEV_CONFIG[s]?.label}
                </>
              )}
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <input
          className="train-grid__search"
          style={{ marginLeft: 'auto' }}
          placeholder="Buscar en descripción..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Alertas agrupadas por línea */}
      {agrupadas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>✓</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sin incidencias activas</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', marginTop: '0.4rem', textTransform: 'uppercase' }}>
            {conectado ? 'El sistema está monitorizando. Las alertas aparecerán aquí.' : 'Conectando con el servidor...'}
          </div>
        </div>
      ) : (
        agrupadas.map(([lineId, listaAlertas]) => {
          const lc = getLineColor(lineId);
          return (
            <div key={lineId} style={{ marginBottom: '1.5rem' }}>
              {/* Cabecera de grupo */}
              <div className="alert-group-header">
                <span className="line-badge" style={{ background: lc.bg, color: lc.text, borderColor: '#111111', fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                  {lineId}
                </span>
                <span className="alert-group-header__title">
                  {lineId === 'CERCANIAS' ? 'Cercanías Madrid (sin línea específica)' : `Línea ${lineId}`}
                </span>
                <span className="alert-group-header__count">
                  {listaAlertas.length} incidencia{listaAlertas.length !== 1 ? 's' : ''}
                </span>
                <div style={{ flex: 1, height: 2, background: '#e2dfd8' }} />
              </div>

              {/* Cards de alertas */}
              {listaAlertas.length === 0 ? (
                <div className="mtp-empty-box">
                  No hay incidencias reportadas en esta línea en este momento.
                </div>
              ) : (
                listaAlertas.map(alerta => {
                  const sc = SEV_CONFIG[alerta.severity] || SEV_CONFIG.BAJA;
                  const isNew = Date.now() - new Date(alerta.detectedAt).getTime() < 120000;
                  return (
                    <div key={alerta._id}
                      className={`alert-page-card alert-page-card--${alerta.severity.toLowerCase()}`}
                      style={{ borderLeftColor: sc.color }}
                    >
                      <div className="alert-page-card__header">
                        <div className="alert-page-card__meta">
                          {isNew && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.05em', background: '#ff3e00', color: '#ffffff', border: '2px solid #111111', padding: '0.08rem 0.3rem', animation: 'blink 1s infinite' }}>
                              NUEVO
                            </span>
                          )}
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
                            padding: '0.15rem 0.45rem',
                            background: sc.bg, color: sc.color, border: '2px solid #111111',
                          }}>
                            ● {sc.label}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {alerta.alertType === 'incidencia_oficial' ? 'Incidencia oficial' : alerta.alertType}
                          </span>
                        </div>
                        <time style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                          {formatDistanceToNow(new Date(alerta.detectedAt), { addSuffix: true, locale: es })}
                        </time>
                      </div>

                      {alerta.description && (
                        <p className="alert-page-card__desc">{alerta.description}</p>
                      )}

                      <div className="alert-page-card__footer">
                        <span>{alerta.source}</span>
                        {alerta.vehicleId && <span>ID: {alerta.vehicleId}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })
      )}

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-dim)', textAlign: 'center', padding: '0.85rem 0', borderTop: '2px solid var(--border-main)', marginTop: '0.75rem' }}>
        Madrid Transit Pulse · Fuente: Renfe Cercanías GTFS-RT oficial
      </div>
    </main>
  );
}
