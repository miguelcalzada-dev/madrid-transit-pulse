'use client';

import { useTransitData } from '@/hooks/useTransitData';
import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Filter } from 'lucide-react';

const LINE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  C1:  { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
  C2:  { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' },
  C3:  { bg: '#fff7ed', text: '#c2410c', border: '#fdba74' },
  C4:  { bg: '#f0fdf4', text: '#15803d', border: '#86efac' },
  C5:  { bg: '#faf5ff', text: '#7e22ce', border: '#d8b4fe' },
  C7:  { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  C8:  { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
  C9:  { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' },
  C10: { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
  CERCANIAS: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
};

const SEV_CONFIG = {
  ALTA:  { label: 'Alta',  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  MEDIA: { label: 'Media', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  BAJA:  { label: 'Baja',  color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
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
    const list = Array.from(s).filter(l => l && l !== 'CERCANIAS').sort();
    const finalLines = ['TODAS', ...list];
    if (s.has('CERCANIAS')) finalLines.push('CERCANIAS');
    return finalLines;
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
    // Ordenar: primero líneas específicas, luego CERCANIAS; dentro de cada grupo: ALTA primero
    const order = Object.entries(groups).sort(([a], [b]) => {
      if (a === 'CERCANIAS') return 1;
      if (b === 'CERCANIAS') return -1;
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
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
            Incidencias en Tiempo Real
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Alertas oficiales de Renfe Cercanías Madrid · {alertas.length} incidencias activas
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {lastUpdate && <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Actualizado {lastUpdate}</span>}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.6rem',
            borderRadius: 999, background: conectado ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${conectado ? '#bbf7d0' : '#fecaca'}`,
            fontSize: '0.65rem', fontWeight: 700, color: conectado ? '#15803d' : '#dc2626',
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
            {conectado ? 'EN VIVO' : 'OFFLINE'}
          </div>
        </div>
      </div>

      {/* Resumen severidades */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.2rem' }}>
        {(Object.entries(SEV_CONFIG) as [keyof typeof SEV_CONFIG, typeof SEV_CONFIG[keyof typeof SEV_CONFIG]][]).map(([key, cfg]) => (
          <div key={key} style={{
            flex: '1 1 calc(50% - 0.75rem)', minWidth: 120, padding: '0.8rem 1rem', borderRadius: 10,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            borderLeft: `4px solid ${cfg.color}`,
          }}>
            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Severidad {cfg.label}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1, marginTop: '0.2rem' }}>
              {cntSev[key]}
            </div>
            <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '0.15rem' }}>incidencias</div>
          </div>
        ))}
        <div style={{
          flex: '1 1 calc(50% - 0.75rem)', minWidth: 120, padding: '0.8rem 1rem', borderRadius: 10,
          background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb',
        }}>
          <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total incidencias
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1, marginTop: '0.2rem' }}>
            {alertas.length}
          </div>
          <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '0.15rem' }}>alertas en vivo</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Filter size={12} color="#64748b" />
          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Filtros:</span>
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
                {l === 'TODAS' ? '🚆 Todas las líneas' : l}
              </button>
            );
          })}
        </div>

        <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />

        {/* Severidad */}
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {(['TODAS', 'ALTA', 'MEDIA', 'BAJA'] as const).map(s => (
            <button key={s} className={`filter-chip ${sevFilter === s ? 'filter-chip--active' : ''}`} onClick={() => setSevFilter(s)}>
              {s === 'TODAS' ? 'Todas' : (
                <>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: SEV_CONFIG[s]?.color, display: 'inline-block' }} />
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
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
          <div style={{ fontWeight: 600, color: '#475569' }}>Sin incidencias activas</div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>
            {conectado ? 'El sistema está monitorizando. Las alertas aparecerán aquí.' : 'Conectando con el servidor...'}
          </div>
        </div>
      ) : (
        agrupadas.map(([lineId, listaAlertas]) => {
          const lc = LINE_COLORS[lineId] || LINE_COLORS.CERCANIAS;
          return (
            <div key={lineId} style={{ marginBottom: '1.5rem' }}>
              {/* Cabecera de grupo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                <span className="line-badge" style={{ background: lc.bg, color: lc.text, borderColor: lc.border, fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                  {lineId}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                  {lineId === 'CERCANIAS' ? 'Cercanías Madrid (sin línea específica)' : `Línea ${lineId}`}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: '#f1f5f9', borderRadius: 4, padding: '0.1rem 0.35rem', border: '1px solid #e2e8f0' }}>
                  {listaAlertas.length} incidencia{listaAlertas.length !== 1 ? 's' : ''}
                </span>
                <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
              </div>

              {/* Cards de alertas */}
              {listaAlertas.length === 0 ? (
                <div style={{ padding: '1rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
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
                            <span style={{ fontSize: '0.55rem', fontWeight: 700, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 4, padding: '0.08rem 0.3rem', animation: 'blink 1s infinite' }}>
                              NUEVO
                            </span>
                          )}
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: 5,
                            background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                          }}>
                            ● {sc.label}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>
                            {alerta.alertType === 'incidencia_oficial' ? 'Incidencia oficial' : alerta.alertType}
                          </span>
                        </div>
                        <time style={{ fontSize: '0.6rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {formatDistanceToNow(new Date(alerta.detectedAt), { addSuffix: true, locale: es })}
                        </time>
                      </div>

                      {alerta.description && (
                        <p className="alert-page-card__desc">{alerta.description}</p>
                      )}

                      <div className="alert-page-card__footer">
                        <span>🚆 {alerta.source}</span>
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

      <div style={{ fontSize: '0.6rem', color: '#cbd5e1', textAlign: 'center', padding: '0.75rem 0', borderTop: '1px solid #f1f5f9', marginTop: '0.5rem' }}>
        Madrid Transit Pulse · Fuente: Renfe Cercanías GTFS-RT oficial
      </div>
    </main>
  );
}
