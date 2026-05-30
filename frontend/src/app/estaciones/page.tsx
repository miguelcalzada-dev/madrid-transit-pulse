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
      padding: '0.1rem 0.45rem', borderRadius: '999px',
      background: lc.bg, color: lc.text, border: `1px solid ${lc.border}`,
      fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.02em', flexShrink: 0,
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
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.85rem 1rem', borderRadius: '12px',
      background: '#fff', border: '1px solid #e2e8f0',
      marginBottom: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <div style={{ textAlign: 'center', minWidth: '55px' }}>
        <div style={{ fontSize: displayFaltan === 0 ? '0.9rem' : '1.2rem', fontWeight: 800, color: displayFaltan === 0 ? '#16a34a' : (isDelayed ? '#dc2626' : '#16a34a'), lineHeight: 1 }}>
          {displayFaltan === 0 ? 'En andén' : displayFaltan > 59 ? realStr : `${displayFaltan} min`}
        </div>
        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, marginTop: '0.2rem' }}>
          {isDelayed ? (
            <>
              <span style={{ textDecoration: 'line-through', marginRight: '4px', opacity: 0.6 }}>{schedStr}</span>
              <span style={{ color: '#dc2626' }}>{realStr}</span>
            </>
          ) : (
            <span style={{ color: '#16a34a' }}>{schedStr}</span>
          )}
        </div>
      </div>
      <div style={{ width: '1px', height: '30px', background: '#e2e8f0', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <LineaBadge lineaId={horario.lineId} />
          <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>
            → {horario.destino}
          </span>
        </div>
        <div style={{ fontSize: '0.65rem', color: isDelayed ? '#dc2626' : '#64748b', marginTop: '0.2rem', fontWeight: isDelayed ? 600 : 400 }}>
          {isDelayed ? `Retraso de ${horario.retrasoMinutos} min` : 'En hora'}
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

  const [llegadasReales, setLlegadasReales] = useState<{ lineId: string, destino: string, sentido: string, scheduledTime: number, realTime: number, retrasoMinutos: number, estado: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLlegadas = useCallback(async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${API_URL}/estaciones/llegadas?lat=${estacion.lat}&lon=${estacion.lon}&lineas=${estacion.lineas.join(',')}`);
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
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: '#f8fafc', zIndex: 5000,
      display: 'flex', flexDirection: 'column',
      animation: 'slide-up 0.25s ease-out forwards',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #dc2626 0%, #1d4ed8 100%)',
        padding: '1.25rem 1rem 1rem',
        color: '#fff', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '10px', padding: '0.4rem', display: 'flex' }}>
              <MapPin size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.1 }}>{estacion.nombre}</div>
              {estacion.municipio && <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '0.1rem' }}>{estacion.municipio}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setFavoritos(toggleFavorito(estacion.id))}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Star size={18} color={esFavorita ? '#fbbf24' : '#fff'} fill={esFavorita ? '#fbbf24' : 'none'} />
            </button>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} color="#fff" />
            </button>
          </div>
        </div>
        {/* Líneas */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {estacion.lineas.map(l => (
            <span key={l} style={{
              padding: '0.2rem 0.6rem', borderRadius: '999px',
              background: 'rgba(255,255,255,0.25)', color: '#fff',
              fontSize: '0.75rem', fontWeight: 800, border: '1px solid rgba(255,255,255,0.4)',
            }}>{l}</span>
          ))}
        </div>
      </div>

      {/* Contenido scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>

        {llegadasReales.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.9rem' }}>
            No hay trenes acercándose en este momento.
          </div>
        )}

        {/* Flat list sin agrupar por sentido */}
        {llegadasReales.map((v, i) => (
          <HorarioProgramado key={i} horario={v} />
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
      onClick={() => onSelect(estacion)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.85rem 1rem', borderRadius: '12px',
        background: '#fff', border: '1px solid #e2e8f0', marginBottom: '0.5rem',
        cursor: 'pointer', transition: 'all 0.15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {estacion.nombre}
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {estacion.lineas.map(l => <LineaBadge key={l} lineaId={l} />)}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onToggleFav(estacion.id); }}
        style={{ background: 'none', border: 'none', padding: '0.25rem', flexShrink: 0 }}
      >
        <Star size={18} color={esFav ? '#f59e0b' : '#cbd5e1'} fill={esFav ? '#f59e0b' : 'none'} />
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
    <div style={{ marginBottom: '0.6rem', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${linea.color.border}` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.85rem 1rem', background: linea.color.bg, border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{
          padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 800, fontSize: '0.8rem',
          background: linea.color.text, color: '#fff', flexShrink: 0,
        }}>{linea.id}</span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{linea.extremoA}</div>
          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>→ {linea.extremoB} · {estaciones.length} paradas</div>
        </div>
        {open ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
      </button>
      {open && (
        <div style={{ background: '#fafafa', padding: '0.5rem' }}>
          {estaciones.map((est, idx) => (
            <div
              key={est.id}
              onClick={() => onSelect(est)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                background: 'transparent', transition: 'background 0.1s',
              }}
            >
              {/* Timeline line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0 }}>
                {idx > 0 && <div style={{ width: 2, height: 8, background: linea.color.border, marginBottom: 2 }} />}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: linea.color.text, border: `2px solid ${linea.color.bg}`, outline: `2px solid ${linea.color.text}` }} />
                {idx < estaciones.length - 1 && <div style={{ width: 2, height: 8, background: linea.color.border, marginTop: 2 }} />}
              </div>
              <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 500, color: '#0f172a' }}>{est.nombre}</span>
              <button
                onClick={e => { e.stopPropagation(); onToggleFav(est.id); }}
                style={{ background: 'none', border: 'none', padding: '0.1rem' }}
              >
                <Star size={14} color={favoritos.includes(est.id) ? '#f59e0b' : '#e2e8f0'} fill={favoritos.includes(est.id) ? '#f59e0b' : 'none'} />
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

      <main style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc', overflowY: 'auto' }}>
        {/* Hero Header */}
        <div style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #1d4ed8 100%)',
          padding: '1.5rem 1rem 1.25rem', color: '#fff', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '0.5rem', display: 'flex' }}>
              <Train size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, lineHeight: 1.1 }}>Estaciones</h1>
              <p style={{ fontSize: '0.7rem', opacity: 0.85, margin: 0, marginTop: '0.1rem' }}>Tiempos de llegada en tiempo real</p>
            </div>
            <div style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.25rem 0.6rem', borderRadius: '999px',
              background: conectado ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
              border: `1px solid ${conectado ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
              fontSize: '0.6rem', fontWeight: 700,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: conectado ? '#22c55e' : '#ef4444' }} />
              {conectado ? 'EN VIVO' : 'OFFLINE'}
            </div>
          </div>

          {/* Buscador */}
          <div style={{ position: 'relative' }}>
            <Search size={16} color="rgba(255,255,255,0.7)" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              className="estaciones-search"
              placeholder="Busca tu estación..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                borderRadius: '12px', border: 'none',
                background: 'rgba(255,255,255,0.2)', color: '#fff',
                fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none' }}>
                <X size={16} color="rgba(255,255,255,0.7)" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {!query && (
          <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
            {[
              { key: 'buscar', label: 'Estaciones' },
              { key: 'lineas', label: 'Por Línea' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'buscar' | 'lineas')}
                style={{
                  flex: 1, padding: '0.75rem', border: 'none', cursor: 'pointer', fontWeight: 700,
                  fontSize: '0.8rem', background: 'none',
                  color: activeTab === tab.key ? '#dc2626' : '#64748b',
                  borderBottom: `2px solid ${activeTab === tab.key ? '#dc2626' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Contenido scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>

          {/* Resultados búsqueda */}
          {query && (
            <>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.75rem', fontWeight: 600 }}>
                {estacionesFiltradas.length} resultado{estacionesFiltradas.length !== 1 ? 's' : ''}
              </div>
              {estacionesFiltradas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  <Search size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                  <div style={{ fontWeight: 600 }}>Sin resultados</div>
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
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cercanas a ti</span>
                  <button
                    onClick={handleCercanas}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.3rem 0.7rem', borderRadius: '999px',
                      background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                      fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {loadingCercanas ? '...' : <><Locate size={12} /> Localizar</>}
                  </button>
                </div>
                {cercanas.length > 0 ? (
                  cercanas.map(({ estacion, distancia }) => (
                    <div key={estacion.id} onClick={() => setEstacionSeleccionada(estacion)} style={{ cursor: 'pointer' }}>
                      <EstacionCard estacion={estacion} favoritos={favoritos} onSelect={setEstacionSeleccionada} onToggleFav={handleToggleFav} />
                      <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '-0.3rem', marginBottom: '0.3rem', paddingLeft: '1rem' }}>
                        {distancia < 1000 ? `${Math.round(distancia)}m de ti` : `${(distancia/1000).toFixed(1)}km de ti`}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '0.75rem 1rem', background: '#fff', borderRadius: '12px', border: '1px dashed #e2e8f0', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Pulsa "Localizar" para ver las estaciones más cercanas
                  </div>
                )}
              </div>

              {/* Favoritos */}
              {favoritasData.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
                    ⭐ Mis Favoritos
                  </div>
                  {favoritasData.map(e => (
                    <EstacionCard key={e.id} estacion={e} favoritos={favoritos} onSelect={setEstacionSeleccionada} onToggleFav={handleToggleFav} />
                  ))}
                </div>
              )}

              {/* Todas las estaciones */}
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
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
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
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
