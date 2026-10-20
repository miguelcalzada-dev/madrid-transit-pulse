'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { LINE_COLORS, LINE_ORDER, getLineColor } from '@/data/lineColors';

interface GlobalFiltersProps {
  activeFilter: string;
  onFilterChange: (lineId: string) => void;
  trainsPerLine: Record<string, number>;
  alertsPerLine: Record<string, number>;
}

export default function GlobalFilters({ activeFilter, onFilterChange, trainsPerLine, alertsPerLine }: GlobalFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const availableLines = LINE_ORDER.filter(l => (trainsPerLine[l] ?? 0) > 0);

  const totalTrains = Object.values(trainsPerLine).reduce((a, b) => a + b, 0);

  const renderChips = (isMobileGrid: boolean = false) => {
    return (
      <>
        <button
          className={`filter-chip ${activeFilter === 'ALL' ? 'filter-chip--active' : ''}`}
          onClick={() => { onFilterChange('ALL'); setIsOpen(false); }}
          style={isMobileGrid ? { gridColumn: '1 / -1' } : {}}
        >
          Todas
          <span className="chip-count">
            {totalTrains}
          </span>
        </button>

        {availableLines.map(lineId => {
          const lc = getLineColor(lineId);
          const active = activeFilter === lineId;
          const trainCount = trainsPerLine[lineId] || 0;
          const alertCount = alertsPerLine[lineId] || 0;
          return (
            <button
              key={lineId}
              className={`filter-chip ${active ? 'filter-chip--active' : ''}`}
              style={!active ? {
                background: lc.bg,
                borderColor: lc.border,
                color: lc.text,
              } : {
                background: lc.text,
                borderColor: '#111111',
                color: '#fff',
                boxShadow: '3px 3px 0 #111111',
              }}
              onClick={() => { onFilterChange(lineId); setIsOpen(false); }}
            >
              {lineId}
              <span className="chip-count">
                {trainCount}
              </span>
              {alertCount > 0 && (
                <span style={{
                  background: '#ffffff',
                  color: '#e60000',
                  border: '1px solid currentColor',
                  padding: '0 0.28rem',
                  fontSize: '0.55rem',
                  fontWeight: 700,
                  marginLeft: '0.1rem',
                }}>
                  ⚠{alertCount}
                </span>
              )}
            </button>
          );
        })}
      </>
    );
  };

  return (
    <>
      {/* Desktop Version */}
      <div className="global-filters desktop-flex">
        <span className="global-filters__label">Filtrar por línea:</span>
        {renderChips(false)}
      </div>

      {/* Mobile Version - Floating Button */}
      <div className="mobile-only">
        <button className="mobile-filter-btn" onClick={() => setIsOpen(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} />
            <span>Filtro de Líneas</span>
          </div>
          <span style={{ color: 'var(--accent-primary)' }}>
            {activeFilter === 'ALL' ? 'Todas' : activeFilter}
          </span>
        </button>
      </div>

      {/* Mobile Bottom Sheet Overlay */}
      {isOpen && (
        <>
          <div className="mobile-filter-sheet-bg" onClick={() => setIsOpen(false)} />
          <div className="mobile-filter-sheet">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', textTransform: 'uppercase' }}>Seleccionar Línea</span>
              <button
                className="mtp-icon-btn"
                aria-label="Cerrar filtros"
                onClick={() => setIsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="mobile-filter-sheet-grid">
              {renderChips(true)}
            </div>
          </div>
        </>
      )}
    </>
  );
}
