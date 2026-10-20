'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTransitData } from '@/hooks/useTransitData';
import {
  ESTACIONES, LINEAS_CERCANIAS, haversineMetros,
  type Estacion, type LineaCercanias,
} from '@/data/estaciones';
import { Star, Search, ChevronDown, ChevronUp, MapPin, Train, Navigation, Clock, Users, X, Locate } from 'lucide-react';

// ── LocalStorage helpers ────────────────────────────────────
const FAV_KEY = 'mtp_favoritos_estaciones';
function getFavoritos(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
}
function toggleFavorito(id: string): string[] {
  if (typeof window === 'undefined') return [];
  const favs = getFavoritos();
  const idx = favs.indexOf(id);
  const next = idx >= 0 ? favs.filter(f => f !== id) : [...favs, id];
  localStorage.setItem(FAV_KEY, JSON.stringify(next));
  return next;
}

// ── Sub-component: Píldora de línea ─────────────────────────
function LineaBadge({ lineaId }: { lineaId: string }) {
  const lc = LINEAS_CERCANIAS.find(l => l.id === lineaId)?.color ?? { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0.1rem 0.42rem',
      background: lc.bg, color: lc.text, border: '2px solid #111111',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.03em', flexShrink: 0,
    }}>
      {lineaId}
    </span>
  );
}

function HorarioProgramado({ horario }: { horario: { lineId: string, destino: string, sentido: string, scheduledTime: number, realTime: number, retrasoMinutos: number, estado: string } }) {
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    setAhora(Date.now());
    const iv = setInterval(() => setAhora(Date.now()), 10000);
    return () => clearInterval(iv);
  }, []);

  if (ahora === null) return null; // Previene hydration mismatch en SSR

  const faltanMs = horario.realTime - ahora;
  const faltanMinutos = Math.floor(faltanMs / 60000);
  
  const hSched = new Date(horario.scheduledTime);
  const schedStr = hSched.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  
  const hReal = new Date(horario.realTime);
  const realStr = hReal.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const isDelayed = horario.estado === 'RETRASO';

  // Ocultar trenes que ya pasaron hace más de 1 minuto
  if (faltanMs < -60000) return null;

  const displayFaltan = Math.max(0, faltanMinutos);

  return (
    <div className="mtp-time-card">
      <div style={{ minWidth: '66px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '2px solid #111111', paddingRight: '0.75rem' }}>
        <div className="mtp-time-card__eta" style={{ color: displayFaltan === 0 ? 'var(--color-baja)' : (isDelayed ? 'var(--color-alta)' : 'var(--color-baja)') }}>
          {displayFaltan === 0 ? 'Andén' : displayFaltan > 59 ? realStr : `${displayFaltan} min`}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.03em', textTransform: 'uppercase', color: isDelayed ? 'var(--color-alta)' : 'var(--color-baja)', fontWeight: 700, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, background: 'currentColor', border: '1px solid #111111', animation: 'pulse-dot 2s infinite' }} />
          {isDelayed ? `+${horario.retrasoMinutos} min` : 'En hora'}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
          <LineaBadge lineaId={horario.lineId} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#111111', fontWeight: 700, textTransform: 'uppercase' }}>
            {horario.destino}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
          Prog: <span style={{ textDecoration: isDelayed ? 'line-through' : 'none' }}>{schedStr}</span>
          {isDelayed && <span style={{ color: 'var(--color-alta)', fontWeight: 700 }}>{realStr}</span>}
        </div>
      </div>
    </div>
  );
}

// Component removed

// ── Sub-component: Panel de tiempos de una estación ─────────
function EstacionDetalle({ estacion, onClose }: { estacion: Estacion; onClose: () => void }) {
  const [favoritos, setFavoritos] = useState<string[]>(() => getFavoritos());
  const esFavorita = favoritos.includes(estacion.id);

  // The 'trenesRelevantes' estimation block has been removed in favor of the official timetable.

  const [llegadasReales, setLlegadasReales] = useState<{ lineId: string, destino: string, sentido: string, scheduledTime: number, realTime: number, retrasoMinutos: number, estado: string, tripId?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLlegadas = useCallback(async () => {
    try {
      const rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
      const API_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;
      const res = await fetch(`${API_URL}/estaciones/llegadas?estacionId=${encodeURIComponent(estacion.id)}`);
      const data = await res.json();
      if (data.ok) {
        setLlegadasReales(data.llegadas);
      }
    } catch (e) {
      console.error('Error fetching real ETAs', e);
    } finally {
      setLoading(false);
    }
  }, [estacion]);

  // Refrescar desde el server cada 30 segundos
  useEffect(() => {
    fetchLlegadas();
    const iv = setInterval(fetchLlegadas, 30000);
    return () => clearInterval(iv);
  }, [fetchLlegadas]);

  return (
    <div className="mtp-detail-overlay">
      {/* Header */}
      <div className="mtp-detail-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ background: 'var(--accent-primary)', border: '2px solid var(--accent-primary)', padding: '0.4rem', display: 'flex', color: '#111111' }}>
              <MapPin size={20} />
            </span>
            <div>
              <div className="mtp-detail-header__title">{estacion.nombre}</div>
              {estacion.municipio && <div className="mtp-detail-header__sub">{estacion.municipio}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="mtp-icon-btn"
              aria-label={esFavorita ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              onClick={() => setFavoritos(toggleFavorito(estacion.id))}
            >
              <Star size={18} color={esFavorita ? '#ff3e00' : '#111111'} fill={esFavorita ? '#ff3e00' : 'none'} />
            </button>
            <button
              className="mtp-icon-btn"
              aria-label="Cerrar detalle de estación"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {/* Líneas */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {estacion.lineas.map(l => (
            <span key={l} style={{
              padding: '0.18rem 0.55rem',
              background: 'var(--accent-primary)', color: '#111111',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.62rem', fontWeight: 700, border: '2px solid var(--bg-primary)',
            }}>{l}</span>
          ))}
        </div>
      </div>

      {/* Contenido scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>

        {llegadasReales.length === 0 && !loading && (
          <div className="mtp-empty-box">
            No hay trenes acercándose en este momento.
          </div>
        )}

        {/* Flat list sin agrupar por sentido */}
        {llegadasReales.map(v => (
          <HorarioProgramado key={`${v.tripId}-${v.lineId}-${v.realTime}`} horario={v} />
        ))}
      </div>
    </div>
  );
}

// ── Sub-component: Tarjeta de estación ─────────────────────
function EstacionCard({ estacion, favoritos, onSelect, onToggleFav }: {
  estacion: Estacion;
  favoritos: string[];
  onSelect: (e: Estacion) => void;
  onToggleFav: (id: string) => void;
}) {
  const esFav = favoritos.includes(estacion.id);
  return (
    <div
      className="mtp-station-card"
      onClick={() => onSelect(estacion)}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mtp-station-card__name">
          {estacion.nombre}
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {estacion.lineas.map(l => <LineaBadge key={l} lineaId={l} />)}
        </div>
      </div>
      <button
        className="mtp-station-card__fav"
        aria-label={esFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        onClick={e => { e.stopPropagation(); onToggleFav(estacion.id); }}
      >
        <Star size={18} color={esFav ? '#ff3e00' : '#8a867d'} fill={esFav ? '#ff3e00' : 'none'} />
      </button>
    </div>
  );
}

// ── Sub-component: Acordeón de línea ────────────────────────
function LineaAcordeon({ linea, favoritos, onSelect, onToggleFav }: {
  linea: LineaCercanias;
  favoritos: string[];
  onSelect: (e: Estacion) => void;
  onToggleFav: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const estaciones = linea.estacionesOrdenadas
    .map(id => ESTACIONES.find(e => e.id === id))
    .filter(Boolean) as Estacion[];

  return (
    <div className="mtp-line-accordion">
      <button
        className="mtp-line-accordion__head"
        onClick={() => setOpen(!open)}
      >
        <span className="line-badge" style={{
          padding: '0.2rem 0.55rem',
          background: linea.color.text, color: '#ffffff', borderColor: '#111111', flexShrink: 0,
        }}>{linea.id}</span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div className="mtp-line-accordion__title">{linea.extremoA}</div>
          <div className="mtp-line-accordion__sub">→ {linea.extremoB} · {estaciones.length} paradas</div>
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="mtp-line-accordion__body">
          {estaciones.map((est, idx) => (
            <div
              key={est.id}
              className="mtp-line-stop"
              onClick={() => onSelect(est)}
            >
              {/* Timeline line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
                {idx > 0 && <div style={{ width: 2, height: 8, background: linea.color.border, marginBottom: 2 }} />}
                <div style={{ width: 10, height: 10, background: linea.color.text, border: '2px solid #111111' }} />
                {idx < estaciones.length - 1 && <div style={{ width: 2, height: 8, background: linea.color.border, marginTop: 2 }} />}
              </div>
              <span className="mtp-line-stop__name">{est.nombre}</span>
              <button
                aria-label={favoritos.includes(est.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                onClick={e => { e.stopPropagation(); onToggleFav(est.id); }}
                style={{ background: 'none', border: 'none', padding: '0.1rem', display: 'flex' }}
              >
                <Star size={14} color={favoritos.includes(est.id) ? '#ff3e00' : '#c9c5bc'} fill={favoritos.includes(est.id) ? '#ff3e00' : 'none'} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────
export default function EstacionesPage() {
  const { vehiculos, conectado } = useTransitData();
  const [query, setQuery] = useState('');
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [estacionSeleccionada, setEstacionSeleccionada] = useState<Estacion | null>(null);
  const [activeTab, setActiveTab] = useState<'buscar' | 'lineas'>('buscar');
  const [cercanas, setCercanas] = useState<{ estacion: Estacion; distancia: number }[]>([]);
  const [loadingCercanas, setLoadingCercanas] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setFavoritos(getFavoritos());
    setMounted(true);
  }, []);

  const handleToggleFav = useCallback((id: string) => {
    setFavoritos(toggleFavorito(id));
  }, []);


  const estacionesFiltradas = useMemo(() => {
    if (!query.trim()) return ESTACIONES;
    const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const q = norm(query);
    return ESTACIONES.filter(e =>
      norm(e.nombre).includes(q) ||
      e.lineas.some(l => l.toLowerCase().includes(q)) ||
      norm(e.municipio ?? '').includes(q)
    );
  }, [query]);

  const favoritasData = useMemo(() =>
    favoritos.map(id => ESTACIONES.find(e => e.id === id)).filter(Boolean) as Estacion[],
  [favoritos]);

  const handleCercanas = () => {
    if (!navigator.geolocation) return;
    setLoadingCercanas(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const ordenadas = ESTACIONES
          .map(e => ({ estacion: e, distancia: haversineMetros(latitude, longitude, e.lat, e.lon) }))
          .sort((a, b) => a.distancia - b.distancia)
          .slice(0, 5);
        setCercanas(ordenadas);
        setLoadingCercanas(false);
      },
      () => setLoadingCercanas(false),
      { timeout: 8000 }
    );
  };

  if (!mounted) return null; // Previene hidratación de favoritos

  return (
    <>
      {estacionSeleccionada && (
        <EstacionDetalle
          estacion={estacionSeleccionada}
          onClose={() => setEstacionSeleccionada(null)}
        />
      )}

      <main className="mtp-stations-page">
        {/* Hero Header */}
        <div className="mtp-stations-hero">
          <div className="mtp-stations-hero__top">
            <div className="mtp-stations-hero__icon">
              <Train size={22} />
            </div>
            <div>
              <h1 className="mtp-stations-hero__title">Estaciones</h1>
              <p className="mtp-stations-hero__sub">Tiempos de llegada en tiempo real</p>
            </div>
            <div className={`mtp-connection-badge ${conectado ? 'mtp-connected' : 'mtp-disconnected'}`} style={{ marginLeft: 'auto' }}>
              <span className="mtp-connection-dot" />
              {conectado ? 'En vivo' : 'Offline'}
            </div>
          </div>

          {/* Buscador */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#111111' }} />
            <input
              className="mtp-stations-search"
              placeholder="Busca tu estación..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button
                aria-label="Limpiar búsqueda"
                onClick={() => setQuery('')}
                style={{ position: 'absolute', right: '0.55rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', display: 'flex', padding: '0.25rem' }}
              >
                <X size={16} color="#111111" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {!query && (
          <div className="mtp-stations-tabs">
            {[
              { key: 'buscar', label: 'Estaciones' },
              { key: 'lineas', label: 'Por Línea' },
            ].map(tab => (
              <button
                key={tab.key}
                className={`mtp-stations-tab${activeTab === tab.key ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.key as 'buscar' | 'lineas')}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Contenido scrollable */}
        <div className="mtp-stations-content">

          {/* Resultados búsqueda */}
          {query && (
            <>
              <div className="mtp-section-label">
                {estacionesFiltradas.length} resultado{estacionesFiltradas.length !== 1 ? 's' : ''}
              </div>
              {estacionesFiltradas.length === 0 ? (
                <div className="mtp-empty-box">
                  <Search size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <div>Sin resultados</div>
                </div>
              ) : (
                estacionesFiltradas.map(e => (
                  <EstacionCard key={e.id} estacion={e} favoritos={favoritos} onSelect={setEstacionSeleccionada} onToggleFav={handleToggleFav} />
                ))
              )}
            </>
          )}

          {/* Tab: Estaciones */}
          {!query && activeTab === 'buscar' && (
            <>
              {/* Estaciones Cercanas */}
              <div style={{ marginBottom: '1.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <span className="mtp-section-label" style={{ marginBottom: 0 }}>Cercanas a ti</span>
                  <button
                    className="mtp-line-btn"
                    onClick={handleCercanas}
                  >
                    {loadingCercanas ? '...' : <><Locate size={12} /> Localizar</>}
                  </button>
                </div>
                {cercanas.length > 0 ? (
                  cercanas.map(({ estacion, distancia }) => (
                    <div key={estacion.id} onClick={() => setEstacionSeleccionada(estacion)} style={{ cursor: 'pointer' }}>
                      <EstacionCard estacion={estacion} favoritos={favoritos} onSelect={setEstacionSeleccionada} onToggleFav={handleToggleFav} />
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '-0.25rem', marginBottom: '0.35rem', paddingLeft: '0.9rem' }}>
                        {distancia < 1000 ? `${Math.round(distancia)}m de ti` : `${(distancia/1000).toFixed(1)}km de ti`}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="mtp-empty-box">
                    Pulsa "Localizar" para ver las estaciones más cercanas
                  </div>
                )}
              </div>

              {/* Favoritos */}
              {favoritasData.length > 0 && (
                <div style={{ marginBottom: '1.4rem' }}>
                  <div className="mtp-section-label">
                    Mis Favoritos
                  </div>
                  {favoritasData.map(e => (
                    <EstacionCard key={e.id} estacion={e} favoritos={favoritos} onSelect={setEstacionSeleccionada} onToggleFav={handleToggleFav} />
                  ))}
                </div>
              )}

              {/* Todas las estaciones */}
              <div className="mtp-section-label">
                Todas las estaciones
              </div>
              {ESTACIONES.map(e => (
                <EstacionCard key={e.id} estacion={e} favoritos={favoritos} onSelect={setEstacionSeleccionada} onToggleFav={handleToggleFav} />
              ))}
            </>
          )}

          {/* Tab: Por Línea */}
          {!query && activeTab === 'lineas' && (
            <>
              <div className="mtp-section-label" style={{ marginBottom: '0.75rem' }}>
                Selecciona una línea para ver sus paradas
              </div>
              {LINEAS_CERCANIAS.map(linea => (
                <LineaAcordeon
                  key={linea.id}
                  linea={linea}
                  favoritos={favoritos}
                  onSelect={setEstacionSeleccionada}
                  onToggleFav={handleToggleFav}
                />
              ))}
            </>
          )}
        </div>
      </main>
    </>
  );
}
