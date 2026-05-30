'use client';

import { VehicleData } from '@/types/transit';
import { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

// Colores oficiales de las líneas Cercanías Madrid
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
};

type SortKey = 'vehicleId' | 'lineId' | 'speedKmh' | 'vehicleStatus' | 'delaySeconds' | 'occupancyPct';
type SortDir = 'asc' | 'desc';

interface TrainDataGridProps {
  vehiculos: VehicleData[];
  lineFilter?: string;
}

export default function TrainDataGrid({ vehiculos, lineFilter }: TrainDataGridProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lineId');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const filtered = useMemo(() => {
    let list = vehiculos;
    if (lineFilter && lineFilter !== 'ALL') list = list.filter(v => v.lineId === lineFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(v =>
        v.vehicleId.toLowerCase().includes(q) ||
        v.lineId.toLowerCase().includes(q) ||
        (v.vehicleStatus || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [vehiculos, lineFilter, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp size={10} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />;
  };

  const statusLabel = (s: string) => ({
    EN_RUTA: { label: 'En ruta', cls: 'status-badge--en_ruta' },
    EN_PARADA: { label: 'En parada', cls: 'status-badge--en_parada' },
    FUERA_DE_SERVICIO: { label: 'Fuera sv.', cls: 'status-badge--fuera' },
    DESCONOCIDO: { label: 'Desconocido', cls: 'status-badge--fuera' },
  }[s] || { label: s, cls: 'status-badge--fuera' });

  return (
    <div className="train-grid">
      <div className="train-grid__header">
        <div className="train-grid__title">
          🚆 Trenes activos
          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 400 }}>
            — {filtered.length} de {vehiculos.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={12} color="#94a3b8" style={{ position: 'absolute', marginLeft: '8px', pointerEvents: 'none' }} />
          <input
            className="train-grid__search"
            style={{ paddingLeft: '1.6rem' }}
            placeholder="Buscar tren, línea..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '340px', overflowY: 'auto' }}>
        <table className="train-grid" style={{ border: 'none', boxShadow: 'none' }}>
          <thead>
            <tr>
              <th onClick={() => handleSort('vehicleId')}>ID Tren <SortIcon k="vehicleId" /></th>
              <th onClick={() => handleSort('lineId')}>Línea <SortIcon k="lineId" /></th>
              <th onClick={() => handleSort('vehicleStatus')}>Estado <SortIcon k="vehicleStatus" /></th>
              <th onClick={() => handleSort('delaySeconds')}>Retraso <SortIcon k="delaySeconds" /></th>
              <th>Coordenadas</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(v => {
              const lc = LINE_COLORS[v.lineId] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
              const st = statusLabel(v.vehicleStatus);
              const hasAlert = v.tieneAlerta;
              return (
                <tr key={v.vehicleId}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: hasAlert ? '#dc2626' : '#0f172a' }}>
                    {hasAlert && '⚠ '}{v.vehicleId}
                  </td>
                  <td>
                    <span className="line-badge" style={{ background: lc.bg, color: lc.text, borderColor: lc.border }}>
                      {v.lineId}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${st.cls}`}>{st.label}</span>
                  </td>
                  <td style={{ color: (v.delaySeconds || 0) > 60 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                    {v.delaySeconds ? `+${Math.floor(v.delaySeconds / 60)}m` : '✓ A tiempo'}
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: '#94a3b8' }}>
                    {v.latitude && v.longitude ? `${v.latitude.toFixed(4)}, ${v.longitude.toFixed(4)}` : '—'}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Página {page} de {totalPages}</span>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button className="mtp-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
            <button className="mtp-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
          </div>
        </div>
      )}
    </div>
  );
}
