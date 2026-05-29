'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VehicleData, TransitAlert } from '@/types/transit';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// Fix bug Leaflet/webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Colores oficiales por línea Cercanías Madrid
const LINE_COLORS: Record<string, { bg: string; text: string }> = {
  C1:  { bg: '#e8614c', text: '#fff' },
  C2:  { bg: '#4d9bd9', text: '#fff' },
  C3:  { bg: '#f39c27', text: '#fff' },
  C4:  { bg: '#6db33f', text: '#fff' },
  C5:  { bg: '#9b59b6', text: '#fff' },
  C7:  { bg: '#c0392b', text: '#fff' },
  C8:  { bg: '#1abc9c', text: '#fff' },
  C9:  { bg: '#7f8c8d', text: '#fff' },
  C10: { bg: '#2980b9', text: '#fff' },
};

const DEFAULT_LINE_COLOR = { bg: '#64748b', text: '#fff' };

/** Crea icono SVG con código de línea y color oficial */
const crearIconoLinea = (lineId: string, estaEnAlerta: boolean): L.DivIcon => {
  const lc = LINE_COLORS[lineId] || DEFAULT_LINE_COLOR;
  const bg = estaEnAlerta ? '#dc2626' : lc.bg;
  const pulse = estaEnAlerta
    ? `<span style="position:absolute;top:-4px;left:-4px;width:calc(100% + 8px);height:calc(100% + 8px);border-radius:50%;border:2px solid #dc2626;animation:pulse-ring 1.5s ease-out infinite;"></span>`
    : '';

  return L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${bg};
        border: 2px solid ${estaEnAlerta ? '#991b1b' : 'rgba(0,0,0,0.15)'};
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        font-size: ${lineId.length > 2 ? '8px' : '10px'};
        font-weight: 800;
        color: ${lc.text};
        letter-spacing: -0.5px;
        user-select: none;
      ">
        ${pulse}
        ${lineId}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  });
};

// Estaciones fijas de Cercanías Madrid
const ESTACIONES_RENFE = [
  { lat: 40.4143, lon: -3.7194, nombre: 'Príncipe Pío', lineas: 'C1, C10' },
  { lat: 40.4720, lon: -3.6795, nombre: 'Chamartín',    lineas: 'C1–C10' },
  { lat: 40.4058, lon: -3.6903, nombre: 'Atocha',        lineas: 'C1–C10' },
  { lat: 40.4530, lon: -3.6910, nombre: 'Nuevos Ministerios', lineas: 'C1, C4, C10' },
  { lat: 40.4168, lon: -3.7038, nombre: 'Sol',            lineas: 'C3, C4' },
  { lat: 40.4650, lon: -3.7200, nombre: 'Pozuelo',        lineas: 'C10' },
  { lat: 40.3225, lon: -3.8650, nombre: 'Móstoles',       lineas: 'C5, C7' },
  { lat: 40.5500, lon: -3.4000, nombre: 'Alcalá de Henares', lineas: 'C2, C7' },
];

// Actualiza cámara cuando cambia vehiculoFocal
const CamaraUpdater = ({ vehiculos, vehiculoFocal }: { vehiculos: VehicleData[]; vehiculoFocal: string | null | undefined }) => {
  const map = useMap();
  useEffect(() => {
    if (!vehiculoFocal) return;
    const v = vehiculos.find(v => v.vehicleId === vehiculoFocal);
    if (v?.latitude && v?.longitude) {
      map.flyTo([v.latitude, v.longitude], 15, { animate: true, duration: 1.5 });
    }
  }, [vehiculoFocal, vehiculos, map]);
  return null;
};

interface LiveMapProps {
  vehiculos: VehicleData[];
  alertas: TransitAlert[];
  vehiculoFocal?: string | null;
}

const LINE_ORDER = ['C1', 'C2', 'C3', 'C4', 'C5', 'C7', 'C8', 'C9', 'C10'];

export default function LiveMap({ vehiculos, alertas, vehiculoFocal }: LiveMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [mostrarEstaciones, setMostrarEstaciones] = useState(false);
  const [mostrarAlertas, setMostrarAlertas] = useState(true);
  const [lineasVisibles, setLineasVisibles] = useState<Set<string>>(new Set(LINE_ORDER));
  const [panelFiltrosAbierto, setPanelFiltrosAbierto] = useState(false);

  const vehiculosEnAlerta = useMemo(() => new Set(alertas.map(a => a.vehicleId)), [alertas]);

  const vehiculosFiltrados = useMemo(() => vehiculos.filter(v =>
    v.latitude != null && v.longitude != null &&
    Math.abs(v.latitude!) < 90 && Math.abs(v.longitude!) < 180 &&
    lineasVisibles.has(v.lineId)
  ), [vehiculos, lineasVisibles]);

  // Stats por línea para el panel
  const statsPorLinea = useMemo(() => {
    const m: Record<string, number> = {};
    vehiculos.forEach(v => { m[v.lineId] = (m[v.lineId] || 0) + 1; });
    return m;
  }, [vehiculos]);

  const toggleLinea = (lineId: string) => {
    setLineasVisibles(prev => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  };

  const allVisible = LINE_ORDER.every(l => lineasVisibles.has(l));

  return (
    <div className="mtp-map-wrapper">
      <MapContainer
        center={[40.4168, -3.7038]}
        zoom={11}
        className="mtp-leaflet-map"
        scrollWheelZoom={true}
        zoomControl={true}
      >
        {/* CartoDB Positron — light, limpio, preciso */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
          subdomains="abcd"
        />

        <CamaraUpdater vehiculos={vehiculosFiltrados} vehiculoFocal={vehiculoFocal} />

        {/* Marcadores de vehículos con icono por línea */}
        {vehiculosFiltrados.map(vehiculo => {
          const tieneAlerta = vehiculosEnAlerta.has(vehiculo.vehicleId) || vehiculo.tieneAlerta;
          const icono = crearIconoLinea(vehiculo.lineId, tieneAlerta);
          const lc = LINE_COLORS[vehiculo.lineId] || DEFAULT_LINE_COLOR;

          return (
            <Marker
              key={vehiculo.vehicleId}
              position={[vehiculo.latitude!, vehiculo.longitude!]}
              icon={icono}
            >
              <Popup className="mtp-popup" minWidth={220}>
                <div className="mtp-popup-content">
                  <div className="mtp-popup-header">
                    <span className="mtp-popup-source-badge">🚆 Cercanías</span>
                    <span className="mtp-popup-line"
                      style={{ background: lc.bg, color: lc.text, padding: '0.12rem 0.45rem', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700 }}>
                      {vehiculo.lineId}
                    </span>
                  </div>

                  {vehiculo.lineName && (
                    <p className="mtp-popup-linename">{vehiculo.lineName}</p>
                  )}

                  <p className="mtp-popup-vehicleid">
                    <span>ID:</span> {vehiculo.vehicleId}
                  </p>

                  <div className="mtp-popup-status-row">
                    <span className="mtp-popup-status" style={{
                      background: tieneAlerta ? '#dc2626' :
                        vehiculo.vehicleStatus === 'EN_RUTA' ? '#16a34a' :
                        vehiculo.vehicleStatus === 'EN_PARADA' ? '#d97706' : '#94a3b8',
                    }}>
                      {vehiculo.vehicleStatus?.replace(/_/g, ' ') || 'DESCONOCIDO'}
                    </span>
                    {tieneAlerta && <span className="mtp-popup-alert-badge">⚠️ ALERTA</span>}
                  </div>

                  <div className="mtp-popup-metrics">
                    <div>
                      <span>🏎️</span>
                      <span>{vehiculo.speedKmh?.toFixed(0) ?? '—'} km/h</span>
                    </div>
                    <div>
                      <span>👥</span>
                      <span>{vehiculo.occupancyPct != null ? `${vehiculo.occupancyPct}% ocupación` : '— ocupación'}</span>
                    </div>
                    {vehiculo.delaySeconds != null && (
                      <div>
                        <span>⏱️</span>
                        <span style={{ color: vehiculo.delaySeconds > 120 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                          {vehiculo.delaySeconds > 0
                            ? `+${Math.floor(vehiculo.delaySeconds / 60)}m ${vehiculo.delaySeconds % 60}s retraso`
                            : '✓ A tiempo'}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="mtp-popup-lastseen">
                    Visto {formatDistanceToNow(new Date(vehiculo.lastSeenAt), { addSuffix: true, locale: es })}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Zonas de alerta (círculos rojos semi-transparentes) */}
        {mostrarAlertas && alertas
          .filter(a => a.latitude && a.longitude && lineasVisibles.has(a.lineId))
          .slice(0, 20)
          .map(alerta => (
            <Circle
              key={`az-${alerta._id}`}
              center={[alerta.latitude!, alerta.longitude!]}
              radius={350}
              pathOptions={{
                color: alerta.severity === 'ALTA' ? '#dc2626' : '#d97706',
                fillColor: alerta.severity === 'ALTA' ? '#dc2626' : '#d97706',
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: '4 4',
              }}
            />
          ))}

        {/* Estaciones fijas */}
        {mostrarEstaciones && ESTACIONES_RENFE.map((est, idx) => (
          <CircleMarker
            key={`est-${idx}`}
            center={[est.lat, est.lon]}
            radius={6}
            pathOptions={{
              color: '#dc2626',
              fillColor: '#fff',
              fillOpacity: 1,
              weight: 2.5,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div style={{ fontWeight: 700, fontSize: '0.7rem', color: '#0f172a' }}>{est.nombre}</div>
              <div style={{ fontSize: '0.6rem', color: '#64748b' }}>{est.lineas}</div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Panel de control de líneas */}
      <div className="mtp-map-lines-panel" style={{
        position: 'absolute', top: '1rem', left: '1rem', zIndex: 1000,
        background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '0.75rem',
        minWidth: 160, maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto',
      }}>
        {/* Mobile Toggle Button */}
        <button 
          className="mobile-only"
          onClick={() => setPanelFiltrosAbierto(!panelFiltrosAbierto)}
          style={{ width: '100%', padding: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', color: '#0f172a' }}
        >
          {panelFiltrosAbierto ? 'Ocultar Filtros' : 'Filtros del Mapa'}
        </button>

        <div className={panelFiltrosAbierto ? '' : 'desktop-only'} style={{ marginTop: panelFiltrosAbierto ? '0.75rem' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Líneas visibles
            </span>
            <button
              onClick={() => setLineasVisibles(allVisible ? new Set() : new Set(LINE_ORDER))}
              style={{ fontSize: '0.58rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              {allVisible ? 'Ocultar todo' : 'Mostrar todo'}
            </button>
          </div>

          {LINE_ORDER.map(lineId => {
            const lc = LINE_COLORS[lineId] || DEFAULT_LINE_COLOR;
            const visible = lineasVisibles.has(lineId);
            const count = statsPorLinea[lineId] || 0;
            return (
              <div
                key={lineId}
                onClick={() => toggleLinea(lineId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.3rem 0.4rem', borderRadius: 6, cursor: 'pointer',
                  marginBottom: '0.15rem',
                  background: visible ? `${lc.bg}` : '#f8fafc',
                  border: `1px solid ${visible ? lc.bg : '#f1f5f9'}`,
                  opacity: count === 0 ? 0.4 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: visible ? lc.bg : '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.52rem', fontWeight: 800, color: visible ? lc.text : '#94a3b8',
                  flexShrink: 0,
                }}>
                  {lineId.replace('C', '')}
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: visible ? '#0f172a' : '#94a3b8' }}>
                  {lineId}
                </span>
                {count > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.58rem', color: '#64748b', background: '#f1f5f9', borderRadius: '999px', padding: '0 0.3rem' }}>
                    {count}
                  </span>
                )}
              </div>
            );
          })}

          <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.65rem', color: '#475569' }}>
              <input type="checkbox" checked={mostrarEstaciones} onChange={e => setMostrarEstaciones(e.target.checked)} style={{ accentColor: '#dc2626' }} />
              Estaciones
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.65rem', color: '#475569', marginTop: '0.3rem' }}>
              <input type="checkbox" checked={mostrarAlertas} onChange={e => setMostrarAlertas(e.target.checked)} style={{ accentColor: '#d97706' }} />
              Zonas de alerta
            </label>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="mtp-map-legend">
        <h4>Leyenda</h4>
        {[
          { label: 'En ruta',    color: '#16a34a' },
          { label: 'En parada',  color: '#d97706' },
          { label: 'Con alerta', color: '#dc2626' },
          { label: 'Sin servicio', color: '#94a3b8' },
        ].map(({ label, color }) => (
          <div key={label} className="mtp-legend-item">
            <span className="mtp-legend-dot" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
        <div className="mtp-legend-item" style={{ marginTop: '0.3rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.3rem' }}>
          <div style={{ width: 9, height: 9, border: '2px solid #dc2626', background: '#fff', borderRadius: '50%', flexShrink: 0 }} />
          <span>Estación</span>
        </div>
      </div>

      {/* Contador */}
      <div className="mtp-map-counter">
        🚆 {vehiculosFiltrados.length} trenes visibles
        {vehiculosFiltrados.length !== vehiculos.length && ` (de ${vehiculos.length})`}
      </div>
    </div>
  );
}
